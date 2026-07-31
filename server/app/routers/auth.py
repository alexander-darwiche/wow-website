import base64
import json
from datetime import datetime, timedelta, timezone

import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.auth.security import create_access_token, get_current_user
from app.config import get_settings
from app.db import get_db
from app.models.guild import GuildMembership
from app.models.user import User
from app.schemas.auth import MeOut, MembershipOut
from app.services import discord_client

router = APIRouter(prefix="/api/auth", tags=["auth"])

_STATE_PURPOSE = "oauth_state"


@router.get("/discord/login")
def discord_login():
    """Redirect the browser to Discord's OAuth consent screen. `state` is a
    short-lived signed JWT (not tied to any server-side session) so the
    callback can verify the request round-tripped through Discord rather than
    being a forged callback, without needing session storage."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    state = jwt.encode(
        {"purpose": _STATE_PURPOSE, "iat": now, "exp": now + timedelta(minutes=10)},
        settings.jwt_secret,
        algorithm="HS256",
    )
    return RedirectResponse(discord_client.get_authorize_url(state))


@router.get("/discord/callback")
def discord_callback(code: str = Query(...), state: str = Query(...), db: Session = Depends(get_db)):
    settings = get_settings()
    try:
        payload = jwt.decode(state, settings.jwt_secret, algorithms=["HS256"])
        if payload.get("purpose") != _STATE_PURPOSE:
            raise ValueError("wrong purpose")
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    try:
        access_token = discord_client.exchange_code_for_token(code)
        discord_user = discord_client.get_current_discord_user(access_token)
        claimable_guilds = discord_client.get_manageable_guilds(access_token)
    except httpx.HTTPStatusError:
        raise HTTPException(status_code=400, detail="Discord login failed")

    user = db.query(User).filter(User.discord_id == discord_user["id"]).first()
    if user is None:
        user = User(discord_id=discord_user["id"], username=discord_user["username"])
        db.add(user)
    user.username = discord_user["username"]
    user.avatar_hash = discord_user.get("avatar")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    token = create_access_token(user, claimable_guild_ids=[g["id"] for g in claimable_guilds])
    claimable_b64 = base64.urlsafe_b64encode(json.dumps(claimable_guilds).encode()).decode()
    return RedirectResponse(f"{settings.frontend_url}/auth/complete?token={token}&claimable={claimable_b64}")


@router.get("/me", response_model=MeOut)
def me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memberships = (
        db.query(GuildMembership)
        .filter(GuildMembership.user_id == user.id)
        .all()
    )
    return MeOut(
        id=user.id,
        discord_id=user.discord_id,
        username=user.username,
        avatar_hash=user.avatar_hash,
        memberships=[
            MembershipOut(guild_id=m.guild_id, guild_name=m.guild.name, role=m.role.value)
            for m in memberships
        ],
    )
