from datetime import datetime

from pydantic import BaseModel


class EncounterCreate(BaseModel):
    name: str
    sort_order: int = 0


class EncounterUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None


class EncounterOut(BaseModel):
    id: int
    raid_tier_id: int
    name: str
    sort_order: int


class RaidTierCreate(BaseModel):
    name: str
    zone: str | None = None
    sort_order: int = 0


class RaidTierUpdate(BaseModel):
    name: str | None = None
    zone: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class RaidTierOut(BaseModel):
    id: int
    guild_id: int
    name: str
    zone: str | None
    is_active: bool
    sort_order: int
    encounters: list[EncounterOut] = []


class RaidEventCreate(BaseModel):
    title: str
    scheduled_at: datetime | None = None


class RaidEventUpdate(BaseModel):
    title: str | None = None
    scheduled_at: datetime | None = None
    status: str | None = None


class RaidEventOut(BaseModel):
    id: int
    raid_tier_id: int
    guild_id: int
    title: str
    scheduled_at: datetime | None
    status: str
    raid_helper_event_id: str | None


class AssignmentIn(BaseModel):
    character_id: int
    group_number: int


class AssignmentsBulkIn(BaseModel):
    assignments: list[AssignmentIn]


class AssignmentOut(BaseModel):
    id: int
    character_id: int
    group_number: int


class EncounterNoteIn(BaseModel):
    notes: str | None = None


class EncounterNoteOut(BaseModel):
    encounter_id: int
    notes: str | None


class RaidEventDetailOut(RaidEventOut):
    assignments: list[AssignmentOut] = []
    encounter_notes: list[EncounterNoteOut] = []
