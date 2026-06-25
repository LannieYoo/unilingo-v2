"""
BFS Web Crawler — Discover all pages under a seed URL.

Adapted from textbook-rag/scripts/crawl/crawler_cli.py.
Fully standalone — no project-specific engine dependencies.

Usage:
  uv run python scripts/crawl/bfs_crawler.py discover <seed_url> <slug> [--depth 3] [--max-pages 500]
  uv run python scripts/crawl/bfs_crawler.py discover https://doc.qt.io/qtforpython-6/ qt-for-python

Output:
  data/crawled_docs/<slug>/manifest.json   — list of discovered URLs
"""
import argparse
import asyncio
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag

import httpx
from bs4 import BeautifulSoup

import browser_fetch

# ── Config ──
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "docs"

# File extensions to skip
SKIP_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".pdf", ".zip", ".tar", ".gz", ".bz2", ".xz",
    ".mp4", ".mp3", ".avi", ".mov", ".wmv",
    ".woff", ".woff2", ".ttf", ".eot",
    ".css", ".js", ".map", ".json",
    ".xml", ".rss", ".atom",
}

# URL path patterns to skip
SKIP_PATTERNS = [
    r"/_sources/",       # Sphinx raw source
    r"/_static/",        # Sphinx static assets
    r"/_images/",        # Sphinx images
    r"/genindex",        # generated index
    r"/search\.html",    # search page
    r"/py-modindex",     # module index
]


def _log(msg: str, log_file: Path | None = None):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    if log_file:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(line + "\n")


def _should_skip_url(url: str) -> bool:
    """Check if a URL should be skipped based on extension or pattern."""
    parsed = urlparse(url)
    path = parsed.path.lower()

    # Skip by extension
    for ext in SKIP_EXTENSIONS:
        if path.endswith(ext):
            return True

    # Skip by pattern
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, path):
            return True

    return False


def _normalize_url(url: str) -> str:
    """Normalize URL: remove fragment, trailing slash for non-root paths."""
    url, _ = urldefrag(url)
    parsed = urlparse(url)
    # Remove trailing slash (except for root path "/")
    path = parsed.path.rstrip("/") if parsed.path != "/" else parsed.path
    return f"{parsed.scheme}://{parsed.netloc}{path}"


def _is_same_scope(url: str, seed_url: str, keywords: list[str] | None = None) -> bool:
    """Check whether URL is in crawl scope.

    Default (path mode): same domain AND under the seed's path prefix —
    works for hierarchical sites (gov.nl.ca/immigration/...).

    Keyword mode: ALSO accept same-domain URLs whose path contains any keyword,
    so flat-URL sites (ontario.ca/page/X, alberta.ca/X) still expand to sibling
    topic pages that don't share the seed's path prefix.
    """
    seed_parsed = urlparse(seed_url)
    url_parsed = urlparse(url)

    # Must be same domain
    if url_parsed.netloc != seed_parsed.netloc:
        return False

    seed_path = seed_parsed.path.rstrip("/")
    url_path = url_parsed.path.rstrip("/")
    if url_path.startswith(seed_path):
        return True
    if keywords:
        low = url_path.lower()
        return any(kw in low for kw in keywords)
    return False


async def discover_urls(
    seed_url: str,
    slug: str,
    max_depth: int = 3,
    max_pages: int = 500,
    concurrency: int = 20,
    log_file: Path | None = None,
    keywords: list[str] | None = None,
) -> Path:
    """BFS crawl to discover all pages under a seed URL.

    Uses concurrent requests for fast discovery.
    Returns path to the generated manifest.json.
    """
    out_dir = DATA_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.json"

    seed_url = _normalize_url(seed_url.rstrip("/"))
    visited: set[str] = set()
    discovered: list[dict] = []
    pending: set[str] = set()  # URLs queued but not yet visited

    _log(f"BFS Discovery starting from: {seed_url}", log_file)
    _log(f"  Max depth: {max_depth}, Max pages: {max_pages}, Concurrency: {concurrency}", log_file)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
    }

    sem = asyncio.Semaphore(concurrency)
    lock = asyncio.Lock()

    async def _fetch_one(url: str, depth: int) -> list[tuple[str, int]]:
        """Fetch a single URL and return newly discovered child URLs."""
        async with sem:
            html = None
            status = 0
            base_url = url
            try:
                resp = await client.get(url)
                status = resp.status_code
                if resp.status_code == 403:
                    # httpx blocked by bot protection → try a real browser
                    html = await browser_fetch.fetch_html(url)
                    if html:
                        _log(f"  [browser] 403→browser: {url[:80]}", log_file)
                else:
                    resp.raise_for_status()
                    if "text/html" in resp.headers.get("content-type", ""):
                        html = resp.text
                        base_url = str(resp.url)
            except httpx.HTTPStatusError as e:
                _log(f"  [SKIP] HTTP {e.response.status_code}: {url[:80]}", log_file)
                return []
            except Exception as e:
                _log(f"  [SKIP] Error: {e}: {url[:80]}", log_file)
                return []

            if not html:
                return []

            soup = BeautifulSoup(html, "html.parser")
            title_tag = soup.find("title")
            title = title_tag.get_text(strip=True) if title_tag else ""

            async with lock:
                if len(discovered) >= max_pages:
                    return []
                discovered.append({
                    "url": url,
                    "title": title,
                    "depth": depth,
                    "status": status or 200,
                })
                idx = len(discovered)

            _log(f"  [{idx:4d}] depth={depth} {url[:100]}", log_file)

            # Extract child links
            children = []
            if depth < max_depth:
                for a_tag in soup.find_all("a", href=True):
                    href = a_tag["href"]
                    abs_url = urljoin(base_url, href)
                    abs_normalized = _normalize_url(abs_url)
                    if (
                        abs_normalized not in visited
                        and abs_normalized not in pending
                        and not _should_skip_url(abs_normalized)
                        and _is_same_scope(abs_normalized, seed_url, keywords)
                    ):
                        children.append((abs_normalized, depth + 1))
            return children

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=30.0,
        headers=headers,
        verify=False,
    ) as client:
        # BFS level by level with concurrent fetching within each level
        current_level = [(seed_url, 0)]
        visited.add(seed_url)

        while current_level and len(discovered) < max_pages:
            # Filter already-visited
            to_fetch = [
                (u, d) for u, d in current_level
                if not _should_skip_url(u) and _is_same_scope(u, seed_url, keywords)
            ]

            if not to_fetch:
                break

            # Cap to remaining budget
            remaining = max_pages - len(discovered)
            to_fetch = to_fetch[:remaining]

            _log(f"  [LEVEL] Fetching {len(to_fetch)} URLs at depth {to_fetch[0][1]}...", log_file)

            # Fetch all URLs in this level concurrently
            tasks = [_fetch_one(url, depth) for url, depth in to_fetch]
            results = await asyncio.gather(*tasks)

            # Collect next level's URLs
            next_level = []
            for children in results:
                for child_url, child_depth in children:
                    if child_url not in visited and child_url not in pending:
                        pending.add(child_url)
                        visited.add(child_url)
                        next_level.append((child_url, child_depth))

            current_level = next_level

    # Save manifest
    manifest = {
        "seed_url": seed_url,
        "slug": slug,
        "total_urls": len(discovered),
        "max_depth": max_depth,
        "crawled_at": datetime.now().isoformat(),
        "pages": discovered,
    }
    manifest_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    await browser_fetch.close()

    _log(f"\n[OK] Discovered {len(discovered)} pages", log_file)
    _log(f"     Manifest: {manifest_path}", log_file)
    return manifest_path


# ── CLI ──

def main():
    parser = argparse.ArgumentParser(
        description="BFS Web Crawler — Discover all pages under a seed URL",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Discover all Qt for Python 6 doc pages:
  uv run python scripts/crawl/bfs_crawler.py discover \\
    https://doc.qt.io/qtforpython-6/ qt-for-python --depth 3 --max-pages 5000

  # Faster with more concurrency:
  uv run python scripts/crawl/bfs_crawler.py discover \\
    https://doc.qt.io/qtforpython-6/ qt-for-python --concurrency 30
        """,
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # discover
    p_discover = subparsers.add_parser("discover", help="BFS discover all URLs under seed")
    p_discover.add_argument("seed_url", help="Starting URL for BFS crawl")
    p_discover.add_argument("slug", help="Output slug name (e.g. qt-for-python)")
    p_discover.add_argument("--depth", type=int, default=3, help="Max BFS depth (default: 3)")
    p_discover.add_argument("--max-pages", type=int, default=5000, help="Max pages to discover (default: 5000)")
    p_discover.add_argument("--concurrency", type=int, default=20, help="Concurrent requests (default: 20)")
    p_discover.add_argument(
        "--keywords", default="",
        help="Comma-separated keywords for flat-URL sites (same-domain links whose path contains a keyword are followed)",
    )

    args = parser.parse_args()

    if args.command == "discover":
        out_dir = DATA_DIR / args.slug
        out_dir.mkdir(parents=True, exist_ok=True)
        log_file = out_dir / "crawl.log"

        keywords = [k.strip().lower() for k in args.keywords.split(",") if k.strip()] or None

        asyncio.run(
            discover_urls(
                seed_url=args.seed_url,
                slug=args.slug,
                max_depth=args.depth,
                max_pages=args.max_pages,
                concurrency=args.concurrency,
                log_file=log_file,
                keywords=keywords,
            )
        )


if __name__ == "__main__":
    main()

