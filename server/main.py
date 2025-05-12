# my-backend/main.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pull_logs import summarize_zone_counts, get_dps_data, get_gear_data
from collections import Counter


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/api/dps/{report_code}")
def dps_report(report_code: str):
    return get_dps_data(report_code)

@app.get("/api/gear/{report_code}")
def dps_report(report_code: str):
    return get_gear_data(report_code)