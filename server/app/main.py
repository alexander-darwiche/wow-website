from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, characters, gear, guilds, logs, raid_events, raid_tiers

settings = get_settings()

app = FastAPI(title="Raidlytics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(logs.router)
app.include_router(auth.router)
app.include_router(guilds.router)
app.include_router(characters.router)
app.include_router(gear.router)
app.include_router(raid_tiers.router)
app.include_router(raid_events.router)
