# Auth router
from .router_auth import router
from .router_admin import router as admin_router
from .deps_auth import login_required, get_current_user, get_optional_user, admin_required, is_admin

__all__ = [
    "router",
    "admin_router",
    "login_required",
    "get_current_user",
    "get_optional_user",
    "admin_required",
    "is_admin",
]
