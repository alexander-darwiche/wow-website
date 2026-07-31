from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.security import require_guild_role, get_current_user
from app.auth.security import require_officer
from app.db import get_db
from app.models.character import Character, CharacterRole
from app.models.guild import GuildMembership
from app.models.user import User
from app.schemas.character import CharacterCreate, CharacterOut, CharacterUpdate

router = APIRouter(tags=["characters"])


def _to_out(c: Character) -> CharacterOut:
    return CharacterOut(
        id=c.id,
        guild_id=c.guild_id,
        name=c.name,
        class_name=c.class_name,
        spec=c.spec,
        role=c.role.value if c.role else None,
        discord_user_id=c.discord_user_id,
        is_active=c.is_active,
        notes=c.notes,
    )


def _parse_role(role: str | None) -> CharacterRole | None:
    if role is None:
        return None
    try:
        return CharacterRole(role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role '{role}' (expected tank/healer/dps)")


@router.get("/api/guilds/{guild_id}/characters", response_model=list[CharacterOut])
def list_characters(
    guild_id: int,
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
):
    query = db.query(Character).filter(Character.guild_id == guild_id)
    if not include_inactive:
        query = query.filter(Character.is_active.is_(True))
    characters = query.order_by(Character.name).all()
    return [_to_out(c) for c in characters]


@router.post("/api/guilds/{guild_id}/characters", response_model=CharacterOut)
def create_character(
    guild_id: int,
    payload: CharacterCreate,
    db: Session = Depends(get_db),
    membership: GuildMembership = Depends(require_officer),
):
    character = Character(
        guild_id=guild_id,
        name=payload.name,
        class_name=payload.class_name,
        spec=payload.spec,
        role=_parse_role(payload.role),
        discord_user_id=payload.discord_user_id,
        notes=payload.notes,
    )
    db.add(character)
    db.commit()
    db.refresh(character)
    return _to_out(character)


@router.patch("/api/characters/{character_id}", response_model=CharacterOut)
def update_character(
    character_id: int,
    payload: CharacterUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    character = db.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    require_guild_role(db, user, character.guild_id)

    data = payload.model_dump(exclude_unset=True)
    if "role" in data:
        character.role = _parse_role(data.pop("role"))
    for field, value in data.items():
        setattr(character, field, value)

    db.commit()
    db.refresh(character)
    return _to_out(character)


@router.delete("/api/characters/{character_id}", status_code=204)
def delete_character(
    character_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    character = db.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    require_guild_role(db, user, character.guild_id)
    db.delete(character)
    db.commit()
