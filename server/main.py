# my-backend/main.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pull_logs import summarize_zone_counts, get_guild_logs, get_fights, get_dps_data, get_healing_data, get_gear_data, get_wowsims_export, get_raid_pop
from collections import Counter
from typing import Optional, List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://wow-website.onrender.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def parse_fight_ids(fight_ids: Optional[str]) -> Optional[List[int]]:
    """Parse comma-separated fight IDs string into a list of ints."""
    if not fight_ids:
        return None
    return [int(x.strip()) for x in fight_ids.split(",") if x.strip()]

@app.get("/api/hello")
def read_root():
    return {"message": "Hello from FastAPI!"}


# @app.get("/api/zone-summary")
# def zone_summary():
#     return summarize_zone_counts()

# --- API Endpoint ---
@app.get("/api/zone-summary")
def get_zone_summary(guild: str = Query(...), server: str = Query(...), region: str = Query("US")):
    data = summarize_zone_counts(guild, server, region)
    return data

@app.get("/api/guild-logs")
def guild_logs(guild: str = Query(...), server: str = Query(...), region: str = Query("US")):
    return get_guild_logs(guild, server, region)

@app.get("/api/fights/{report_code}")
def fights_report(report_code: str):
    return get_fights(report_code)

@app.get("/api/dps/{report_code}")
def dps_report(report_code: str, fight_ids: Optional[str] = Query(None)):
    return get_dps_data(report_code, parse_fight_ids(fight_ids))

@app.get("/api/healing/{report_code}")
def healing_report(report_code: str, fight_ids: Optional[str] = Query(None)):
    return get_healing_data(report_code, parse_fight_ids(fight_ids))

@app.get("/api/gear/{report_code}")
def gear_report(report_code: str, fight_ids: Optional[str] = Query(None)):
    return get_gear_data(report_code, parse_fight_ids(fight_ids))

@app.get("/api/wowsims-export/{report_code}")
def wowsims_export(report_code: str, fight_ids: Optional[str] = Query(None)):
    return get_wowsims_export(report_code, parse_fight_ids(fight_ids))

@app.get("/api/raiding-population")
def get_raiding_population(server: str = Query(...), region: str = Query("US")):
    data = get_raid_pop()
    return data