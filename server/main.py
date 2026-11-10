from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json
import os

app = FastAPI(title="Reşo Cloud Sync API")

DATA_FILE = "cloud_stats.json"

class UserStats(BaseModel.Data):
    username: str
    streak: int
    longest_streak: int
    total_focus_minutes: int
    habits_prevented: int

# Einfache lokale Speicherdatei auf dem Server (für Produktionsreife kann man PostgreSQL nutzen)
def load_db():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {}

def save_db(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f)

@app.post("/sync")
def sync_stats(stats: dict):
    username = stats.get("username", "default_user")
    db = load_db()
    db[username] = stats
    save_db(db)
    return {"status": "success", "message": "Daten erfolgreich synchronisiert!"}

@app.get("/sync/{username}")
def get_stats(username: str):
    db = load_db()
    if username in db:
        return db[username]
    raise HTTPException(status_code=404, detail="Nutzer nicht gefunden")