from typing import List, Optional

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from app.services import wcl_client

router = APIRouter(prefix="/api", tags=["logs"])


def parse_fight_ids(fight_ids: Optional[str]) -> Optional[List[int]]:
    """Parse comma-separated fight IDs string into a list of ints."""
    if not fight_ids:
        return None
    return [int(x.strip()) for x in fight_ids.split(",") if x.strip()]


@router.get("/hello")
def read_root():
    return {"message": "Hello from FastAPI!"}


@router.get("/zone-summary")
def get_zone_summary(guild: str = Query(...), server: str = Query(...), region: str = Query("US")):
    return wcl_client.summarize_zone_counts(guild, server, region)


@router.get("/guild-logs")
def guild_logs(guild: str = Query(...), server: str = Query(...), region: str = Query("US")):
    return wcl_client.get_guild_logs(guild, server, region)


@router.get("/fights/{report_code}")
def fights_report(report_code: str):
    return wcl_client.get_fights(report_code)


@router.get("/dps/{report_code}")
def dps_report(report_code: str, fight_ids: Optional[str] = Query(None)):
    return wcl_client.get_dps_data(report_code, parse_fight_ids(fight_ids))


@router.get("/healing/{report_code}")
def healing_report(report_code: str, fight_ids: Optional[str] = Query(None)):
    return wcl_client.get_healing_data(report_code, parse_fight_ids(fight_ids))


@router.get("/gear/{report_code}")
def gear_report(report_code: str, fight_ids: Optional[str] = Query(None)):
    return wcl_client.get_gear_data(report_code, parse_fight_ids(fight_ids))


@router.get("/wowsims-export/{report_code}")
def wowsims_export(report_code: str, fight_ids: Optional[str] = Query(None)):
    return wcl_client.get_wowsims_export(report_code, parse_fight_ids(fight_ids))


@router.get("/player-summary")
def player_summary(guild: str = Query(...), server: str = Query(...), player: str = Query(...), region: str = Query("US")):
    return wcl_client.get_player_summary(guild, server, region, player)


@router.get("/report-player/{report_code}")
def report_player(report_code: str, player: str = Query(...)):
    return wcl_client.get_report_player_summary(report_code, player)


@router.get("/compare/{report_code}")
def compare_report(
    report_code: str,
    fight_id: int = Query(...),
    player: str = Query(...),
    metric: str = Query("dps"),
):
    return wcl_client.get_compare_data(report_code, fight_id, player, metric)


@router.get("/raiding-population")
def get_raiding_population(server: str = Query(...), region: str = Query("US")):
    return wcl_client.get_raid_pop()


@router.post("/compare-summary")
async def compare_summary(request: Request):
    body = await request.json()
    return StreamingResponse(
        wcl_client.generate_compare_summary(body),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
