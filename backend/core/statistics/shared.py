import json
import logging
import math
import os
import random
import secrets
import threading
from datetime import datetime, date, timedelta
from urllib.parse import urlsplit, urlunsplit
import requests

DATA_FILE = "stats_data.json"
CLOUD_URL = os.getenv(
    "RESO_CLOUD_URL",
    "https://stop-bad-behivor-q1d4.onrender.com/sync",
).rstrip("/")
COMMUNITY_URL = CLOUD_URL.rsplit("/sync", 1)[0] + "/community"
BACKUP_URL = CLOUD_URL.rsplit("/sync", 1)[0] + "/user/backup"
RESTORE_URL = CLOUD_URL.rsplit("/sync", 1)[0] + "/user/restore"
PRIVATE_BACKUP_KEYS = {
    "account_id",
    "google_account_email",
    "cloud_backup_initialized",
    "cloud_backup_dirty",
    "pin_code",
    "webhook_url",
    "last_trigger_at",
    "last_trigger_category",
    "reframing_entries",
    "emotion_stats",
    "weekday_hour_matrix",
    "daily_incidents",
    "relapse_reflections",
    "shadow_letter",
    "discipline_codex",
    "stress_detection_enabled",
    "codex_completed",
    "community_chat_settings",
    "shutdown_deadline_epoch",
    "community_author_id",
    "community_author_name",
}


__all__ = [name for name in globals() if not name.startswith("__")]
