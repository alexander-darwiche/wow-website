from datetime import datetime
from typing import Any

from pydantic import BaseModel


class GearSnapshotOut(BaseModel):
    id: int
    character_id: int
    source: str
    source_report_code: str | None
    avg_ilvl: float
    gear: dict[str, Any]
    captured_at: datetime


class CharacterGearOut(BaseModel):
    character_id: int
    name: str
    class_name: str
    spec: str | None
    latest: GearSnapshotOut | None


class ManualGearIn(BaseModel):
    avg_ilvl: float
    notes: str | None = None


class RefreshResult(BaseModel):
    matched: list[str]
    unmatched_characters: list[str]
    report_code: str | None = None
