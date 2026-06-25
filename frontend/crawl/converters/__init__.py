"""Converter registry — loads the right converter by name."""
from .base import BaseConverter
from .default import DefaultConverter
from .nextjs import NextjsConverter
from .payload import PayloadConverter
from .supabase import SupabaseConverter

_REGISTRY: dict[str, type[BaseConverter]] = {
    "default": DefaultConverter,
    "nextjs": NextjsConverter,
    "payload": PayloadConverter,
    "supabase": SupabaseConverter,
}


def get_converter(name: str | None = None) -> BaseConverter:
    """Get a converter instance by name. Falls back to default."""
    if not name or name not in _REGISTRY:
        name = "default"
    return _REGISTRY[name]()


__all__ = [
    "BaseConverter",
    "DefaultConverter",
    "NextjsConverter",
    "PayloadConverter",
    "SupabaseConverter",
    "get_converter",
]
