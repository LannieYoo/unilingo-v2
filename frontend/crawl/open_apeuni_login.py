import asyncio
import io
import os
import sys
from pathlib import Path

if os.name == "nt":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

PRIMARY_PROFILE_DIR = Path(__file__).resolve().parent / ".browser-profile-apeuni"
FALLBACK_PROFILE_DIR = Path(__file__).resolve().parent / ".browser-profile"
URLS = [
    "https://www.apeuni.com/practice/read_alouds?locale=en",
    "https://www.apeuni.com/practice/repeat_sentence?locale=en",
]


async def launch_context(pw, profile_dir: Path):
    return await pw.chromium.launch_persistent_context(
        str(profile_dir),
        headless=False,
        args=["--disable-blink-features=AutomationControlled"],
        viewport={"width": 1440, "height": 960},
        locale="en-CA",
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        ),
    )


async def main():
    from playwright.async_api import async_playwright

    print("Opening APEUni login browser...")
    print("Please log in inside the opened browser window.")
    print("Keep this terminal running while the browser stays open.")

    async with async_playwright() as pw:
        chosen_profile = PRIMARY_PROFILE_DIR
        try:
            print(f"Trying primary profile: {PRIMARY_PROFILE_DIR}")
            context = await launch_context(pw, PRIMARY_PROFILE_DIR)
        except Exception as primary_error:
            print(f"Primary profile failed: {type(primary_error).__name__}: {primary_error}")
            print(f"Falling back to shared profile: {FALLBACK_PROFILE_DIR}")
            chosen_profile = FALLBACK_PROFILE_DIR
            context = await launch_context(pw, FALLBACK_PROFILE_DIR)

        print(f"Opened with profile: {chosen_profile}")
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto(URLS[0], wait_until="domcontentloaded", timeout=60000)

        rs_page = await context.new_page()
        await rs_page.goto(URLS[1], wait_until="domcontentloaded", timeout=60000)

        print("Browser opened with Read Aloud and Repeat Sentence pages.")
        print("After you finish logging in, tell me '로그인 됐어' and I will continue the scrape.")

        try:
            await asyncio.Future()
        finally:
            await context.close()


if __name__ == "__main__":
    asyncio.run(main())
