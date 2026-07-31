from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models.guild import GuildMembership, MembershipRole
from app.models.user import User

_bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(user: User, claimable_guild_ids: list[str] | None = None) -> str:
    """`claimable_guild_ids` is embedded (and signed) at login time from a
    fresh Discord `/users/@me/guilds` lookup — it's the set of Discord servers
    this user had MANAGE_GUILD on at that moment. Signing it into the token
    (rather than trusting a client-supplied value) is what lets the guild-claim
    endpoint verify eligibility without us persisting the Discord access token
    or any server-side session."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "discord_id": user.discord_id,
        "claimable_guild_ids": claimable_guild_ids or [],
        "iat": now,
        "exp": now + timedelta(days=settings.jwt_expires_days),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def get_current_token_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return _decode_token(credentials.credentials)


def get_current_user(
    payload: dict = Depends(get_current_token_payload),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    try:
        payload = _decode_token(credentials.credentials)
    except HTTPException:
        return None
    return db.get(User, int(payload["sub"]))


def require_guild_role(
    db: Session,
    user: User,
    guild_id: int,
    roles: tuple[MembershipRole, ...] = (MembershipRole.owner, MembershipRole.officer),
) -> GuildMembership:
    """Raise 403 unless `user` has one of `roles` on the given guild."""
    membership = (
        db.query(GuildMembership)
        .filter(GuildMembership.guild_id == guild_id, GuildMembership.user_id == user.id)
        .first()
    )
    if membership is None or membership.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Officer access required")
    return membership


def require_officer(
    guild_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GuildMembership:
    """FastAPI dependency for routes where `guild_id` is a direct path param."""
    return require_guild_role(db, user, guild_id)


def require_owner(
    guild_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GuildMembership:
    return require_guild_role(db, user, guild_id, roles=(MembershipRole.owner,))
