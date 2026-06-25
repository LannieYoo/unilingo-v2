"""Payload CMS converter.

Handles Payload's custom Prism-based code blocks which use
div.code-block-wrap > div.prism-code > div.token-line structure
with embedded line numbers instead of standard <pre><code>.
"""
import re

from bs4 import Tag

from .base import BaseConverter


class PayloadConverter(BaseConverter):
    """Converter for Payload CMS documentation."""

    def convert_code_block(self, node: Tag) -> tuple[str, list[str]] | None:
        """Handle Payload's div.prism-code code blocks."""
        tag = node.name.lower()
        if tag != "div":
            return None

        classes_str = " ".join(node.get("class", []))
        if "code-block-wrap" not in classes_str and "prism-code" not in classes_str:
            return None

        # Find the prism-code container
        prism = node if "prism-code" in classes_str else node.select_one(
            ".prism-code, [class*='prism-code']"
        )
        if not prism:
            return None

        # Detect language from class
        lang = ""
        for cls in prism.get("class", []):
            if isinstance(cls, str):
                m = re.match(r"(?:language-)(\w+)", cls)
                if m:
                    lang = m.group(1)
                    break

        # Extract code lines from token-line divs only.
        # IMPORTANT: Do NOT use [class*='Code_line'] as it also matches
        # Code_lineCodeWrapper children, causing duplicate lines.
        code_lines = []
        for line_div in prism.select(":scope > [class*='token-line']"):
            # Only extract from the code wrapper (no line numbers)
            wrapper = line_div.select_one(
                "[class*='lineCodeWrapper'], [class*='LineCodeWrapper']"
            )
            if wrapper:
                line_text = wrapper.get_text()
            else:
                # Fallback: remove line number spans and use remaining text
                for ln in line_div.select(
                    "[class*='lineNumber'], [class*='LineNumber']"
                ):
                    ln.decompose()
                line_text = line_div.get_text()
            code_lines.append(line_text)

        if not code_lines:
            return None

        # Deduplicate consecutive identical lines (Payload SSR artifact)
        deduped: list[str] = []
        for line in code_lines:
            if not deduped or line != deduped[-1]:
                deduped.append(line)

        return lang, deduped
