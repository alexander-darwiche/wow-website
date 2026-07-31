"""Thin wrapper around the Discord OAuth2 + REST API endpoints used for login.

We intentionally never persist the Discord access token (see auth design notes
in the plan) — it's used once during the OAuth callback to fetch the user's
identity and guild list, then discarded.
"""
import httpx

from app.config import get_settings

DISCORD_API_BASE = "https://discord.com/api/v10"
MANAGE_GUILD_PERMISSION = 0x20


def get_authorize_url(state: str) -> str:
    settings = get_settings()
    params = httpx.QueryParams(
        {
            "client_id": settings.discord_client_id,
            "redirect_uri": settings.discord_redirect_uri,
            "response_type": "code",
            "scope": "identify guilds",
            "state": state,
        }
    )
    return f"https://discord.com/oauth2/authorize?{params}"


def exchange_code_for_token(code: str) -> str:
    settings = get_settings()
    response = httpx.post(
        f"{DISCORD_API_BASE}/oauth2/token",
        data={
            "client_id": settings.discord_client_id,
            "client_secret": settings.discord_client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.discord_redirect_uri,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    response.raise_for_status()
    return response.json()["access_token"]


def get_current_discord_user(access_token: str) -> dict:
    response = httpx.get(
        f"{DISCORD_API_BASE}/users/@me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    response.raise_for_status()
    return response.json()


def get_manageable_guilds(access_token: str) -> list[dict]:
    """Return {id, name} for Discord servers this user has MANAGE_GUILD on —
    the set of servers they're allowed to claim as a Guild owner on our site."""
    response = httpx.get(
        f"{DISCORD_API_BASE}/users/@me/guilds",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    response.raise_for_status()
    guilds = response.json()
    return [
        {"id": g["id"], "name": g["name"]}
        for g in guilds
        if int(g.get("permissions", 0)) & MANAGE_GUILD_PERMISSION
    ]
