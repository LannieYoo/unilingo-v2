"""
Markdown Downloader — 直接 HTML → Markdown，跳过 PDF.

Reads the manifest.json produced by bfs_crawler.py, fetches each page,
extracts the main content area, and converts to clean Markdown.

100x faster than PDF → MinerU pipeline, with better quality.

Usage:
  uv run python scripts/crawl/download_md.py <manifest_path> [--delay 0.2] [--max N]
  uv run python scripts/crawl/download_md.py docs/pytorch/manifest.json
  uv run python scripts/crawl/download_md.py docs/pytorch/manifest.json --max 10

Output:
  docs/<slug>/md/<relative_path>.md   — clean Markdown files

Profile CSS directives (in profiles/<slug>.css):
  /* @md-content-selector: .bd-article */    — CSS selector for main content area
  /* @md-remove: .headerlink,.viewcode-link */  — extra selectors to remove
  /* @md-direct: .md */                       — append suffix for direct MD download
  /* @md-converter: payload */                — site-specific converter name
"""
import argparse
import asyncio
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import httpx

import browser_fetch
from converters import get_converter

# ── Config ──
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "docs"


def _log(msg: str, log_file: Path | None = None):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    if log_file:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(line + "\n")


def url_to_filepath(url: str, seed_url: str) -> str:
    """Convert a URL to a relative file path for saving."""
    seed_parsed = urlparse(seed_url)
    url_parsed = urlparse(url)

    seed_path = seed_parsed.path.rstrip("/")
    url_path = url_parsed.path

    if url_path.startswith(seed_path):
        rel_path = url_path[len(seed_path):].lstrip("/")
    else:
        rel_path = url_path.lstrip("/")

    if not rel_path or rel_path.endswith("/"):
        rel_path = rel_path.rstrip("/") + "/index" if rel_path else "index"
    else:
        rel_path = re.sub(r"\.(html?|php|asp)$", "", rel_path, flags=re.IGNORECASE)

    rel_path = re.sub(r'[<>:"|?*]', "_", rel_path)
    return rel_path + ".md"


def _load_profile(slug: str) -> dict:
    """Load profile directives from CSS file."""
    profiles_dir = Path(__file__).resolve().parent / "profiles"
    css_path = profiles_dir / f"{slug}.css"

    profile = {
        "content_selector": None,
        "remove_selectors": [],
        "css_file": None,
        "direct_suffix": None,   # e.g. ".md" — append to URL for raw markdown
        "converter": None,       # e.g. "payload" — site-specific converter name
    }

    if not css_path.exists():
        return profile

    profile["css_file"] = css_path.name
    css_text = css_path.read_text(encoding="utf-8")

    # Parse @md-content-selector directive
    m = re.search(r'/\*\s*@md-content-selector:\s*(.+?)\s*\*/', css_text)
    if m:
        profile["content_selector"] = m.group(1).strip()

    # Parse @md-remove directive
    m = re.search(r'/\*\s*@md-remove:\s*(.+?)\s*\*/', css_text)
    if m:
        profile["remove_selectors"] = [s.strip() for s in m.group(1).split(",")]

    # Parse @md-direct directive (e.g. /* @md-direct: .md */)
    m = re.search(r'/\*\s*@md-direct:\s*(.+?)\s*\*/', css_text)
    if m:
        profile["direct_suffix"] = m.group(1).strip()

    # Parse @md-converter directive (e.g. /* @md-converter: payload */)
    m = re.search(r'/\*\s*@md-converter:\s*(.+?)\s*\*/', css_text)
    if m:
        profile["converter"] = m.group(1).strip()

    return profile


async def download_pages_as_md(
    manifest_path: Path,
    delay: float = 0.2,
    max_pages: int | None = None,
    concurrency: int = 10,
    force: bool = False,
    log_file: Path | None = None,
) -> dict:
    """Download all pages from a manifest as Markdown.

    Returns summary dict with counts.
    """
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    slug = manifest["slug"]
    seed_url = manifest["seed_url"]
    pages = manifest["pages"]

    md_dir = DATA_DIR / slug / "md"
    md_dir.mkdir(parents=True, exist_ok=True)

    if max_pages:
        pages = pages[:max_pages]

    # Load profile
    profile = _load_profile(slug)

    # Get converter
    converter = get_converter(profile.get("converter"))
    converter_name = profile.get("converter") or "default"

    mode = "direct" if profile.get("direct_suffix") else "HTML -> MD"
    _log(f"Downloading {len(pages)} pages as Markdown ({mode})", log_file)
    _log(f"  Output: {md_dir}", log_file)
    _log(f"  Concurrency: {concurrency}, Delay: {delay}s", log_file)
    _log(f"  Converter: {converter_name}", log_file)
    if profile["css_file"]:
        _log(f"  Profile: {profile['css_file']}", log_file)
        if profile.get("direct_suffix"):
            _log(f"  Direct suffix: {profile['direct_suffix']}", log_file)
        if profile["content_selector"]:
            _log(f"  Content selector: {profile['content_selector']}", log_file)
    else:
        _log(f"  Profile: (none -- using defaults)", log_file)

    saved = 0
    skipped = 0
    failed = 0

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml",
    }

    sem = asyncio.Semaphore(concurrency)

    async def _process_one(client: httpx.AsyncClient, entry: dict, idx: int):
        nonlocal saved, skipped, failed

        url = entry["url"]
        rel_path = url_to_filepath(url, seed_url)
        out_path = md_dir / rel_path

        # Skip if already exists
        if not force and out_path.exists() and out_path.stat().st_size > 100:
            skipped += 1
            return

        async with sem:
            try:
                md_text = None

                # Try direct .md download if configured
                if profile.get("direct_suffix"):
                    direct_url = url.rstrip("/") + profile["direct_suffix"]
                    try:
                        resp = await client.get(direct_url, follow_redirects=True, timeout=30.0)
                        if resp.status_code == 200:
                            ct = resp.headers.get("content-type", "")
                            if "markdown" in ct or "text/plain" in ct:
                                text = resp.text
                                # Skip soft-404 pages
                                if "Page Not Found" not in text[:200] and "does not exist" not in text[:200]:
                                    md_text = text
                    except Exception:
                        pass  # fall back to HTML→MD

                # Fallback: fetch HTML and convert
                if not md_text:
                    resp = await client.get(url, follow_redirects=True, timeout=30.0)
                    if resp.status_code == 403:
                        # httpx blocked by bot protection → try a real browser
                        html = await browser_fetch.fetch_html(url)
                        if not html:
                            failed += 1
                            return
                    else:
                        resp.raise_for_status()
                        content_type = resp.headers.get("content-type", "")
                        if "text/html" not in content_type:
                            failed += 1
                            return
                        html = resp.text

                    md_text, _ = converter.convert(html, url, profile)

                # Skip empty/trivial pages
                if len(md_text.strip()) < 50:
                    _log(f"  [SKIP] {rel_path} (empty/trivial)", log_file)
                    skipped += 1
                    return

                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_text(md_text, encoding="utf-8")

                size_kb = out_path.stat().st_size / 1024
                saved += 1

                if saved <= 20 or saved % 100 == 0:
                    _log(
                        f"  [{idx:4d}/{len(pages)}] {rel_path} ({size_kb:.1f} KB)",
                        log_file,
                    )

                # Polite delay
                if delay > 0:
                    await asyncio.sleep(delay)

            except Exception as e:
                _log(f"  [FAIL] {url[:80]}: {e}", log_file)
                failed += 1

    async with httpx.AsyncClient(
        headers=headers,
        verify=False,
        follow_redirects=True,
        timeout=30.0,
    ) as client:
        # Process in batches to respect concurrency + delay
        tasks = []
        for i, entry in enumerate(pages, 1):
            tasks.append(_process_one(client, entry, i))

        await asyncio.gather(*tasks)

    await browser_fetch.close()

    summary = {
        "total": len(pages),
        "saved": saved,
        "skipped": skipped,
        "failed": failed,
        "output_dir": str(md_dir),
        "timestamp": datetime.now().isoformat(),
    }

    # Save summary
    summary_path = DATA_DIR / slug / "md_download_summary.json"
    summary_path.write_text(
        json.dumps(summary, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    _log(f"\n{'='*60}", log_file)
    _log(f"DOWNLOAD COMPLETE", log_file)
    _log(f"  Saved:   {saved}", log_file)
    _log(f"  Skipped: {skipped}", log_file)
    _log(f"  Failed:  {failed}", log_file)
    _log(f"  Output:  {md_dir}", log_file)
    _log(f"{'='*60}", log_file)

    return summary


# ── CLI ──

def main():
    parser = argparse.ArgumentParser(
        description="Download pages from manifest as Markdown",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  # Download all PyTorch docs as Markdown:
  uv run python scripts/crawl/download_md.py docs/pytorch/manifest.json

  # Download first 10 pages (test):
  uv run python scripts/crawl/download_md.py docs/pytorch/manifest.json --max 10

  # Force re-download:
  uv run python scripts/crawl/download_md.py docs/pytorch/manifest.json --force

Profile CSS directives (in profiles/<slug>.css):
  /* @md-content-selector: .bd-article */
  /* @md-remove: .headerlink,.viewcode-link */
  /* @md-direct: .md */
  /* @md-converter: payload */
        """,
    )
    parser.add_argument("manifest", help="Path to manifest.json from bfs_crawler.py")
    parser.add_argument("--delay", type=float, default=0.2, help="Delay between requests (default: 0.2s)")
    parser.add_argument("--max", type=int, default=None, dest="max_pages", help="Max pages to download")
    parser.add_argument("--concurrency", type=int, default=10, help="Concurrent requests (default: 10)")
    parser.add_argument("--force", action="store_true", help="Force re-download (overwrite existing)")

    args = parser.parse_args()
    manifest_path = Path(args.manifest)

    if not manifest_path.exists():
        print(f"[ERROR] Manifest not found: {manifest_path}")
        sys.exit(1)

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    slug = manifest["slug"]
    log_file = DATA_DIR / slug / "md_download.log"

    asyncio.run(
        download_pages_as_md(
            manifest_path=manifest_path,
            delay=args.delay,
            max_pages=args.max_pages,
            concurrency=args.concurrency,
            force=args.force,
            log_file=log_file,
        )
    )


if __name__ == "__main__":
    main()
