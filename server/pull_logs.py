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


def fetch_dps_table(token, report_code):
    headers = {"Authorization": f"Bearer {token}"}
    query = f"""
    {{
      reportData {{
        report(code: "{report_code}") {{
          table(dataType: DamageDone, startTime: 0, endTime: 100000000)
        }}
      }}
    }}
    """

    response = requests.post(GRAPHQL_ENDPOINT, json={"query": query}, headers=headers)
    response.raise_for_status()
    return response.json()


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


def get_dps_data(report_code):
    token = get_access_token()
    data = fetch_dps_table(token, report_code)
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


def get_gear_data(report_code):
    token = get_access_token()
    data = fetch_dps_table(token, report_code)
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
        # import pdb;pdb.set_trace() 

        result.append(player_data)

        import json

        # Assemble full player object
        player_json = {
            "player": {
                "class": "Class" + player['type'],
                "equipment": {
                    "items": items
                }
            }
        }
        # print(player_json)
        # print(json.dumps(player_json, indent=2))

    
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




