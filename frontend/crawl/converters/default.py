"""Default converter — uses BaseConverter as-is."""
from .base import BaseConverter


class DefaultConverter(BaseConverter):
    """Default converter for standard documentation sites (Sphinx, mkdocs, etc.)."""
    pass
