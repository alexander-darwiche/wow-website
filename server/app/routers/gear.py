from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import get_current_user, require_guild_role, require_officer
from app.db import get_db
from app.models.character import Character, GearSnapshot, GearSource
from app.models.guild import Guild, GuildMembership
from app.models.user import User
from app.schemas.gear import CharacterGearOut, GearSnapshotOut, ManualGearIn, RefreshResult
from app.services.gear_sync import refresh_guild_gear

router = APIRouter(tags=["gear"])


def _snapshot_out(s: GearSnapshot) -> GearSnapshotOut:
    return GearSnapshotOut(
        id=s.id,
        character_id=s.character_id,
        source=s.source.value,
        source_report_code=s.source_report_code,
        avg_ilvl=s.avg_ilvl,
        gear=s.gear_json,
        captured_at=s.captured_at,
    )


def _latest_snapshot(db: Session, character_id: int) -> GearSnapshot | None:
    return (
        db.query(GearSnapshot)
        .filter(GearSnapshot.character_id == character_id)
        .order_by(GearSnapshot.captured_at.desc())
        .first()
    )


@router.post("/api/guilds/{guild_id}/gear/refresh", response_model=RefreshResult)
def refresh_gear(
    guild_id: int,
    db: Session = Depends(get_db),
    membership: GuildMembership = Depends(require_officer),
):
    guild = db.get(Guild, guild_id)
    if guild is None:
        raise HTTPException(status_code=404, detail="Guild not found")
    try:
        result = refresh_guild_gear(guild, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return RefreshResult(**result)


@router.get("/api/guilds/{guild_id}/gear", response_model=list[CharacterGearOut])
def guild_gear(guild_id: int, db: Session = Depends(get_db)):
    characters = (
        db.query(Character)
        .filter(Character.guild_id == guild_id, Character.is_active.is_(True))
        .order_by(Character.name)
        .all()
    )
    out = []
    for c in characters:
        latest = _latest_snapshot(db, c.id)
        out.append(
            CharacterGearOut(
                character_id=c.id,
                name=c.name,
                class_name=c.class_name,
                spec=c.spec,
                latest=_snapshot_out(latest) if latest else None,
            )
        )
    return out


@router.get("/api/characters/{character_id}/gear/latest", response_model=GearSnapshotOut | None)
def character_latest_gear(character_id: int, db: Session = Depends(get_db)):
    character = db.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    latest = _latest_snapshot(db, character_id)
    return _snapshot_out(latest) if latest else None


@router.get("/api/characters/{character_id}/gear/history", response_model=list[GearSnapshotOut])
def character_gear_history(character_id: int, db: Session = Depends(get_db)):
    character = db.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    snapshots = (
        db.query(GearSnapshot)
        .filter(GearSnapshot.character_id == character_id)
        .order_by(GearSnapshot.captured_at.desc())
        .all()
    )
    return [_snapshot_out(s) for s in snapshots]


@router.post("/api/characters/{character_id}/gear", response_model=GearSnapshotOut)
def set_manual_gear(
    character_id: int,
    payload: ManualGearIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    character = db.get(Character, character_id)
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    require_guild_role(db, user, character.guild_id)

    snapshot = GearSnapshot(
        character_id=character.id,
        source=GearSource.manual,
        source_report_code=None,
        avg_ilvl=payload.avg_ilvl,
        gear_json={
            "gearDisplay": [],
            "className": character.class_name,
            "spec": character.spec,
            "manualNotes": payload.notes,
        },
        captured_at=datetime.now(timezone.utc),
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return _snapshot_out(snapshot)
