"""Next.js converter.

Handles Next.js-specific cleanup:
  - Tab selector noise (pnpmnpmyarnbunTerminal)
  - Trailing feedback widget text
"""
import re

from .base import BaseConverter


class NextjsConverter(BaseConverter):
    """Converter for Next.js documentation."""

    def post_process(self, md_text: str) -> str:
        """Clean up Next.js-specific UI noise."""
        # Remove tab-selector noise (e.g. "pnpmnpmyarnbunTerminal")
        md_text = re.sub(
            r"(?:pnpm|npm|yarn|bun|Terminal|TypeScript|JavaScript){2,}",
            "",
            md_text,
        )

        # Remove trailing feedback text
        md_text = re.sub(r"Was this helpful\?.*$", "", md_text, flags=re.DOTALL)

        return md_text
