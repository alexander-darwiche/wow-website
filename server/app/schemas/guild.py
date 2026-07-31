from pydantic import BaseModel


class GuildClaim(BaseModel):
    discord_guild_id: str
    name: str
    wcl_guild_name: str | None = None
    server_slug: str | None = None
    region: str = "US"


class GuildUpdate(BaseModel):
    name: str | None = None
    wcl_guild_name: str | None = None
    server_slug: str | None = None
    region: str | None = None
    raid_helper_api_key: str | None = None


class GuildOut(BaseModel):
    id: int
    name: str
    discord_guild_id: str
    wcl_guild_name: str | None
    server_slug: str | None
    region: str
    has_raid_helper_key: bool
    my_role: str | None = None


class MembershipCreate(BaseModel):
    discord_id: str


class MembershipOut(BaseModel):
    id: int
    user_id: int
    username: str
    discord_id: str
    role: str
