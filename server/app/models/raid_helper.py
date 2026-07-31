from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.character import Character
    from app.models.raid import RaidEvent


class RaidHelperSignup(Base, TimestampMixin):
    """A cached copy of one Raid-Helper signup for an imported event, matched
    to a roster Character where possible."""

    __tablename__ = "raid_helper_signups"

    id: Mapped[int] = mapped_column(primary_key=True)
    raid_event_id: Mapped[int] = mapped_column(ForeignKey("raid_events.id"), nullable=False)
    raid_helper_signup_id: Mapped[str] = mapped_column(String(64), nullable=False)
    discord_user_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    discord_username: Mapped[str] = mapped_column(String(255), nullable=False)
    character_id: Mapped[int | None] = mapped_column(ForeignKey("characters.id"), nullable=True)
    class_spec: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    raw_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    raid_event: Mapped["RaidEvent"] = relationship(back_populates="signups")
    character: Mapped["Character | None"] = relationship(back_populates="raid_helper_signups")
