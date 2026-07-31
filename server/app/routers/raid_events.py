from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.security import get_current_user, require_guild_role
from app.db import get_db
from app.models.raid import Assignment, EncounterNote, RaidEvent, RaidEventStatus, RaidTier
from app.models.user import User
from app.schemas.raid import (
    AssignmentOut,
    AssignmentsBulkIn,
    EncounterNoteIn,
    EncounterNoteOut,
    RaidEventCreate,
    RaidEventDetailOut,
    RaidEventOut,
    RaidEventUpdate,
)

router = APIRouter(tags=["raid-events"])


def _event_out(e: RaidEvent) -> RaidEventOut:
    return RaidEventOut(
        id=e.id,
        raid_tier_id=e.raid_tier_id,
        guild_id=e.guild_id,
        title=e.title,
        scheduled_at=e.scheduled_at,
        status=e.status.value,
        raid_helper_event_id=e.raid_helper_event_id,
    )


def _event_detail_out(e: RaidEvent) -> RaidEventDetailOut:
    base = _event_out(e)
    return RaidEventDetailOut(
        **base.model_dump(),
        assignments=[AssignmentOut(id=a.id, character_id=a.character_id, group_number=a.group_number) for a in e.assignments],
        encounter_notes=[EncounterNoteOut(encounter_id=n.encounter_id, notes=n.notes) for n in e.encounter_notes],
    )


def _parse_status(status: str | None) -> RaidEventStatus | None:
    if status is None:
        return None
    try:
        return RaidEventStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status '{status}'")


@router.get("/api/raid-tiers/{tier_id}/events", response_model=list[RaidEventOut])
def list_raid_events(tier_id: int, db: Session = Depends(get_db)):
    events = (
        db.query(RaidEvent)
        .filter(RaidEvent.raid_tier_id == tier_id)
        .order_by(RaidEvent.scheduled_at.desc().nullslast(), RaidEvent.id.desc())
        .all()
    )
    return [_event_out(e) for e in events]


@router.post("/api/raid-tiers/{tier_id}/events", response_model=RaidEventOut)
def create_raid_event(
    tier_id: int,
    payload: RaidEventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tier = db.get(RaidTier, tier_id)
    if tier is None:
        raise HTTPException(status_code=404, detail="Raid tier not found")
    require_guild_role(db, user, tier.guild_id)

    event = RaidEvent(
        raid_tier_id=tier_id,
        guild_id=tier.guild_id,
        title=payload.title,
        scheduled_at=payload.scheduled_at,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return _event_out(event)


@router.get("/api/raid-events/{event_id}", response_model=RaidEventDetailOut)
def get_raid_event(event_id: int, db: Session = Depends(get_db)):
    event = db.get(RaidEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Raid event not found")
    return _event_detail_out(event)


@router.patch("/api/raid-events/{event_id}", response_model=RaidEventOut)
def update_raid_event(
    event_id: int,
    payload: RaidEventUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = db.get(RaidEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Raid event not found")
    require_guild_role(db, user, event.guild_id)

    data = payload.model_dump(exclude_unset=True)
    if "status" in data:
        event.status = _parse_status(data.pop("status"))
    for field, value in data.items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return _event_out(event)


@router.delete("/api/raid-events/{event_id}", status_code=204)
def delete_raid_event(
    event_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = db.get(RaidEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Raid event not found")
    require_guild_role(db, user, event.guild_id)
    db.delete(event)
    db.commit()


@router.put("/api/raid-events/{event_id}/assignments", response_model=list[AssignmentOut])
def set_assignments(
    event_id: int,
    payload: AssignmentsBulkIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = db.get(RaidEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Raid event not found")
    require_guild_role(db, user, event.guild_id)

    db.query(Assignment).filter(Assignment.raid_event_id == event_id).delete()
    new_assignments = [
        Assignment(raid_event_id=event_id, character_id=a.character_id, group_number=a.group_number)
        for a in payload.assignments
    ]
    db.add_all(new_assignments)
    db.commit()
    for a in new_assignments:
        db.refresh(a)
    return [AssignmentOut(id=a.id, character_id=a.character_id, group_number=a.group_number) for a in new_assignments]


@router.put("/api/raid-events/{event_id}/encounter-notes/{encounter_id}", response_model=EncounterNoteOut)
def set_encounter_note(
    event_id: int,
    encounter_id: int,
    payload: EncounterNoteIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = db.get(RaidEvent, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Raid event not found")
    require_guild_role(db, user, event.guild_id)

    note = (
        db.query(EncounterNote)
        .filter(EncounterNote.raid_event_id == event_id, EncounterNote.encounter_id == encounter_id)
        .first()
    )
    if note is None:
        note = EncounterNote(raid_event_id=event_id, encounter_id=encounter_id, notes=payload.notes)
        db.add(note)
    else:
        note.notes = payload.notes
    db.commit()
    return EncounterNoteOut(encounter_id=encounter_id, notes=note.notes)
