from pydantic import BaseModel


class CharacterCreate(BaseModel):
    name: str
    class_name: str
    spec: str | None = None
    role: str | None = None
    discord_user_id: str | None = None
    notes: str | None = None


class CharacterUpdate(BaseModel):
    name: str | None = None
    class_name: str | None = None
    spec: str | None = None
    role: str | None = None
    discord_user_id: str | None = None
    is_active: bool | None = None
    notes: str | None = None


class CharacterOut(BaseModel):
    id: int
    guild_id: int
    name: str
    class_name: str
    spec: str | None
    role: str | None
    discord_user_id: str | None
    is_active: bool
    notes: str | None
