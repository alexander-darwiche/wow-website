import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.character import Character
    from app.models.guild import Guild
    from app.models.raid_helper import RaidHelperSignup


class RaidEventStatus(str, enum.Enum):
    planned = "planned"
    completed = "completed"
    cancelled = "cancelled"


class RaidTier(Base, TimestampMixin):
    """An officer-defined raid tier (e.g. 'Molten Core'). Not hardcoded, since
    Classic Fresh realm content phases change over time."""

    __tablename__ = "raid_tiers"

    id: Mapped[int] = mapped_column(primary_key=True)
    guild_id: Mapped[int] = mapped_column(ForeignKey("guilds.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    zone: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    guild: Mapped["Guild"] = relationship(back_populates="raid_tiers")
    encounters: Mapped[list["Encounter"]] = relationship(
        back_populates="raid_tier", cascade="all, delete-orphan", order_by="Encounter.sort_order"
    )
    raid_events: Mapped[list["RaidEvent"]] = relationship(back_populates="raid_tier")


class Encounter(Base, TimestampMixin):
    """A boss within a raid tier."""

    __tablename__ = "encounters"

    id: Mapped[int] = mapped_column(primary_key=True)
    raid_tier_id: Mapped[int] = mapped_column(ForeignKey("raid_tiers.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    raid_tier: Mapped["RaidTier"] = relationship(back_populates="encounters")
    notes: Mapped[list["EncounterNote"]] = relationship(
        back_populates="encounter", cascade="all, delete-orphan"
    )


class RaidEvent(Base, TimestampMixin):
    """A specific raid night, optionally linked to an imported Raid-Helper event."""

    __tablename__ = "raid_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    raid_tier_id: Mapped[int] = mapped_column(ForeignKey("raid_tiers.id"), nullable=False)
    guild_id: Mapped[int] = mapped_column(ForeignKey("guilds.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raid_helper_event_id: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    status: Mapped[RaidEventStatus] = mapped_column(
        Enum(RaidEventStatus), default=RaidEventStatus.planned, nullable=False
    )

    raid_tier: Mapped["RaidTier"] = relationship(back_populates="raid_events")
    guild: Mapped["Guild"] = relationship(back_populates="raid_events")
    assignments: Mapped[list["Assignment"]] = relationship(
        back_populates="raid_event", cascade="all, delete-orphan"
    )
    encounter_notes: Mapped[list["EncounterNote"]] = relationship(
        back_populates="raid_event", cascade="all, delete-orphan"
    )
    signups: Mapped[list["RaidHelperSignup"]] = relationship(
        back_populates="raid_event", cascade="all, delete-orphan"
    )


class Assignment(Base, TimestampMixin):
    """Which raid group (1-8, for up to 40-man) a character is placed in for a
    given raid night."""

    __tablename__ = "assignments"
    __table_args__ = (UniqueConstraint("raid_event_id", "character_id", name="uq_assignment_event_char"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    raid_event_id: Mapped[int] = mapped_column(ForeignKey("raid_events.id"), nullable=False)
    character_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), nullable=False)
    group_number: Mapped[int] = mapped_column(Integer, nullable=False)

    raid_event: Mapped["RaidEvent"] = relationship(back_populates="assignments")
    character: Mapped["Character"] = relationship(back_populates="assignments")


class EncounterNote(Base, TimestampMixin):
    """Free-form per-encounter notes for a raid night (tank targets, interrupt
    rotation, loot notes, etc)."""

    __tablename__ = "encounter_notes"
    __table_args__ = (
        UniqueConstraint("raid_event_id", "encounter_id", name="uq_note_event_encounter"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    raid_event_id: Mapped[int] = mapped_column(ForeignKey("raid_events.id"), nullable=False)
    encounter_id: Mapped[int] = mapped_column(ForeignKey("encounters.id"), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    raid_event: Mapped["RaidEvent"] = relationship(back_populates="encounter_notes")
    encounter: Mapped["Encounter"] = relationship(back_populates="notes")
