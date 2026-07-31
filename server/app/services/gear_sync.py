from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.character import Character, GearSnapshot, GearSource
from app.models.guild import Guild
from app.services import wcl_client


def refresh_guild_gear(guild: Guild, db: Session) -> dict:
    """Pull the guild's most recent WCL report and capture a GearSnapshot for
    every active roster character found in it. On-demand (officer-triggered),
    not a background job — keeps infra simple for the first pass."""
    if not guild.wcl_guild_name or not guild.server_slug:
        raise ValueError("This guild's WarcraftLogs guild name/server slug isn't set — configure it in Settings first.")

    logs = wcl_client.get_guild_logs(guild.wcl_guild_name, guild.server_slug, guild.region)
    active_characters = (
        db.query(Character)
        .filter(Character.guild_id == guild.id, Character.is_active.is_(True))
        .all()
    )

    if not logs:
        return {"matched": [], "unmatched_characters": [c.name for c in active_characters], "report_code": None}

    latest_report = logs[0]  # get_guild_logs() already sorts by startTime descending
    report_code = latest_report["code"]
    captured_at = datetime.fromtimestamp(latest_report["startTime"] / 1000, tz=timezone.utc)

    gear_entries = wcl_client.get_gear_display_for_report(report_code)
    by_name = {e["name"].lower(): e for e in gear_entries}

    matched = []
    for character in active_characters:
        entry = by_name.get(character.name.lower())
        if not entry or not entry["gearDisplay"]:
            continue
        db.add(
            GearSnapshot(
                character_id=character.id,
                source=GearSource.wcl_report,
                source_report_code=report_code,
                avg_ilvl=entry["avgIlvl"],
                gear_json={
                    "gearDisplay": entry["gearDisplay"],
                    "className": entry["className"],
                    "spec": entry["spec"],
                },
                captured_at=captured_at,
            )
        )
        matched.append(character.name)

    db.commit()
    matched_lower = {m.lower() for m in matched}
    unmatched = [c.name for c in active_characters if c.name.lower() not in matched_lower]
    return {"matched": matched, "unmatched_characters": unmatched, "report_code": report_code}
