"""
Base HTML → Markdown converter.

Provides the core DOM-walking logic that converts HTML documentation pages
to clean Markdown. Site-specific converters inherit from BaseConverter and
override hooks for custom code blocks, post-processing, etc.
"""
import re
from datetime import datetime
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Comment, NavigableString, Tag

# Default content selectors to try (in order of preference)
DEFAULT_CONTENT_SELECTORS = [
    "article",
    "main",
    "[role='main']",
    ".bd-article",
    ".document",
    ".content",
    "#content",
    "body",
]

# Default elements to remove from content
DEFAULT_REMOVE_SELECTORS = [
    "script", "style", "nav", "footer", "header",
    ".headerlink",          # Sphinx ¶ links
    ".viewcode-link",       # Sphinx [source] links
    ".highlight-link",      # Sphinx highlight links
    "a.reference.external.image-reference",  # image links
]


class BaseConverter:
    """Base HTML → Markdown converter.

    Override these hooks in subclasses for site-specific behaviour:
      - convert_code_block(node) → (lang, code_lines) | None
      - post_process(md_text) → md_text
    """

    def convert(self, html: str, url: str, profile: dict) -> tuple[str, str]:
        """Main entry point. Returns (markdown_text, title)."""
        soup = BeautifulSoup(html, "html.parser")

        # Extract title
        title_tag = soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else ""

        # Remove unwanted elements (from profile + defaults)
        remove_selectors = DEFAULT_REMOVE_SELECTORS + profile.get("remove_selectors", [])
        for selector in remove_selectors:
            try:
                for el in soup.select(selector):
                    el.decompose()
            except Exception:
                pass  # skip invalid selectors

        # Find main content area
        content = None
        if profile.get("content_selector"):
            content = soup.select_one(profile["content_selector"])

        if not content:
            for selector in DEFAULT_CONTENT_SELECTORS:
                content = soup.select_one(selector)
                if content:
                    break

        if not content:
            content = soup.body or soup

        # Convert to markdown
        lines: list[str] = []
        self._walk(content, lines, url)
        md = "\n".join(lines)

        # Clean up excessive blank lines
        md = re.sub(r"\n{3,}", "\n\n", md)

        # Site-specific post-processing
        md = self.post_process(md)

        md = md.strip() + "\n"

        # Add source header (fetched = crawl time, for tracking freshness)
        fetched = datetime.now().astimezone().isoformat(timespec="seconds")
        header = f"---\nsource: {url}\ntitle: \"{title}\"\nfetched: {fetched}\n---\n\n"

        return header + md, title

    # ── Hooks for subclasses ──

    def convert_code_block(self, node: Tag) -> tuple[str, list[str]] | None:
        """Try to convert a custom code block element.

        Return (language, [code_lines]) if handled, or None to skip.
        Called before the default <pre>/<code> handler.
        """
        return None

    def post_process(self, md_text: str) -> str:
        """Post-process the full markdown text. Override for site-specific cleanup."""
        return md_text

    # ── Core DOM walker ──

    def _walk(self, node, lines: list[str], base_url: str):
        """Recursively walk DOM tree and emit Markdown lines."""
        # Comment is a NavigableString subclass — skip it before the text branch,
        # else HTML comments (e.g. "<!-- .entry-header -->") leak into the output.
        if isinstance(node, Comment):
            return
        if isinstance(node, NavigableString):
            text = str(node)
            if not text.strip():
                return
            # Collapse whitespace within inline text
            text = re.sub(r"\s+", " ", text)
            if lines and not lines[-1].endswith("\n"):
                lines[-1] += text
            else:
                lines.append(text)
            return

        if not isinstance(node, Tag):
            return

        tag = node.name.lower()

        # ── Headings ──
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            level = int(tag[1])
            text = node.get_text(separator=" ", strip=True)
            text = re.sub(r"\s+", " ", text).strip()
            if text:
                lines.append("")
                lines.append(f"{'#' * level} {text}")
                lines.append("")
            return

        # ── Custom code blocks (site-specific hook) ──
        result = self.convert_code_block(node)
        if result is not None:
            lang, code_lines = result
            lines.append("")
            lines.append(f"```{lang}")
            for cl in code_lines:
                lines.append(cl.rstrip())
            lines.append("```")
            lines.append("")
            return

        # ── Code blocks (pre > code) ──
        if tag == "pre":
            code_tag = node.find("code")
            code_text = code_tag.get_text() if code_tag else node.get_text()
            # Detect language from class
            lang = ""
            classes = node.get("class", []) + (code_tag.get("class", []) if code_tag else [])
            for cls in classes:
                if isinstance(cls, str):
                    m = re.match(r"(?:language-|highlight-)?(\w+)", cls)
                    if m and m.group(1) not in ("highlight", "code", "pre", "block"):
                        lang = m.group(1)
                        break
            lines.append("")
            lines.append(f"```{lang}")
            # Preserve code formatting exactly
            for code_line in code_text.rstrip("\n").split("\n"):
                lines.append(code_line)
            lines.append("```")
            lines.append("")
            return

        # ── Inline code ──
        if tag == "code" and not self._is_inside_pre(node):
            text = node.get_text()
            if text:
                if "`" in text:
                    lines.append(f"`` {text} ``" if lines and not lines[-1].endswith("\n") else f"`` {text} ``")
                else:
                    if lines and not lines[-1].endswith("\n"):
                        lines[-1] += f"`{text}`"
                    else:
                        lines.append(f"`{text}`")
            return

        # ── Tables ──
        if tag == "table":
            self._convert_table(node, lines)
            return

        # ── Lists ──
        if tag in ("ul", "ol"):
            lines.append("")
            for i, li in enumerate(node.find_all("li", recursive=False), 1):
                prefix = f"{i}. " if tag == "ol" else "- "
                li_text = self._inline_text(li, base_url).strip()
                lines.append(f"{prefix}{li_text}")
            lines.append("")
            return

        # ── Definition lists (common in Sphinx) ──
        if tag == "dl":
            lines.append("")
            for child in node.children:
                if isinstance(child, Tag):
                    if child.name == "dt":
                        text = self._inline_text(child, base_url).strip()
                        lines.append(f"**{text}**")
                    elif child.name == "dd":
                        dd_lines: list[str] = []
                        self._walk(child, dd_lines, base_url)
                        for dl in dd_lines:
                            if dl.strip():
                                lines.append(f"  {dl}")
                            else:
                                lines.append("")
            lines.append("")
            return

        # ── Block elements ──
        if tag in ("p", "div"):
            # Check for admonitions (Sphinx note/warning/etc.)
            classes = " ".join(node.get("class", []))
            if "admonition" in classes or "note" in classes or "warning" in classes:
                lines.append("")
                adm_title = node.find(class_="admonition-title")
                if adm_title:
                    lines.append(f"> **{adm_title.get_text(strip=True)}**")
                    adm_title.decompose()
                for child in node.children:
                    child_text = self._inline_text(child, base_url).strip() if isinstance(child, Tag) else str(child).strip()
                    if child_text:
                        lines.append(f"> {child_text}")
                lines.append("")
                return

            if tag == "p":
                text = self._inline_text(node, base_url).strip()
                if text:
                    lines.append("")
                    lines.append(text)
                    lines.append("")
                return

        # ── Links ──
        if tag == "a":
            href = node.get("href", "")
            text = node.get_text(strip=True)
            if text and href:
                if not href.startswith(("#", "mailto:", "javascript:")):
                    href = urljoin(base_url, href)
                if lines and not lines[-1].endswith("\n"):
                    lines[-1] += f"[{text}]({href})"
                else:
                    lines.append(f"[{text}]({href})")
            elif text:
                if lines and not lines[-1].endswith("\n"):
                    lines[-1] += text
                else:
                    lines.append(text)
            return

        # ── Images ──
        if tag == "img":
            alt = node.get("alt", "")
            src = node.get("src", "")
            if src:
                src = urljoin(base_url, src)
                lines.append(f"![{alt}]({src})")
            return

        # ── Video ──
        if tag == "video":
            src = node.get("src", "")
            source_tag = node.find("source")
            if not src and source_tag:
                src = source_tag.get("src", "")
            if src:
                src = urljoin(base_url, src)
                lines.append("")
                lines.append(f"[Video: {src}]({src})")
                lines.append("")
            return

        # ── Iframe (YouTube, Vimeo, etc.) ──
        if tag == "iframe":
            src = node.get("src", "")
            title_attr = node.get("title", "Embedded video")
            if src:
                lines.append("")
                lines.append(f"[{title_attr}]({src})")
                lines.append("")
            return

        # ── Emphasis ──
        if tag in ("strong", "b"):
            text = node.get_text(strip=True)
            if text:
                if lines and not lines[-1].endswith("\n"):
                    lines[-1] += f"**{text}**"
                else:
                    lines.append(f"**{text}**")
            return

        if tag in ("em", "i"):
            text = node.get_text(strip=True)
            if text:
                if lines and not lines[-1].endswith("\n"):
                    lines[-1] += f"*{text}*"
                else:
                    lines.append(f"*{text}*")
            return

        # ── Horizontal rule ──
        if tag == "hr":
            lines.append("")
            lines.append("---")
            lines.append("")
            return

        # ── Blockquote ──
        if tag == "blockquote":
            lines.append("")
            for child in node.children:
                text = self._inline_text(child, base_url).strip() if isinstance(child, Tag) else str(child).strip()
                if text:
                    lines.append(f"> {text}")
            lines.append("")
            return

        # ── Default: recurse into children ──
        for child in node.children:
            self._walk(child, lines, base_url)

    # ── Helpers ──

    @staticmethod
    def _is_inside_pre(node) -> bool:
        """Check if a node is inside a <pre> element."""
        parent = node.parent
        while parent:
            if isinstance(parent, Tag) and parent.name == "pre":
                return True
            parent = parent.parent
        return False

    def _inline_text(self, node, base_url: str) -> str:
        """Get inline text from a node, handling basic formatting."""
        if isinstance(node, NavigableString):
            return re.sub(r"\s+", " ", str(node))

        if not isinstance(node, Tag):
            return ""

        tag = node.name.lower()

        if tag == "code" and not self._is_inside_pre(node):
            text = node.get_text()
            return f"`{text}`" if text else ""

        if tag in ("strong", "b"):
            text = self._inline_text_children(node, base_url)
            return f"**{text}**" if text.strip() else ""

        if tag in ("em", "i"):
            text = self._inline_text_children(node, base_url)
            return f"*{text}*" if text.strip() else ""

        if tag == "a":
            href = node.get("href", "")
            text = node.get_text(strip=True)
            if text and href:
                if not href.startswith(("#", "mailto:", "javascript:")):
                    href = urljoin(base_url, href)
                return f"[{text}]({href})"
            return text or ""

        if tag == "br":
            return "\n"

        if tag == "img":
            src = node.get("src", "")
            if src:
                src = urljoin(base_url, src)
            return f"![{node.get('alt', '')}]({src})"

        return self._inline_text_children(node, base_url)

    def _inline_text_children(self, node, base_url: str) -> str:
        """Get concatenated inline text of children."""
        parts = []
        for child in node.children:
            parts.append(self._inline_text(child, base_url))
        return "".join(parts)

    def _convert_table(self, table: Tag, lines: list[str]):
        """Convert an HTML table to Markdown table."""
        rows = []
        for tr in table.find_all("tr"):
            cells = []
            for td in tr.find_all(["td", "th"]):
                text = td.get_text(separator=" ", strip=True)
                text = re.sub(r"\s+", " ", text).strip()
                cells.append(text)
            if cells:
                rows.append(cells)

        if not rows:
            return

        # Normalize column count
        max_cols = max(len(r) for r in rows)
        for row in rows:
            while len(row) < max_cols:
                row.append("")

        lines.append("")

        # Header row
        lines.append("| " + " | ".join(rows[0]) + " |")
        lines.append("| " + " | ".join(["---"] * max_cols) + " |")

        # Data rows
        for row in rows[1:]:
            lines.append("| " + " | ".join(row) + " |")

        lines.append("")
