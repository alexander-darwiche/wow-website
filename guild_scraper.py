import requests
from bs4 import BeautifulSoup

# Send request to the page (replace 'url' with the actual URL of the page you're scraping)
url = "https://sod.warcraftlogs.com/zone/rankings/2018?metric=progress&partition=1&boss=-1"  # SoD leaderboard URL
response = requests.get(url)
soup = BeautifulSoup(response.text, "html.parser")

# Find all guild names
guilds = []

# Loop through all anchor tags with the specific class
for guild_link in soup.find_all("a", class_="main-table-guild"):
    guild_name = guild_link.text.strip()  # Get the guild name
    guild_url = guild_link["href"]  # Get the URL associated with the guild
    guilds.append({"name": guild_name, "url": guild_url})

# Print out the list of guild names
for guild in guilds:
    print(f"Guild: {guild['name']}, URL: {guild['url']}")



import requests
from bs4 import BeautifulSoup

# Send request to the page (replace 'url' with the actual URL of the page you're scraping)
response = requests.get(url)
soup = BeautifulSoup(response.text, "html.parser")

# Inspect the first few rows and print the relevant HTML
# Look at the first 5 rows (you can adjust this number)
for i, row in enumerate(soup.find_all("tr")[:5]):
    print(f"Row {i+1}: {row}")