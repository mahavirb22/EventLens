"""
event_store.py — Lightweight JSON-file event database.
Perfect for a hackathon. No Postgres, no ORM, no complexity.
"""

import json
import os
import uuid
from datetime import datetime, timezone
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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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
            "created_at": _now_iso(),
            "attendees": {},  # { wallet_address: { claimed_at: iso_str } }
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
            # Store claim with timestamp
            attendees = events[event_id].get("attendees", {})
            if isinstance(attendees, list):
                # Migrate old list format
                attendees = {a: {"claimed_at": _now_iso()} for a in attendees}
            if wallet_address not in attendees:
                attendees[wallet_address] = {"claimed_at": _now_iso()}
            events[event_id]["attendees"] = attendees
            _write(events)


def has_claimed(event_id: str, wallet_address: str) -> bool:
    events = _read()
    event = events.get(event_id)
    if not event:
        return False
    attendees = event.get("attendees", {})
    if isinstance(attendees, list):
        return wallet_address in attendees
    return wallet_address in attendees


def get_claim_time(event_id: str, wallet_address: str) -> str:
    """Return ISO timestamp of when the badge was claimed, or empty string."""
    events = _read()
    event = events.get(event_id)
    if not event:
        return ""
    attendees = event.get("attendees", {})
    if isinstance(attendees, dict) and wallet_address in attendees:
        return attendees[wallet_address].get("claimed_at", "")
    return ""


def get_all_asset_ids() -> list[int]:
    """Return all known event ASA IDs (for profile badge filtering)."""
    events = _read()
    return [e["asset_id"] for e in events.values() if e.get("asset_id")]


def get_stats() -> dict:
    """Return platform-wide statistics for the dashboard."""
    events = _read()
    total_events = len(events)
    total_minted = 0
    total_available = 0
    all_attendees = set()

    for e in events.values():
        total_minted += e.get("minted", 0)
        total_available += e.get("total_badges", 0)
        attendees = e.get("attendees", {})
        if isinstance(attendees, dict):
            all_attendees.update(attendees.keys())
        elif isinstance(attendees, list):
            all_attendees.update(attendees)

    return {
        "total_events": total_events,
        "total_badges_minted": total_minted,
        "total_badges_available": total_available,
        "unique_attendees": len(all_attendees),
    }
