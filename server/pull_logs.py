import requests
from collections import Counter

# ---- Configuration ----
CLIENT_ID = "9eda1388-3586-4fef-9d23-f4878704f24e"
CLIENT_SECRET = "2hb8IyvWlQqz3rtwjr2xW6jDzg0czpHQXRGKHLRP"

GUILD_NAME = "sanctuary"
SERVER_SLUG = "living-flame"
REGION = "US"
GRAPHQL_ENDPOINT = "https://sod.warcraftlogs.com/api/v2/client"
TOKEN_URL = "https://sod.warcraftlogs.com/oauth/token"


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
        for idx, piece in enumerate(gear):
          gear_name = piece.get('name', 'Empty')#piece['name']
          slot = piece['slot']
          
          try:
            if first_item[slot] == 0:
              ilvl = piece.get('itemLevel', '0')  # Assuming 'ilvl' is a key in 'piece', default to 'N/A' if missing
              if ilvl not in (1,0) and slot != 3:
                print(ilvl)
                total_ilvl = total_ilvl + int(ilvl)
                count = count + 1
              player_data[f"gear_{slot}_name"] = gear_name
              player_data[f"gear_{slot}_slot"] = slot
              player_data[f"gear_{slot}_ilvl"] = ilvl
            first_item[slot] = first_item[slot] + 1
          except:
              import pdb;pdb.set_trace()  
              print('hi')
        player_data["total_ilvl"] = round(total_ilvl / count, 2)
        # import pdb;pdb.set_trace() 

        result.append(player_data)


    return result