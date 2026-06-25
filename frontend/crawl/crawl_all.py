"""
crawl_all.py — 批量抓取：读 sources-canada.md 主表 → 逐源 bfs_crawler + download_md

直接复用同目录的 bfs_crawler / download_md（import 调用，非子进程）。每个源：
  1. BFS 发现 URL → docs/<slug>/manifest.json
  2. 下载并直转 Markdown → docs/<slug>/md/*.md

用法:
    # cwd: short-video-studio/
    uv run python scripts/crawl/crawl_all.py                      # 跑主表全部
    uv run python scripts/crawl/crawl_all.py --dry-run           # 只列出将要抓取的源
    uv run python scripts/crawl/crawl_all.py --only federal-news on-tax
    uv run python scripts/crawl/crawl_all.py --skip-existing     # 跳过已抓过的 slug
"""
import argparse
import asyncio
import io
import os
import re
import sys
from pathlib import Path

# Windows console encoding fix (region/topic labels are Chinese)
if os.name == "nt":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

_SELF = Path(__file__).resolve()
sys.path.insert(0, str(_SELF.parent))  # bfs_crawler / download_md / converters

import bfs_crawler  # noqa: E402
import download_md  # noqa: E402

DEFAULT_SOURCES = _SELF.parent / "sources-canada.md"
DOCS_DIR = _SELF.parent.parent.parent / "docs"
MAIN_TABLE_HEADING = "## 抓取源主表"
DOWNLOAD_DELAY = 0.2
DOWNLOAD_CONCURRENCY = 10
DISCOVER_CONCURRENCY = 20


# ================================================================
# Parse sources-canada.md main table
# ================================================================
def parse_sources(path: Path) -> list[dict]:
    """Parse the 抓取源主表 section only (skips 待核实).

    Each row: | 地区 | 主题 | slug | seed_url | depth | max_pages | [scope] |
    The optional 7th `scope` cell drives flat-URL crawling:
      (empty / "path")     → path-prefix scope (default)
      "kw:immigrant,oinp"  → same-domain + path contains any keyword
    Returns: [{region, topic, slug, url, depth, max_pages, scope}]
    """
    text = path.read_text(encoding="utf-8")

    start = text.find(MAIN_TABLE_HEADING)
    if start < 0:
        raise ValueError(f"'{MAIN_TABLE_HEADING}' section not found in {path}")
    section = text[start + len(MAIN_TABLE_HEADING):]
    # Cut at next top-level heading
    end = re.search(r"^##\s", section, re.MULTILINE)
    if end:
        section = section[:end.start()]

    rows: list[dict] = []
    for line in section.splitlines():
        if not line.strip().startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) not in (6, 7):
            continue
        region, topic, slug, url, depth, max_pages = cells[:6]
        scope = cells[6] if len(cells) == 7 else ""
        # Skip header / separator rows
        if not url.lower().startswith("http"):
            continue
        if not (depth.isdigit() and max_pages.isdigit()):
            continue
        rows.append({
            "region": region,
            "topic": topic,
            "slug": slug,
            "url": url,
            "depth": int(depth),
            "max_pages": int(max_pages),
            "scope": scope,
        })
    return rows


def scope_keywords(scope: str) -> list[str] | None:
    """Parse a scope cell into a keyword list (None = default path scope)."""
    s = scope.strip().lower()
    if s.startswith(("kw:", "keyword:")):
        rest = s.split(":", 1)[1]
        kws = [k.strip() for k in rest.split(",") if k.strip()]
        return kws or None
    return None


def _already_crawled(slug: str) -> bool:
    md_dir = DOCS_DIR / slug / "md"
    return md_dir.is_dir() and any(md_dir.rglob("*.md"))


# ================================================================
# Crawl one source
# ================================================================
async def crawl_source(entry: dict) -> dict:
    """Discover + download one source. Returns a result summary dict."""
    slug = entry["slug"]
    out_dir = DOCS_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    log_file = out_dir / "crawl.log"

    manifest_path = await bfs_crawler.discover_urls(
        seed_url=entry["url"],
        slug=slug,
        max_depth=entry["depth"],
        max_pages=entry["max_pages"],
        concurrency=DISCOVER_CONCURRENCY,
        log_file=log_file,
        keywords=scope_keywords(entry.get("scope", "")),
    )

    summary = await download_md.download_pages_as_md(
        manifest_path=manifest_path,
        delay=DOWNLOAD_DELAY,
        max_pages=None,
        concurrency=DOWNLOAD_CONCURRENCY,
        force=False,
        log_file=out_dir / "md_download.log",
    )
    return {"slug": slug, **summary}


# ================================================================
# Main
# ================================================================
async def run(entries: list[dict]) -> list[dict]:
    results = []
    for i, entry in enumerate(entries, 1):
        print(f"\n{'='*70}")
        print(f"[{i}/{len(entries)}] {entry['region']} / {entry['topic']} — {entry['slug']}")
        print(f"   seed: {entry['url']}  (depth={entry['depth']}, max={entry['max_pages']})")
        print(f"{'='*70}")
        try:
            results.append(await crawl_source(entry))
        except Exception as e:
            print(f"   ERROR crawling {entry['slug']}: {e}")
            results.append({"slug": entry["slug"], "error": str(e)})
    return results


def main():
    p = argparse.ArgumentParser(description="Batch crawl all sources from sources-canada.md")
    p.add_argument("--sources", type=Path, default=DEFAULT_SOURCES)
    p.add_argument("--only", nargs="+", default=None, help="Only crawl these slugs")
    p.add_argument("--skip-existing", action="store_true", help="Skip slugs already in docs/")
    p.add_argument("--dry-run", action="store_true", help="List sources without crawling")
    args = p.parse_args()

    if not args.sources.exists():
        print(f"ERROR: sources file not found: {args.sources}")
        sys.exit(1)

    entries = parse_sources(args.sources)
    if args.only:
        wanted = set(args.only)
        entries = [e for e in entries if e["slug"] in wanted]
    if args.skip_existing:
        kept = [e for e in entries if not _already_crawled(e["slug"])]
        skipped = len(entries) - len(kept)
        if skipped:
            print(f"[skip-existing] skipping {skipped} already-crawled slug(s)")
        entries = kept

    print(f"Parsed {len(entries)} source(s) to crawl from {args.sources.name}")

    if args.dry_run:
        for e in entries:
            kw = scope_keywords(e.get("scope", ""))
            tag = f"  [kw:{','.join(kw)}]" if kw else ""
            print(f"  - {e['slug']:<28} depth={e['depth']} max={e['max_pages']}  {e['url']}{tag}")
        return

    if not entries:
        print("Nothing to crawl.")
        return

    results = asyncio.run(run(entries))

    # ── Summary ──
    print(f"\n{'='*70}\nBATCH COMPLETE — {len(results)} source(s)\n{'='*70}")
    print(f"{'slug':<28} {'saved':>6} {'skipped':>8} {'failed':>7}")
    print("-" * 53)
    total_saved = 0
    for r in results:
        if "error" in r:
            print(f"{r['slug']:<28} {'ERROR: ' + r['error'][:30]}")
            continue
        saved = r.get("saved", 0)
        total_saved += saved
        print(f"{r['slug']:<28} {saved:>6} {r.get('skipped', 0):>8} {r.get('failed', 0):>7}")
    print("-" * 53)
    print(f"Total .md saved: {total_saved}  →  {DOCS_DIR}")


if __name__ == "__main__":
    main()
