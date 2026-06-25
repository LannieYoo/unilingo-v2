"""
browser_fetch.py — Playwright HTML fallback for sites that block httpx.

Some government sites (yukon.ca, gov.nu.ca, ...) sit behind Cloudflare/Akamai
bot protection: httpx gets 403, and even headless Chromium hits an interactive
"verify you are human" checkbox. When the httpx path gets a 403, the crawler
falls back to a **real, headed browser with a persistent profile**:

  - One visible window, ONE reused tab → pages open strictly one-by-one.
  - Persistent user-data-dir → once you solve the Cloudflare checkbox ONCE,
    the cf_clearance cookie is saved to disk and reused for every later page
    and every future run (no more prompts).
  - On a challenge, the crawler prints a prompt and waits (up to 2 min) for you
    to click the checkbox; after it clears, crawling continues automatically.

If Playwright isn't installed, fetch_html() returns None and the caller skips
the page — no hard dependency for sites that don't need it.
"""
import asyncio
from pathlib import Path

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
_PROFILE_DIR = Path(__file__).resolve().parent / ".browser-profile"
_NAV_TIMEOUT_MS = 45000
_NETWORK_IDLE_MS = 8000
_CHALLENGE_TIMEOUT_MS = 120000  # allow time to click the human-verification checkbox
_MAX_CONCURRENCY = 1  # one tab at a time — concurrent automated tabs trip bot checks harder
_HEADLESS = False  # headed browser + manual checkbox passes interactive Cloudflare challenges
_CHALLENGE_MARKERS = ("just a moment", "请稍候", "checking your browser", "attention required",
                      "安全验证", "请验证")

_pw = None
_context = None
_page = None
_launch_lock = asyncio.Lock()
_sem = asyncio.Semaphore(_MAX_CONCURRENCY)
_unavailable = False  # set True if Playwright import/launch fails (warn once)


async def _ensure_page():
    """Launch (once) a persistent headed context + single reused tab, or None."""
    global _pw, _context, _page, _unavailable
    if _unavailable:
        return None
    if _page is not None:
        return _page
    async with _launch_lock:
        if _page is not None:
            return _page
        try:
            from playwright.async_api import async_playwright
            _pw = await async_playwright().start()
            # Persistent context: cookies (incl. cf_clearance) survive across runs.
            _context = await _pw.chromium.launch_persistent_context(
                str(_PROFILE_DIR),
                headless=_HEADLESS,
                args=["--disable-blink-features=AutomationControlled"],
                user_agent=_USER_AGENT,
                viewport={"width": 1440, "height": 900},
                locale="en-CA",
                extra_http_headers={"Accept-Language": "en-CA,en;q=0.9"},
            )
            # Hide the navigator.webdriver automation flag (Cloudflare/Akamai check it)
            await _context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            )
            _page = _context.pages[0] if _context.pages else await _context.new_page()
            return _page
        except Exception as e:
            _unavailable = True
            print(f"   [browser-fallback] unavailable ({type(e).__name__}: {e}); "
                  f"403 pages will be skipped. Install: uv sync --extra publish && uv run playwright install chromium")
            return None


async def _is_challenge(page) -> bool:
    try:
        return any(m in (await page.title()).lower() for m in _CHALLENGE_MARKERS)
    except Exception:
        return False


async def fetch_html(url: str) -> str | None:
    """Fetch a page's rendered HTML via the persistent headed browser (one tab, serial)."""
    page = await _ensure_page()
    if page is None:
        return None
    async with _sem:  # one navigation at a time
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=_NAV_TIMEOUT_MS)
            try:
                await page.wait_for_load_state("networkidle", timeout=_NETWORK_IDLE_MS)
            except Exception:
                pass  # best-effort
            # Interactive / JS bot challenge → prompt the user, wait for it to clear.
            if await _is_challenge(page):
                print(f"   [browser] ⏳ Cloudflare 人机验证：请在浏览器窗口点一下『请验证您是真人』"
                      f"（最多等 {_CHALLENGE_TIMEOUT_MS // 1000}s，解过一次后续免验证）\n      {url}")
                cond = " && ".join(
                    f"!document.title.toLowerCase().includes('{m}')" for m in _CHALLENGE_MARKERS
                )
                try:
                    await page.wait_for_function(f"() => {cond}", timeout=_CHALLENGE_TIMEOUT_MS)
                    await page.wait_for_load_state("networkidle", timeout=_NETWORK_IDLE_MS)
                    print("   [browser] ✅ 验证通过，继续")
                except Exception:
                    print("   [browser] ⚠️ 验证未在超时内完成，跳过该页")
                    return None
            return await page.content()
        except Exception:
            return None


async def close():
    """Tear down the persistent context (cookies are already saved to the profile dir)."""
    global _pw, _context, _page, _unavailable
    try:
        if _context is not None:
            await _context.close()
        if _pw is not None:
            await _pw.stop()
    finally:
        _pw = _context = _page = None
        _unavailable = False
