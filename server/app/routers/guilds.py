from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import (
    get_current_token_payload,
    get_current_user,
    get_current_user_optional,
    require_owner,
)
from app.db import get_db
from app.models.guild import Guild, GuildMembership, MembershipRole
from app.models.user import User
from app.schemas.guild import GuildClaim, GuildOut, GuildUpdate, MembershipCreate, MembershipOut

router = APIRouter(prefix="/api/guilds", tags=["guilds"])


def _my_role(db: Session, user: User | None, guild_id: int) -> str | None:
    if user is None:
        return None
    membership = (
        db.query(GuildMembership)
        .filter(GuildMembership.guild_id == guild_id, GuildMembership.user_id == user.id)
        .first()
    )
    return membership.role.value if membership else None


def _to_out(db: Session, guild: Guild, user: User | None) -> GuildOut:
    return GuildOut(
        id=guild.id,
        name=guild.name,
        discord_guild_id=guild.discord_guild_id,
        wcl_guild_name=guild.wcl_guild_name,
        server_slug=guild.server_slug,
        region=guild.region,
        has_raid_helper_key=bool(guild.raid_helper_api_key),
        my_role=_my_role(db, user, guild.id),
    )


@router.post("/claim", response_model=GuildOut)
def claim_guild(
    payload: GuildClaim,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    token_payload: dict = Depends(get_current_token_payload),
):
    claimable_ids = token_payload.get("claimable_guild_ids", [])
    if payload.discord_guild_id not in claimable_ids:
        raise HTTPException(
            status_code=403,
            detail="You don't have Manage Server permission on that Discord server (or logged in before it changed — try logging in again).",
        )
    existing = db.query(Guild).filter(Guild.discord_guild_id == payload.discord_guild_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="This Discord server has already been claimed")

    guild = Guild(
        name=payload.name,
        discord_guild_id=payload.discord_guild_id,
        wcl_guild_name=payload.wcl_guild_name,
        server_slug=payload.server_slug,
        region=payload.region,
        created_by_user_id=user.id,
    )
    db.add(guild)
    db.flush()
    db.add(GuildMembership(guild_id=guild.id, user_id=user.id, role=MembershipRole.owner))
    db.commit()
    db.refresh(guild)
    return _to_out(db, guild, user)


@router.get("/mine", response_model=list[GuildOut])
def my_guilds(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    memberships = db.query(GuildMembership).filter(GuildMembership.user_id == user.id).all()
    return [_to_out(db, m.guild, user) for m in memberships]


@router.get("/{guild_id}", response_model=GuildOut)
def get_guild(
    guild_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    guild = db.get(Guild, guild_id)
    if guild is None:
        raise HTTPException(status_code=404, detail="Guild not found")
    return _to_out(db, guild, user)


@router.patch("/{guild_id}", response_model=GuildOut)
def update_guild(
    guild_id: int,
    payload: GuildUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    membership: GuildMembership = Depends(require_owner),
):
    guild = db.get(Guild, guild_id)
    if guild is None:
        raise HTTPException(status_code=404, detail="Guild not found")
    for field in ("name", "wcl_guild_name", "server_slug", "region", "raid_helper_api_key"):
        value = getattr(payload, field)
        if value is not None:
            setattr(guild, field, value)
    db.commit()
    db.refresh(guild)
    return _to_out(db, guild, user)


@router.get("/{guild_id}/members", response_model=list[MembershipOut])
def list_members(
    guild_id: int,
    db: Session = Depends(get_db),
    membership: GuildMembership = Depends(require_owner),
):
    memberships = db.query(GuildMembership).filter(GuildMembership.guild_id == guild_id).all()
    return [
        MembershipOut(id=m.id, user_id=m.user_id, username=m.user.username, discord_id=m.user.discord_id, role=m.role.value)
        for m in memberships
    ]


@router.post("/{guild_id}/members", response_model=MembershipOut)
def add_officer(
    guild_id: int,
    payload: MembershipCreate,
    db: Session = Depends(get_db),
    membership: GuildMembership = Depends(require_owner),
):
    target_user = db.query(User).filter(User.discord_id == payload.discord_id).first()
    if target_user is None:
        raise HTTPException(
            status_code=404,
            detail="No user with that Discord ID has logged into the site yet — ask them to log in first.",
        )
    existing = (
        db.query(GuildMembership)
        .filter(GuildMembership.guild_id == guild_id, GuildMembership.user_id == target_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="That user is already a member")

    new_membership = GuildMembership(guild_id=guild_id, user_id=target_user.id, role=MembershipRole.officer)
    db.add(new_membership)
    db.commit()
    db.refresh(new_membership)
    return MembershipOut(
        id=new_membership.id,
        user_id=target_user.id,
        username=target_user.username,
        discord_id=target_user.discord_id,
        role=new_membership.role.value,
    )


@router.delete("/{guild_id}/members/{membership_id}", status_code=204)
def remove_officer(
    guild_id: int,
    membership_id: int,
    db: Session = Depends(get_db),
    membership: GuildMembership = Depends(require_owner),
):
    target = db.get(GuildMembership, membership_id)
    if target is None or target.guild_id != guild_id:
        raise HTTPException(status_code=404, detail="Membership not found")
    if target.role == MembershipRole.owner:
        raise HTTPException(status_code=400, detail="Cannot remove the guild owner")
    db.delete(target)
    db.commit()
