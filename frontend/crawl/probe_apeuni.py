import asyncio
import json
import io
import os
import sys
from pathlib import Path


PROFILE_DIR = Path(__file__).resolve().parent / ".browser-profile"
URL = sys.argv[1] if len(sys.argv) > 1 else "https://www.apeuni.com/practice/read_alouds?locale=en"

if os.name == "nt":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


async def main():
    try:
        from playwright.async_api import async_playwright
    except Exception as exc:
        print(f"PLAYWRIGHT_IMPORT_ERROR: {type(exc).__name__}: {exc}")
        return

    requests = []
    responses = []

    async with async_playwright() as pw:
        context = await pw.chromium.launch_persistent_context(
            str(PROFILE_DIR),
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1440, "height": 900},
            locale="en-CA",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
        )
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        page = context.pages[0] if context.pages else await context.new_page()

        def handle_request(req):
            url = req.url
            if "apeuni.com" in url or "cloudfront.net" in url:
                requests.append({
                    "method": req.method,
                    "resourceType": req.resource_type,
                    "url": url,
                })

        async def handle_response(res):
            url = res.url
            if "apeuni.com/api/" not in url:
                return
            try:
                body = await res.text()
            except Exception as exc:
                body = f"<<response read failed: {type(exc).__name__}: {exc}>>"
            responses.append({
                "status": res.status,
                "url": url,
                "body": body[:12000],
            })

        page.on("request", handle_request)
        page.on("response", lambda res: asyncio.create_task(handle_response(res)))

        await page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        try:
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass

        title = await page.title()
        html = await page.content()
        text = await page.locator("body").inner_text(timeout=10000)
        cookies = await context.cookies()
        local_storage = await page.evaluate(
            """() => Object.fromEntries(
                Array.from({ length: localStorage.length }, (_, i) => {
                  const key = localStorage.key(i);
                  return [key, localStorage.getItem(key)];
                })
            )"""
        )

        print("TITLE:", title)
        print("HAS_LOGIN_HINT:", "login" if "login" in text.lower() else "no-login-word")
        print("BODY_SNIPPET:", text[:2000].replace("\n", " "))
        print("COOKIE_COUNT:", len(cookies))
        print("APEUNI_COOKIES:", json.dumps([c for c in cookies if "apeuni.com" in c.get("domain", "")], ensure_ascii=False, indent=2)[:5000])
        print("LOCAL_STORAGE_KEYS:", sorted(local_storage.keys())[:100])
        print("REQUESTS:")
        seen = set()
        for req in requests:
            key = (req["method"], req["resourceType"], req["url"])
            if key in seen:
                continue
            seen.add(key)
            print(json.dumps(req, ensure_ascii=False))
        print("API_RESPONSES:")
        seen_responses = set()
        for res in responses:
            key = (res["status"], res["url"])
            if key in seen_responses:
                continue
            seen_responses.add(key)
            print(json.dumps(res, ensure_ascii=False))
        print("HTML_SNIPPET:", html[:4000])

        await context.close()


if __name__ == "__main__":
    asyncio.run(main())
