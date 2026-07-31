from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import get_current_user, require_guild_role, require_officer
from app.db import get_db
from app.models.guild import GuildMembership
from app.models.raid import Encounter, RaidTier
from app.models.user import User
from app.schemas.raid import (
    EncounterCreate,
    EncounterOut,
    EncounterUpdate,
    RaidTierCreate,
    RaidTierOut,
    RaidTierUpdate,
)

router = APIRouter(tags=["raid-tiers"])


def _encounter_out(e: Encounter) -> EncounterOut:
    return EncounterOut(id=e.id, raid_tier_id=e.raid_tier_id, name=e.name, sort_order=e.sort_order)


def _tier_out(t: RaidTier) -> RaidTierOut:
    return RaidTierOut(
        id=t.id,
        guild_id=t.guild_id,
        name=t.name,
        zone=t.zone,
        is_active=t.is_active,
        sort_order=t.sort_order,
        encounters=[_encounter_out(e) for e in t.encounters],
    )


@router.get("/api/guilds/{guild_id}/raid-tiers", response_model=list[RaidTierOut])
def list_raid_tiers(guild_id: int, db: Session = Depends(get_db)):
    tiers = (
        db.query(RaidTier)
        .filter(RaidTier.guild_id == guild_id)
        .order_by(RaidTier.sort_order, RaidTier.id)
        .all()
    )
    return [_tier_out(t) for t in tiers]


@router.post("/api/guilds/{guild_id}/raid-tiers", response_model=RaidTierOut)
def create_raid_tier(
    guild_id: int,
    payload: RaidTierCreate,
    db: Session = Depends(get_db),
    membership: GuildMembership = Depends(require_officer),
):
    tier = RaidTier(guild_id=guild_id, name=payload.name, zone=payload.zone, sort_order=payload.sort_order)
    db.add(tier)
    db.commit()
    db.refresh(tier)
    return _tier_out(tier)


@router.patch("/api/raid-tiers/{tier_id}", response_model=RaidTierOut)
def update_raid_tier(
    tier_id: int,
    payload: RaidTierUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tier = db.get(RaidTier, tier_id)
    if tier is None:
        raise HTTPException(status_code=404, detail="Raid tier not found")
    require_guild_role(db, user, tier.guild_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tier, field, value)
    db.commit()
    db.refresh(tier)
    return _tier_out(tier)


@router.delete("/api/raid-tiers/{tier_id}", status_code=204)
def delete_raid_tier(
    tier_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tier = db.get(RaidTier, tier_id)
    if tier is None:
        raise HTTPException(status_code=404, detail="Raid tier not found")
    require_guild_role(db, user, tier.guild_id)
    db.delete(tier)
    db.commit()


@router.post("/api/raid-tiers/{tier_id}/encounters", response_model=EncounterOut)
def create_encounter(
    tier_id: int,
    payload: EncounterCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tier = db.get(RaidTier, tier_id)
    if tier is None:
        raise HTTPException(status_code=404, detail="Raid tier not found")
    require_guild_role(db, user, tier.guild_id)
    encounter = Encounter(raid_tier_id=tier_id, name=payload.name, sort_order=payload.sort_order)
    db.add(encounter)
    db.commit()
    db.refresh(encounter)
    return _encounter_out(encounter)


@router.patch("/api/encounters/{encounter_id}", response_model=EncounterOut)
def update_encounter(
    encounter_id: int,
    payload: EncounterUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    encounter = db.get(Encounter, encounter_id)
    if encounter is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    require_guild_role(db, user, encounter.raid_tier.guild_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(encounter, field, value)
    db.commit()
    db.refresh(encounter)
    return _encounter_out(encounter)


@router.delete("/api/encounters/{encounter_id}", status_code=204)
def delete_encounter(
    encounter_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    encounter = db.get(Encounter, encounter_id)
    if encounter is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    require_guild_role(db, user, encounter.raid_tier.guild_id)
    db.delete(encounter)
    db.commit()
