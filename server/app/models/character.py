import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, utcnow

if TYPE_CHECKING:
    from app.models.guild import Guild
    from app.models.raid import Assignment
    from app.models.raid_helper import RaidHelperSignup


class CharacterRole(str, enum.Enum):
    tank = "tank"
    healer = "healer"
    dps = "dps"


class GearSource(str, enum.Enum):
    wcl_report = "wcl_report"
    manual = "manual"


class Character(Base, TimestampMixin):
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(primary_key=True)
    guild_id: Mapped[int] = mapped_column(ForeignKey("guilds.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    class_name: Mapped[str] = mapped_column(String(32), nullable=False)
    spec: Mapped[str | None] = mapped_column(String(64), nullable=True)
    role: Mapped[CharacterRole | None] = mapped_column(Enum(CharacterRole), nullable=True)
    # Discord user ID of the player behind this character, used to match Raid-Helper signups.
    discord_user_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    guild: Mapped["Guild"] = relationship(back_populates="characters")
    gear_snapshots: Mapped[list["GearSnapshot"]] = relationship(
        back_populates="character", cascade="all, delete-orphan"
    )
    assignments: Mapped[list["Assignment"]] = relationship(
        back_populates="character", cascade="all, delete-orphan"
    )
    raid_helper_signups: Mapped[list["RaidHelperSignup"]] = relationship(back_populates="character")


class GearSnapshot(Base):
    """A point-in-time capture of a character's gear. History is kept (not
    overwritten) so an item-level trend can be shown later; 'latest gear' for a
    character is the row with the max captured_at."""

    __tablename__ = "gear_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    character_id: Mapped[int] = mapped_column(ForeignKey("characters.id"), nullable=False, index=True)
    source: Mapped[GearSource] = mapped_column(Enum(GearSource), nullable=False)
    source_report_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    avg_ilvl: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    # Same per-slot shape wcl_client.get_gear_data() returns for one player.
    gear_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    character: Mapped["Character"] = relationship(back_populates="gear_snapshots")
