"""Supabase converter.

Handles Supabase's custom code blocks which use:
  <pre><code class="grid grid-cols-[auto_1fr]">
    <div class="select-none ...">1</div>       <!-- line number -->
    <div class="code-content ...">code</div>   <!-- code content -->
    ...
  </code></pre>

The code tag uses CSS grid with alternating line-number and code-content divs.
Also handles div.shiki containers wrapping the pre elements.
"""
import re

from bs4 import Tag

from .base import BaseConverter


class SupabaseConverter(BaseConverter):
    """Converter for Supabase documentation."""

    def convert_code_block(self, node: Tag) -> tuple[str, list[str]] | None:
        """Handle Supabase's grid-based code blocks."""
        tag = node.name.lower()

        # Match <pre> with <code class="grid ...">
        if tag == "pre":
            code = node.find("code")
            if not code:
                return None
            classes_str = " ".join(code.get("class", []))
            if "grid" not in classes_str:
                return None

            # Detect language from parent shiki container
            lang = ""
            parent = node.parent
            if parent and isinstance(parent, Tag):
                parent_cls = " ".join(parent.get("class", []))
                m = re.search(r"language-(\w+)", parent_cls)
                if m:
                    lang = m.group(1)

            # Extract only code-content divs (skip line-number divs)
            code_lines = []
            for div in code.find_all("div", recursive=False):
                div_cls = " ".join(div.get("class", []))
                if "code-content" in div_cls:
                    code_lines.append(div.get_text())

            if code_lines:
                return lang, code_lines

        # Match div.shiki wrapper (intercept before default recursion)
        if tag == "div":
            classes_str = " ".join(node.get("class", []))
            if "shiki" in classes_str and "shiki-wrapper" not in classes_str:
                # Delegate to the <pre> inside
                pre = node.find("pre")
                if pre:
                    result = self.convert_code_block(pre)
                    if result:
                        return result

        return None
