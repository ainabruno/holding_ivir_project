"""OAuth2 client-credentials authentication for the PISTE Légifrance API."""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass

import requests

logger = logging.getLogger("holding_ivir.legifrance_auth")

DEFAULT_SANDBOX_TOKEN_URL = "https://sandbox-oauth.piste.gouv.fr/api/oauth/token"


class LegifranceAuthError(RuntimeError):
    """Raised when the configured PISTE credentials cannot obtain a token."""


@dataclass
class _TokenCache:
    access_token: str | None = None
    expires_at: float = 0.0


_token_cache = _TokenCache()


def _settings() -> tuple[str, str, str]:
    token_url = os.getenv("PISTE_TOKEN_URL", DEFAULT_SANDBOX_TOKEN_URL)
    client_id = os.getenv("LEGIFRANCE_CLIENT_ID", "").strip()
    client_secret = os.getenv("LEGIFRANCE_CLIENT_SECRET", "").strip()
    return token_url, client_id, client_secret


def get_legifrance_token(*, timeout: float = 15.0, force_refresh: bool = False) -> str:
    """Return a cached or freshly obtained PISTE Bearer token.

    Credentials are intentionally read at call time so local development and
    container deployments can inject them without importing secrets into code.
    The function raises a clear error instead of returning a fake token.
    """

    token_url, client_id, client_secret = _settings()
    if not client_id or not client_secret:
        raise LegifranceAuthError(
            "LEGIFRANCE_CLIENT_ID et LEGIFRANCE_CLIENT_SECRET doivent être configurés."
        )

    now = time.time()
    if not force_refresh and _token_cache.access_token and now < _token_cache.expires_at - 60:
        return _token_cache.access_token

    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "openid",
    }
    try:
        response = requests.post(
            token_url,
            data=payload,
            headers={"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
            timeout=timeout,
        )
        response.raise_for_status()
        token_data = response.json()
    except requests.RequestException as error:
        raise LegifranceAuthError(f"Échec de l’authentification PISTE : {error}") from error
    except ValueError as error:
        raise LegifranceAuthError("La réponse OAuth2 PISTE n’est pas un JSON valide.") from error

    access_token = token_data.get("access_token")
    if not access_token:
        raise LegifranceAuthError("La réponse OAuth2 PISTE ne contient pas d’access_token.")

    try:
        expires_in = max(60, int(token_data.get("expires_in", 3600)))
    except (TypeError, ValueError):
        expires_in = 3600

    _token_cache.access_token = access_token
    _token_cache.expires_at = now + expires_in
    logger.info("Jeton OAuth2 PISTE obtenu; expiration dans %s secondes.", expires_in)
    return access_token


def clear_token_cache() -> None:
    """Clear the in-process token cache, useful after a 401 response or tests."""

    _token_cache.access_token = None
    _token_cache.expires_at = 0.0
