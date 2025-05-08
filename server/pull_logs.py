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


def fetch_all_logs(token, guild, server, region, limit=50):
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
          table {{
            data {{
              entries {{
                name
                damageDone
                activeTime
              }}
            }}
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
    for p in players:
        name = p["name"]
        total = p["damageDone"]
        time = p["activeTime"]
        dps = round(total / time * 1000, 2) if time else 0
        result.append({
            "name": name,
            "damage": total,
            "dps": dps
        })
    return result
