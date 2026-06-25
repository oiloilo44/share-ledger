from functools import lru_cache
from inspect import signature

from gotrue import http_clients as gotrue_http_clients
from supabase import Client, create_client

from .config import get_settings

# Supabase Python SDK는 httpx 0.24 이상에서 proxy 인자를 지원하지 않는 이슈가 있어
# SyncClient.__init__에 proxy 파라미터를 수용하도록 패치한다.
if "proxy" not in signature(gotrue_http_clients.SyncClient.__init__).parameters:
    _original_sync_client_init = gotrue_http_clients.SyncClient.__init__

    def _patched_sync_client_init(self, *args, proxy=None, **kwargs):
        if proxy is not None:
            kwargs.setdefault("proxies", proxy)
        return _original_sync_client_init(self, *args, **kwargs)

    gotrue_http_clients.SyncClient.__init__ = _patched_sync_client_init


@lru_cache(maxsize=1)
def _build_supabase_client() -> Client:
    """Supabase 클라이언트를 초기화한다."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_server_key)


def get_supabase_client() -> Client:
    """FastAPI 의존성에서 사용될 Supabase 클라이언트를 반환한다."""
    return _build_supabase_client()
