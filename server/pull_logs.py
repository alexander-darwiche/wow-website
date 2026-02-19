import requests
from collections import Counter

# ---- Configuration ----
CLIENT_ID = "9eda1388-3586-4fef-9d23-f4878704f24e"
CLIENT_SECRET = "2hb8IyvWlQqz3rtwjr2xW6jDzg0czpHQXRGKHLRP"

GUILD_NAME = "sanctuary"
SERVER_SLUG = "living-flame"
REGION = "US"
GRAPHQL_ENDPOINT = "https://fresh.warcraftlogs.com/api/v2/client"
TOKEN_URL = "https://fresh.warcraftlogs.com/oauth/token"


def get_access_token():
    r = requests.post(
        TOKEN_URL,
        data={"grant_type": "client_credentials"},
        auth=(CLIENT_ID, CLIENT_SECRET)
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


def summarize_zone_counts(GUILD_NAME=GUILD_NAME, SERVER_SLUG=SERVER_SLUG, REGION=REGION):
    token = get_access_token()
    data = fetch_all_logs(token, GUILD_NAME, SERVER_SLUG, REGION)

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
        })

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
            difficulty
            averageItemLevel
            bossPercentage
            completeRaid
            fightPercentage
            boundingBox {{
              minX
              minY
              maxX
              maxY
            }}
            classicSeasonID
            enemyNPCs {{
              id
              instanceCount
              groupCount
            }}
            enemyPets {{
              id
              instanceCount
              groupCount
            }}
            enemyPlayers
            friendlyPlayers
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

    trash_ids = []
    trash_duration = 0
    bosses = []

    for fight in fights:
        encounter_id = fight.get("encounterID", 0)
        fight_id = fight["id"]
        start = fight.get("startTime", 0)
        end = fight.get("endTime", 0)
        duration_s = round((end - start) / 1000, 1)

        if encounter_id == 0:
            # Trash fight
            trash_ids.append(fight_id)
            trash_duration += duration_s
        else:
            # Boss fight
            name = fight.get("name", "Unknown")
            boss_pct = fight.get("bossPercentage", None)
            difficulty = fight.get("difficulty", None)
            kill = boss_pct == 0 if boss_pct is not None else None

            bosses.append({
                "ids": [fight_id],
                "name": name,
                "encounterID": encounter_id,
                "duration": duration_s,
                "kill": kill,
                "bossPercentage": boss_pct,
                "difficulty": difficulty,
                "isTrash": False,
            })

    result = []
    if trash_ids:
        result.append({
            "ids": trash_ids,
            "name": "Trash",
            "encounterID": 0,
            "duration": round(trash_duration, 1),
            "kill": None,
            "bossPercentage": None,
            "difficulty": None,
            "isTrash": True,
        })
    result.extend(bosses)

    return result


def get_dps_data(report_code, fight_ids=None):
    token = get_access_token()
    data = fetch_dps_table(token, report_code, fight_ids)
    players = data["data"]["reportData"]["report"]["table"]["data"]["entries"]

    result = []
    for player in players:
        name = player["name"]
        total = player["total"]
        time = player["activeTime"]

        dps = round(total / time * 1000, 2) if time else 0
        result.append({
            "name": name,
            "damage": total,
            "dps": dps
        })


    return result


def get_healing_data(report_code, fight_ids=None):
    token = get_access_token()
    data = fetch_table(token, report_code, "Healing", fight_ids)
    players = data["data"]["reportData"]["report"]["table"]["data"]["entries"]

    result = []
    for player in players:
        name = player["name"]
        total = player["total"]
        time = player["activeTime"]

        hps = round(total / time * 1000, 2) if time else 0
        result.append({
            "name": name,
            "healing": total,
            "hps": hps,
            "overheal": player.get("overheal", 0),
        })

    return result


def get_gear_data(report_code, fight_ids=None):
    token = get_access_token()
    data = fetch_dps_table(token, report_code, fight_ids)
    players = data["data"]["reportData"]["report"]["table"]["data"]["entries"]

    result = []
    for player in players:
        name = player["name"]
        gear = player["gear"]

        # Initialize an entry for this player
        player_data = {
            "name": name
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
              import pdb;pdb.set_trace()  
              import traceback
              traceback.print_exc()
        player_data["total_ilvl"] = round(total_ilvl / max(1, count), 2)

        result.append(player_data)

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


import requests

def get_all_logs(token, limit=100, page_number=1, start_time = 0):
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
          print(count)
          response = get_all_logs(token, page_number=count+1, start_time = last_start_time)
          try:
            reports = response["data"]["reportData"]["reports"]["data"]
            old_reports = reports
          except:
            import pdb;pdb.set_trace()
          
          if not reports:
              break

          all_logs.extend(reports)
          count = count + 1
      # Use the startTime of the last report to paginate
      try:
        last_start_time = old_reports[-1]["startTime"]
      except:
         import pdb;pdb.set_trace()

      from datetime import datetime, timezone
      import pytz

      # Your Unix timestamp in milliseconds
      timestamp_ms = last_start_time

      # Convert milliseconds to seconds
      timestamp_s = timestamp_ms / 1000

      # Create a datetime object in UTC
      dt_utc = datetime.fromtimestamp(timestamp_s, tz=timezone.utc)

      # Define the EST timezone (Eastern Time with daylight saving awareness)
      eastern = pytz.timezone('US/Eastern')

      # Convert to EST
      dt_est = dt_utc.astimezone(eastern)

      # Print both for comparison
      print("EST Time:", dt_est)
        
    unique_players = []
    for log in all_logs:
      unique_players = set(unique_players)  # ensure it's a set
      unique_players.update(get_players_data(log["code"]))


       
    unique_raiders = len(unique_players)
    
    results_dict = {}
    results_dict['unique_raiders'] = unique_raiders

    return results_dict




