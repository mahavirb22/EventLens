"""
event_store.py — Lightweight JSON-file event database.
Perfect for a hackathon. No Postgres, no ORM, no complexity.
"""

import json
import os
import uuid
from threading import Lock

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
EVENTS_FILE = os.path.join(DATA_DIR, "events.json")
_lock = Lock()


def _ensure_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(EVENTS_FILE):
        with open(EVENTS_FILE, "w") as f:
            json.dump({}, f)


def _read() -> dict:
    _ensure_file()
    with open(EVENTS_FILE, "r") as f:
        return json.load(f)


def _write(data: dict):
    _ensure_file()
    with open(EVENTS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def create_event(name: str, description: str, location: str, asset_id: int, total_badges: int) -> dict:
    """Add a new event and return its record."""
    with _lock:
        events = _read()
        event_id = str(uuid.uuid4())[:8]
        event = {
            "id": event_id,
            "name": name,
            "description": description,
            "location": location,
            "asset_id": asset_id,
            "total_badges": total_badges,
            "minted": 0,
            "attendees": [],  # list of wallet addresses that claimed
        }
        events[event_id] = event
        _write(events)
        return event


def get_event(event_id: str) -> dict | None:
    events = _read()
    return events.get(event_id)


def list_events() -> list[dict]:
    events = _read()
    return list(events.values())


def increment_minted(event_id: str, wallet_address: str):
    """Mark that a badge was minted for this wallet at this event."""
    with _lock:
        events = _read()
        if event_id in events:
            events[event_id]["minted"] += 1
            if wallet_address not in events[event_id]["attendees"]:
                events[event_id]["attendees"].append(wallet_address)
            _write(events)


def has_claimed(event_id: str, wallet_address: str) -> bool:
    events = _read()
    event = events.get(event_id)
    if not event:
        return False
    return wallet_address in event.get("attendees", [])


def get_all_asset_ids() -> list[int]:
    """Return all known event ASA IDs (for profile badge filtering)."""
    events = _read()
    return [e["asset_id"] for e in events.values() if e.get("asset_id")]
