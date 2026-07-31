import enum
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.character import Character
    from app.models.raid import RaidEvent, RaidTier
    from app.models.user import User


class MembershipRole(str, enum.Enum):
    owner = "owner"
    officer = "officer"


class Guild(Base, TimestampMixin):
    """A managed Classic WoW guild using the hub. Distinct from the free-text
    guild/server the standalone log-lookup pages accept."""

    __tablename__ = "guilds"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    discord_guild_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)

    # WarcraftLogs identity used to pull logs/gear for this guild.
    wcl_guild_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    server_slug: Mapped[str | None] = mapped_column(String(255), nullable=True)
    region: Mapped[str] = mapped_column(String(8), default="US", nullable=False)

    # Per-guild Raid-Helper API key, generated in their Raid-Helper dashboard.
    # Never serialized back out in API responses.
    raid_helper_api_key: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_by: Mapped["User"] = relationship(back_populates="owned_guilds")

    memberships: Mapped[list["GuildMembership"]] = relationship(
        back_populates="guild", cascade="all, delete-orphan"
    )
    characters: Mapped[list["Character"]] = relationship(
        back_populates="guild", cascade="all, delete-orphan"
    )
    raid_tiers: Mapped[list["RaidTier"]] = relationship(
        back_populates="guild", cascade="all, delete-orphan"
    )
    raid_events: Mapped[list["RaidEvent"]] = relationship(
        back_populates="guild", cascade="all, delete-orphan"
    )


class GuildMembership(Base, TimestampMixin):
    __tablename__ = "guild_memberships"
    __table_args__ = (UniqueConstraint("guild_id", "user_id", name="uq_membership_guild_user"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    guild_id: Mapped[int] = mapped_column(ForeignKey("guilds.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[MembershipRole] = mapped_column(Enum(MembershipRole), nullable=False)

    guild: Mapped["Guild"] = relationship(back_populates="memberships")
    user: Mapped["User"] = relationship(back_populates="memberships")
