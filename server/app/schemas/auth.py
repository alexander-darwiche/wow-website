from pydantic import BaseModel


class MembershipOut(BaseModel):
    guild_id: int
    guild_name: str
    role: str


class MeOut(BaseModel):
    id: int
    discord_id: str
    username: str
    avatar_hash: str | None
    memberships: list[MembershipOut]
