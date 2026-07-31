import json
import os
import time
from collections import Counter

import requests
from openai import OpenAI
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.config import get_settings

# ---- Configuration ----
GRAPHQL_ENDPOINT = "https://fresh.warcraftlogs.com/api/v2/client"
TOKEN_URL = "https://fresh.warcraftlogs.com/oauth/token"


def _get_session():
    """Create a requests Session with retry logic for transient SSL/connection errors."""
    session = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST", "GET"],
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def _graphql_post(headers, query):
    """Make a GraphQL POST request with retry logic."""
    session = _get_session()
    response = session.post(GRAPHQL_ENDPOINT, json={"query": query}, headers=headers)
    response.raise_for_status()
    return response.json()


def get_access_token():
    settings = get_settings()
    r = requests.post(
        TOKEN_URL,
        data={"grant_type": "client_credentials"},
        auth=(settings.wcl_client_id, settings.wcl_client_secret),
    )
    r.raise_for_status()
    return r.json()["access_token"]


def fetch_all_logs(token, guild, server, region, limit=100):
    headers = {"Authorization": f"Bearer {token}"}
    query = f"""
    {{
      reportData {{
        reports(guildName: "{guild}", guildServerSlug: "{server}", guildServerRegion: "{region}", limit: {limit}) {{
          data {{
            code
            title
            startTime
            zone {{
              name
            }}
            owner {{
              name
            }}
          }}
        }}
      }}
    }}
    """
    response = requests.post(GRAPHQL_ENDPOINT, json={"query": query}, headers=headers)
    response.raise_for_status()
    return response.json()


def summarize_zone_counts(guild_name, server_slug, region="US"):
    token = get_access_token()
    data = fetch_all_logs(token, guild_name, server_slug, region)

    reports = data["data"]["reportData"]["reports"]["data"]
    zone_counter = Counter(
        report["zone"]["name"] for report in reports if report.get("zone")
    )

    return dict(zone_counter)


def get_guild_logs(guild, server, region="US"):
    token = get_access_token()
    data = fetch_all_logs(token, guild, server, region)
    reports = data["data"]["reportData"]["reports"]["data"]

    result = []
    for report in reports:
        zone_name = report["zone"]["name"] if report.get("zone") else "Unknown"
        result.append({
            "code": report["code"],
            "title": report["title"],
            "zone": zone_name,
            "owner": report["owner"]["name"] if report.get("owner") else "Unknown",
            "startTime": report.get("startTime", 0),
        })

    # Sort by startTime descending (most recent first)
    result.sort(key=lambda r: r["startTime"], reverse=True)
    return result


def fetch_table(token, report_code, data_type="DamageDone", fight_ids=None):
    headers = {"Authorization": f"Bearer {token}"}
    if fight_ids:
        ids_str = ", ".join(str(fid) for fid in fight_ids)
        fight_filter = f"fightIDs: [{ids_str}],"
    else:
        fight_filter = ""
    query = f"""
    {{
      reportData {{
        report(code: "{report_code}") {{
          table(dataType: {data_type}, {fight_filter} startTime: 0, endTime: 100000000)
        }}
      }}
    }}
    """

    response = requests.post(GRAPHQL_ENDPOINT, json={"query": query}, headers=headers)
    response.raise_for_status()
    return response.json()


def fetch_dps_table(token, report_code, fight_ids=None):
    return fetch_table(token, report_code, "DamageDone", fight_ids)


def fetch_fights(token, report_code):
    headers = {"Authorization": f"Bearer {token}"}
    query = f"""
    {{
      reportData {{
        report(code: "{report_code}") {{
          fights {{
            id
            name
            encounterID
            endTime
            startTime
            bossPercentage
            kill
          }}
        }}
      }}
    }}
    """
    response = requests.post(GRAPHQL_ENDPOINT, json={"query": query}, headers=headers)
    response.raise_for_status()
    return response.json()


def get_fights(report_code):
    token = get_access_token()
    data = fetch_fights(token, report_code)
    fights = data["data"]["reportData"]["report"]["fights"]

    result = []
    for fight in fights:
        encounter_id = fight.get("encounterID", 0)
        if encounter_id == 0:
            continue
        start = fight.get("startTime", 0)
        end = fight.get("endTime", 0)
        boss_pct = fight.get("bossPercentage", None)
        result.append({
            "id": fight["id"],
            "name": fight.get("name", "Unknown"),
            "duration": round((end - start) / 1000, 1),
            "kill": boss_pct == 0 if boss_pct is not None else fight.get("kill"),
            "bossPercentage": boss_pct,
        })
    return result


def get_dps_data(report_code, fight_ids=None):
    token = get_access_token()
    data = fetch_dps_table(token, report_code, fight_ids)
    entries = data["data"]["reportData"]["report"]["table"]["data"]["entries"]

    result = []
    for entry in entries:
        total = entry.get("total", 0)
        active_time = entry.get("activeTime", 1)
        dps = round(total / active_time * 1000, 2) if active_time else 0
        icon = entry.get("icon", "")
        result.append({
            "name": entry.get("name", "Unknown"),
            "class": entry.get("type", "Unknown"),
            "spec": icon.split("-")[-1] if "-" in icon else "",
            "total": total,
            "dps": dps,
        })
    result.sort(key=lambda r: r["dps"], reverse=True)
    return result


def get_healing_data(report_code, fight_ids=None):
    token = get_access_token()
    data = fetch_table(token, report_code, "Healing", fight_ids)
    entries = data["data"]["reportData"]["report"]["table"]["data"]["entries"]

    result = []
    for entry in entries:
        total = entry.get("total", 0)
        active_time = entry.get("activeTime", 1)
        hps = round(total / active_time * 1000, 2) if active_time else 0
        icon = entry.get("icon", "")
        result.append({
            "name": entry.get("name", "Unknown"),
            "class": entry.get("type", "Unknown"),
            "spec": icon.split("-")[-1] if "-" in icon else "",
            "total": total,
            "hps": hps,
        })
    result.sort(key=lambda r: r["hps"], reverse=True)
    return result


def get_gear_data(report_code, fight_ids=None):
    token = get_access_token()
    data = fetch_dps_table(token, report_code, fight_ids)
    players = data["data"]["reportData"]["report"]["table"]["data"]["entries"]

    result = []
    for player in players:
        name = player["name"]
        gear = player["gear"]

        player_class = player.get("type", "Unknown")
        player_icon = player.get("icon", "")
        player_spec = player_icon.split("-")[-1] if "-" in player_icon else ""

        # Initialize an entry for this player
        player_data = {
            "name": name,
            "className": player_class,
            "spec": player_spec,
        }

        first_item = [0]*20
        count, total_ilvl = 0, 0
        # Loop over the gear pieces and add each one as a separate column
        items = []
        for idx, piece in enumerate(gear):
          gear_name = piece.get('name', 'Empty')#piece['name']
          slot = piece['slot']

          try:
            if first_item[slot] == 0:
              ilvl = piece.get('itemLevel', '0')  # Assuming 'ilvl' is a key in 'piece', default to 'N/A' if missing
              if ilvl not in (1,0) and slot not in (3,18):
                total_ilvl = total_ilvl + int(ilvl)
                count = count + 1
              player_data[f"gear_{slot}_name"] = gear_name
              player_data[f"gear_{slot}_id"] = piece.get('id', 0)
              player_data[f"gear_{slot}_slot"] = slot
              player_data[f"gear_{slot}_ilvl"] = ilvl
              player_data[f"gear_{slot}_perm_enchant"] = piece.get('permanentEnchantName', '')
              player_data[f"gear_{slot}_temp_enchant"] = piece.get('temporaryEnchantName', '')
              gear_data = {
                  "id": piece.get('id', 'Empty'),
                  **({"enchant": enchant} if (enchant := piece.get('permanentEnchant', '')) else {}),
                  # **({"rune": rune} if (rune := piece.get('temporaryEnchant', '')) else {}),
              }
              if gear_data["id"] != 0:
                items.append(gear_data)

            first_item[slot] = first_item[slot] + 1
          except Exception:
              import traceback
              traceback.print_exc()
        player_data["total_ilvl"] = round(total_ilvl / max(1, count), 2)

        result.append(player_data)

    return result


def _extract_gear_display(gear_raw):
    """Turn a report table entry's raw `gear` list into the deduped,
    slot-sorted {slot, id, name, ilvl, enchant, quality} shape used by the
    GearSheet UI component (ui/src/components/GearSheet.js) and stored as
    GearSnapshot.gear_json."""
    gear_display = []
    seen_slots = set()
    for piece in gear_raw:
        slot = piece.get("slot")
        item_id = piece.get("id", 0)
        if slot is None or item_id == 0 or slot in seen_slots:
            continue
        seen_slots.add(slot)
        gear_display.append({
            "slot": slot,
            "id": item_id,
            "name": piece.get("name", "Empty"),
            "ilvl": piece.get("itemLevel", 0),
            "enchant": piece.get("permanentEnchantName", ""),
            "quality": piece.get("quality", 0),
        })
    gear_display.sort(key=lambda x: x["slot"])
    return gear_display


def _avg_ilvl(gear_display):
    # Exclude shirt (3) and tabard (18) slots from the average.
    ilvl_items = [g for g in gear_display if g["slot"] not in (3, 18) and g["ilvl"] not in (0, 1)]
    return round(sum(g["ilvl"] for g in ilvl_items) / max(1, len(ilvl_items)), 1)


def get_gear_display_for_report(report_code, fight_ids=None):
    """Return every player's gear (in the GearSheet-ready array shape) from
    one report — used by the roster gear-tracking refresh."""
    token = get_access_token()
    data = fetch_dps_table(token, report_code, fight_ids)
    players = data["data"]["reportData"]["report"]["table"]["data"]["entries"]

    result = []
    for player in players:
        gear_display = _extract_gear_display(player.get("gear", []))
        player_icon = player.get("icon", "")
        result.append({
            "name": player.get("name", "Unknown"),
            "className": player.get("type", "Unknown"),
            "spec": player_icon.split("-")[-1] if "-" in player_icon else "",
            "avgIlvl": _avg_ilvl(gear_display),
            "gearDisplay": gear_display,
        })
    return result


CLASS_ID_MAP = {
    "Warrior": 1, "Paladin": 2, "Hunter": 3, "Rogue": 4,
    "Priest": 5, "DeathKnight": 6, "Shaman": 7, "Mage": 8,
    "Warlock": 9, "Monk": 10, "Druid": 11,
}

def get_wowsims_export(report_code, fight_ids=None):
    """Return per-player gear in WoWSims addon-import JSON format."""
    token = get_access_token()
    data = fetch_dps_table(token, report_code, fight_ids)
    players = data["data"]["reportData"]["report"]["table"]["data"]["entries"]

    result = []
    for player in players:
        name = player.get("name", "Unknown")
        player_class = player.get("type", "Unknown")
        player_icon = player.get("icon", "")
        gear_raw = player.get("gear", [])

        items = []
        seen_slots = set()
        for piece in gear_raw:
            slot = piece.get("slot")
            item_id = piece.get("id", 0)
            if slot is None or item_id == 0 or slot in seen_slots:
                continue
            seen_slots.add(slot)

            item = {"slot": slot, "id": item_id}
            enchant = piece.get("permanentEnchant")
            if enchant:
                item["enchant"] = enchant
            gems_raw = piece.get("gems", [])
            if gems_raw:
                gem_ids = [g.get("id") for g in gems_raw if g.get("id")]
                if gem_ids:
                    item["gems"] = gem_ids
            items.append(item)

        # Sort items by slot for readability
        items.sort(key=lambda x: x["slot"])

        result.append({
            "name": name,
            "class": CLASS_ID_MAP.get(player_class, 0),
            "className": player_class,
            "spec": player_icon.split("-")[-1] if "-" in player_icon else "",
            "gear": items,
        })

    return result


def get_all_logs(token, limit=100, page_number=1, start_time=0):
    headers = {"Authorization": f"Bearer {token}"}

    args = [f"page: {page_number}"]

    if start_time is not None:
        args.append(f"startTime: {start_time}")

    args_str = ", ".join(args)

    query = f"""
    {{
      reportData {{
        reports({args_str}) {{
          data {{
            code
            title
            startTime
            zone {{
              name
            }}
            owner {{
              name
            }}
          }}
        }}
      }}
    }}
    """

    response = requests.post(GRAPHQL_ENDPOINT, json={"query": query}, headers=headers)
    response.raise_for_status()
    return response.json()

def get_players_data(report_code):
    token = get_access_token()
    data = fetch_dps_table(token, report_code)
    players = data["data"]["reportData"]["report"]["table"]["data"]["entries"]
    names = [player['name'] for player in players]
    return names

def get_raid_pop():
    token = get_access_token()
    all_logs = []
    last_start_time = None

    while last_start_time is None or last_start_time > 174641280000:

      count = 0

      while count+1<25:
          response = get_all_logs(token, page_number=count+1, start_time=last_start_time)
          reports = response["data"]["reportData"]["reports"]["data"]
          old_reports = reports

          if not reports:
              break

          all_logs.extend(reports)
          count = count + 1
      # Use the startTime of the last report to paginate
      last_start_time = old_reports[-1]["startTime"]

    unique_players = []
    for log in all_logs:
      unique_players = set(unique_players)  # ensure it's a set
      unique_players.update(get_players_data(log["code"]))



    unique_raiders = len(unique_players)

    results_dict = {}
    results_dict['unique_raiders'] = unique_raiders

    return results_dict


def fetch_master_data(token, report_code):
    """Get player actor list to map names to sourceIDs."""
    headers = {"Authorization": f"Bearer {token}"}
    query = f"""
    {{
      reportData {{
        report(code: "{report_code}") {{
          masterData {{
            actors(type: "Player") {{
              id
              name
              type
              subType
            }}
          }}
        }}
      }}
    }}
    """
    return _graphql_post(headers, query)


def fetch_graph(token, report_code, fight_id, source_id=None, data_type="DamageDone"):
    """Fetch time-series graph data for a fight, optionally filtered to one player."""
    headers = {"Authorization": f"Bearer {token}"}
    source_filter = f"sourceID: {source_id}," if source_id else ""
    query = f"""
    {{
      reportData {{
        report(code: "{report_code}") {{
          graph(dataType: {data_type}, fightIDs: [{fight_id}], {source_filter} startTime: 0, endTime: 100000000000)
        }}
      }}
    }}
    """
    return _graphql_post(headers, query)


def fetch_rankings(token, encounter_id, class_name, spec_name, metric="dps"):
    """Fetch top character rankings for an encounter + class/spec."""
    headers = {"Authorization": f"Bearer {token}"}
    query = f"""
    {{
      worldData {{
        encounter(id: {encounter_id}) {{
          characterRankings(
            className: "{class_name}"
            specName: "{spec_name}"
            metric: {metric}
            page: 1
          )
        }}
      }}
    }}
    """
    return _graphql_post(headers, query)


def _extract_timeline(series_data, total_time=None):
    """Extract combined damage/healing over time from graph series data."""
    if not series_data:
        return []
    combined = {}
    for s in series_data:
        data = s.get("data", [])
        point_start = s.get("pointStart", 0)
        point_interval = s.get("pointInterval", 1000)
        for i, val in enumerate(data):
            # data can be [timestamp, value] pairs or bare values with pointInterval
            if isinstance(val, list):
                t = val[0]
                v = val[1]
            else:
                t = point_start + i * point_interval
                v = val
            # Convert time to seconds
            t_sec = round(t / 1000, 1)
            combined[t_sec] = combined.get(t_sec, 0) + v
    return [{"time": t, "value": round(combined[t], 1)} for t in sorted(combined)]


def fetch_player_abilities(token, report_code, fight_id, source_id, data_type="DamageDone"):
    """Fetch per-ability damage/healing breakdown for a specific player in a fight."""
    headers = {"Authorization": f"Bearer {token}"}
    query = f"""
    {{
      reportData {{
        report(code: "{report_code}") {{
          table(dataType: {data_type}, fightIDs: [{fight_id}], sourceID: {source_id}, startTime: 0, endTime: 100000000000)
        }}
      }}
    }}
    """
    return _graphql_post(headers, query)


def _extract_abilities(table_json):
    """Extract ability list from table response."""
    entries = table_json["data"]["reportData"]["report"]["table"]["data"]["entries"]
    abilities = []
    for entry in entries:
        abilities.append({
            "name": entry.get("name", "Unknown"),
            "total": entry.get("total", 0),
            "uses": entry.get("uses", 0),
            "hitCount": entry.get("hitCount", 0),
            "tickCount": entry.get("tickCount", 0),
        })
    # Sort by total damage/healing descending
    abilities.sort(key=lambda a: a["total"], reverse=True)
    return abilities


def get_report_player_summary(report_code, player_name):
    """Get per-boss DPS breakdown for a single player within one report.
    No guild/server required — only the report code and player name."""
    token = get_access_token()

    # 1. Fetch fights
    fights_data = fetch_fights(token, report_code)
    all_fights = fights_data["data"]["reportData"]["report"]["fights"]
    boss_fights = [f for f in all_fights if f.get("encounterID", 0) != 0]

    if not boss_fights:
        return {"error": "No boss fights found in this report"}

    # 2. Get player class/spec from the overall table
    time.sleep(0.3)
    table_data = fetch_table(token, report_code, "DamageDone")
    entries = table_data["data"]["reportData"]["report"]["table"]["data"]["entries"]
    player_entry = next(
        (e for e in entries if e["name"].lower() == player_name.lower()), None
    )
    if not player_entry:
        return {"error": f"Player '{player_name}' not found in this report"}

    player_class = player_entry.get("type", "Unknown")
    player_icon = player_entry.get("icon", "")
    player_spec = player_icon.split("-")[-1] if "-" in player_icon else ""
    overall_total = player_entry.get("total", 0)
    overall_active = player_entry.get("activeTime", 1)
    overall_dps = round(overall_total / overall_active * 1000, 2) if overall_active else 0

    # 3. Per-boss breakdown
    bosses = []
    for fight in boss_fights:
        fight_id = fight["id"]
        fight_name = fight.get("name", "Unknown")
        start = fight.get("startTime", 0)
        end = fight.get("endTime", 0)
        duration_s = round((end - start) / 1000, 1)
        boss_pct = fight.get("bossPercentage", None)
        kill = boss_pct == 0 if boss_pct is not None else None

        time.sleep(0.3)
        try:
            boss_table = fetch_dps_table(token, report_code, [fight_id])
            boss_entries = boss_table["data"]["reportData"]["report"]["table"]["data"]["entries"]
            boss_player = next(
                (be for be in boss_entries if be["name"].lower() == player_name.lower()), None
            )
        except Exception:
            boss_player = None

        if boss_player:
            boss_total = boss_player.get("total", 0)
            boss_active = boss_player.get("activeTime", 1)
            boss_dps = round(boss_total / boss_active * 1000, 2) if boss_active else 0
        else:
            boss_total = 0
            boss_dps = 0

        bosses.append({
            "fightId": fight_id,
            "boss": fight_name,
            "duration": duration_s,
            "kill": kill,
            "bossPercentage": boss_pct,
            "dps": boss_dps,
            "damage": boss_total,
        })

    return {
        "player": player_name,
        "playerClass": player_class,
        "spec": player_spec,
        "reportCode": report_code,
        "overallDps": overall_dps,
        "bosses": bosses,
    }


def get_compare_data(report_code, fight_id, player_name, metric="dps"):
    """Compare a player's fight performance against the top-ranked parse."""
    token = get_access_token()
    # 1. Get fight info to find encounterID
    fights_data = fetch_fights(token, report_code)
    fights = fights_data["data"]["reportData"]["report"]["fights"]
    fight = next((f for f in fights if f["id"] == fight_id), None)
    if not fight:
        return {"error": "Fight not found"}
    encounter_id = fight.get("encounterID", 0)
    if encounter_id == 0:
        return {"error": "Cannot compare trash fights"}

    # 2. Get player class/spec from table data
    data_type = "DamageDone" if metric == "dps" else "Healing"
    time.sleep(0.5)
    table_data = fetch_table(token, report_code, data_type, [fight_id])
    entries = table_data["data"]["reportData"]["report"]["table"]["data"]["entries"]
    player_entry = next(
        (e for e in entries if e["name"].lower() == player_name.lower()), None
    )
    if not player_entry:
        return {"error": "Player not found in this fight"}

    player_class = player_entry.get("type", "Unknown")
    player_icon = player_entry.get("icon", "")
    player_spec = player_icon.split("-")[-1] if "-" in player_icon else ""
    player_total = player_entry.get("total", 0)
    player_active = player_entry.get("activeTime", 1)
    player_throughput = round(player_total / player_active * 1000, 2) if player_active else 0

    # 3. Get player's sourceID
    time.sleep(0.5)
    master_data = fetch_master_data(token, report_code)
    actors = master_data["data"]["reportData"]["report"]["masterData"]["actors"]
    player_actor = next(
        (a for a in actors if a["name"].lower() == player_name.lower()), None
    )
    if not player_actor:
        return {"error": "Player actor not found"}
    source_id = player_actor["id"]

    # 4. Fetch player's per-ability breakdown
    time.sleep(0.5)
    player_abilities_data = fetch_player_abilities(token, report_code, fight_id, source_id, data_type)
    player_abilities = _extract_abilities(player_abilities_data)

    # 5. Fetch top ranking for this encounter/class/spec
    time.sleep(0.5)
    try:
        rankings_data = fetch_rankings(token, encounter_id, player_class, player_spec, metric)
        rankings_json = rankings_data["data"]["worldData"]["encounter"]["characterRankings"]
        rankings = rankings_json.get("rankings", [])
    except Exception as e:
        return {"error": f"Failed to fetch rankings: {str(e)}"}

    if not rankings:
        return {"error": f"No rankings found for {player_class} {player_spec} on this encounter"}

    top_rank = rankings[0]
    top_report_code = top_rank["report"]["code"]
    top_fight_id = top_rank["report"]["fightID"]
    top_player_name = top_rank["name"]
    top_amount = top_rank.get("amount", 0)
    top_duration = round(top_rank.get("duration", 0) / 1000, 1)

    # 6. Get top player's sourceID
    time.sleep(0.5)
    top_master = fetch_master_data(token, top_report_code)
    top_actors = top_master["data"]["reportData"]["report"]["masterData"]["actors"]
    top_actor = next(
        (a for a in top_actors if a["name"].lower() == top_player_name.lower()), None
    )
    if not top_actor:
        return {"error": f"Top player '{top_player_name}' actor not found in their log"}
    top_source_id = top_actor["id"]

    # 7. Fetch top player's per-ability breakdown
    time.sleep(0.5)
    top_abilities_data = fetch_player_abilities(token, top_report_code, top_fight_id, top_source_id, data_type)
    top_abilities = _extract_abilities(top_abilities_data)

    # 8. Compute fight durations
    player_duration = round((fight["endTime"] - fight["startTime"]) / 1000, 1)

    return {
        "encounterName": fight.get("name", "Unknown"),
        "encounterID": encounter_id,
        "metric": metric,
        "player": {
            "name": player_name,
            "class": player_class,
            "spec": player_spec,
            "throughput": player_throughput,
            "total": player_total,
            "duration": player_duration,
            "abilities": player_abilities,
        },
        "top": {
            "name": top_player_name,
            "throughput": round(top_amount, 2),
            "total": sum(a["total"] for a in top_abilities),
            "duration": top_duration,
            "reportCode": top_report_code,
            "fightId": top_fight_id,
            "abilities": top_abilities,
        },
    }


def get_player_summary(guild, server, region, player_name):
    """Get per-log + per-boss DPS for a specific player across guild logs."""
    token = get_access_token()
    data = fetch_all_logs(token, guild, server, region)
    reports = data["data"]["reportData"]["reports"]["data"]

    result = []
    latest_export = None

    for report in reports:
        code = report["code"]
        title = report["title"]
        zone_name = report["zone"]["name"] if report.get("zone") else "Unknown"

        # Fetch overall DPS to check if player is in this log
        try:
            dps_data = fetch_dps_table(token, code)
            entries = dps_data["data"]["reportData"]["report"]["table"]["data"]["entries"]
        except Exception:
            continue

        player_entry = None
        for entry in entries:
            if entry["name"].lower() == player_name.lower():
                player_entry = entry
                break

        if not player_entry:
            continue

        overall_dps = round(player_entry["total"] / player_entry["activeTime"] * 1000, 2) if player_entry.get("activeTime") else 0
        player_class = player_entry.get("type", "Unknown")
        player_icon = player_entry.get("icon", "")

        # Fetch fights for per-boss breakdown
        try:
            fights_data = fetch_fights(token, code)
            fights = fights_data["data"]["reportData"]["report"]["fights"]
        except Exception:
            fights = []

        boss_fights = []
        for fight in fights:
            encounter_id = fight.get("encounterID", 0)
            if encounter_id == 0:
                continue
            fight_id = fight["id"]
            fight_name = fight.get("name", "Unknown")
            start = fight.get("startTime", 0)
            end = fight.get("endTime", 0)
            duration_s = round((end - start) / 1000, 1)
            boss_pct = fight.get("bossPercentage", None)
            kill = boss_pct == 0 if boss_pct is not None else None

            # Per-boss DPS for this player
            try:
                boss_dps_data = fetch_dps_table(token, code, [fight_id])
                boss_entries = boss_dps_data["data"]["reportData"]["report"]["table"]["data"]["entries"]
                boss_player = None
                for be in boss_entries:
                    if be["name"].lower() == player_name.lower():
                        boss_player = be
                        break
            except Exception:
                boss_player = None

            if boss_player:
                boss_dps = round(boss_player["total"] / boss_player["activeTime"] * 1000, 2) if boss_player.get("activeTime") else 0
                boss_damage = boss_player["total"]
            else:
                boss_dps = 0
                boss_damage = 0

            boss_fights.append({
                "fightId": fight_id,
                "boss": fight_name,
                "duration": duration_s,
                "kill": kill,
                "dps": boss_dps,
                "damage": boss_damage,
            })

        # Build gear export from this log (first log where player appears = most recent)
        if latest_export is None:
            gear_raw = player_entry.get("gear", [])
            items = []
            seen_slots = set()
            for piece in gear_raw:
                slot = piece.get("slot")
                item_id = piece.get("id", 0)
                if slot is None or item_id == 0 or slot in seen_slots:
                    continue
                seen_slots.add(slot)
                item = {"slot": slot, "id": item_id}
                enchant = piece.get("permanentEnchant")
                if enchant:
                    item["enchant"] = enchant
                gems_raw = piece.get("gems", [])
                if gems_raw:
                    gem_ids = [g.get("id") for g in gems_raw if g.get("id")]
                    if gem_ids:
                        item["gems"] = gem_ids
                items.append(item)
            items.sort(key=lambda x: x["slot"])

            gear_display = _extract_gear_display(gear_raw)
            avg_ilvl = _avg_ilvl(gear_display)

            latest_export = {
                "name": player_entry["name"],
                "class": CLASS_ID_MAP.get(player_class, 0),
                "className": player_class,
                "spec": player_icon.split("-")[-1] if "-" in player_icon else "",
                "gear": items,
                "gearDisplay": gear_display,
                "avgIlvl": avg_ilvl,
            }

        result.append({
            "reportCode": code,
            "title": title,
            "zone": zone_name,
            "overallDps": overall_dps,
            "bosses": boss_fights,
        })

    return {
        "player": player_name,
        "playerClass": latest_export.get("className") if latest_export else None,
        "spec": latest_export.get("spec") if latest_export else None,
        "export": latest_export,
        "logs": result,
    }


def generate_compare_summary(compare_data):
    """Stream an LLM-generated rotation analysis comparing a player to the #1 parse via local Ollama."""
    settings = get_settings()
    ollama_url = settings.ollama_url
    model = settings.ollama_model

    player = compare_data.get("player", {})
    top = compare_data.get("top", {})
    encounter = compare_data.get("encounterName", "Unknown")
    metric = compare_data.get("metric", "dps")
    metric_label = "DPS" if metric == "dps" else "HPS"

    def fmt_abilities(abilities):
        lines = []
        for a in abilities:
            uses = a.get("uses", 0)
            hits = a.get("hitCount", 0) + a.get("tickCount", 0)
            lines.append(
                f"  - {a['name']}: total={a['total']}, casts={uses}, hits={hits}"
            )
        return "\n".join(lines) if lines else "  (none)"

    prompt = f"""You are an expert World of Warcraft Classic combat log analyst.

A player wants to know why their {metric_label} is lower than the rank-1 player for the same boss, class, and spec. Analyze the ability breakdowns below and provide specific, actionable rotation advice.

Boss: {encounter}
Class / Spec: {player.get('class', '?')} — {player.get('spec', '?')}

=== PLAYER ({player.get('name', '?')}) ===
{metric_label}: {player.get('throughput', 0):.1f}
Total damage: {player.get('total', 0)}
Fight duration: {player.get('duration', 0)}s
Abilities:
{fmt_abilities(player.get('abilities', []))}

=== #1 RANKED ({top.get('name', '?')}) ===
{metric_label}: {top.get('throughput', 0):.1f}
Total damage: {top.get('total', 0)}
Fight duration: {top.get('duration', 0)}s
Abilities:
{fmt_abilities(top.get('abilities', []))}

Instructions:
1. Identify the biggest damage/healing gaps ability-by-ability.
2. Note differences in cast counts — are they casting key abilities more often?
3. Highlight abilities the #1 player uses that the player does not (or vice versa).
4. Consider fight-duration differences and their impact on throughput.
5. Give 3-5 concise, prioritized tips the player can act on immediately.

Be specific — reference actual ability names, numbers, and cast counts. Keep the response focused and under 400 words. Use markdown formatting with headers and bullet points."""

    client = OpenAI(base_url=f"{ollama_url}/v1", api_key="ollama")
    try:
        stream = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            max_tokens=800,
            temperature=0.4,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield f"data: {json.dumps({'content': delta.content})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': f'Failed to connect to Ollama at {ollama_url}. Is it running? Error: {str(e)}'})}\n\n"
