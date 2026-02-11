"""
Tests for event_store.py — JSON-based event storage.
Uses a temporary file to avoid touching real data.
"""

import sys
import os
import json
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import event_store


def _make_temp_store():
    """Create a temporary event_store file and patch the module to use it."""
    fd, path = tempfile.mkstemp(suffix=".json")
    os.close(fd)
    with open(path, "w") as f:
        json.dump({}, f)
    original = event_store.EVENTS_FILE
    event_store.EVENTS_FILE = path
    return path, original


def _cleanup(path, original):
    event_store.EVENTS_FILE = original
    if os.path.exists(path):
        os.remove(path)


def test_list_empty_store():
    path, orig = _make_temp_store()
    try:
        events = event_store.list_events()
        assert events == []
    finally:
        _cleanup(path, orig)


def test_create_event():
    path, orig = _make_temp_store()
    try:
        event = event_store.create_event(
            name="Test Event",
            description="A test",
            location="Test Hall",
            asset_id=12345,
            total_badges=50,
        )
        assert event["name"] == "Test Event"
        assert event["asset_id"] == 12345
        assert event["total_badges"] == 50
        assert event["minted"] == 0
        assert "id" in event
        assert "created_at" in event
    finally:
        _cleanup(path, orig)


def test_create_event_with_dates_and_geo():
    path, orig = _make_temp_store()
    try:
        event = event_store.create_event(
            name="Geo Event",
            description="With coordinates",
            location="VIT Vellore",
            asset_id=99999,
            total_badges=100,
            latitude=12.9716,
            longitude=79.1583,
            date_start="2025-06-01T10:00:00Z",
            date_end="2025-06-01T18:00:00Z",
        )
        assert event["latitude"] == 12.9716
        assert event["longitude"] == 79.1583
        assert event["date_start"] == "2025-06-01T10:00:00Z"
        assert event["date_end"] == "2025-06-01T18:00:00Z"
    finally:
        _cleanup(path, orig)


def test_get_event_by_id():
    path, orig = _make_temp_store()
    try:
        created = event_store.create_event(
            name="Find Me",
            description="desc",
            location="loc",
            asset_id=111,
            total_badges=10,
        )
        found = event_store.get_event(created["id"])
        assert found is not None
        assert found["name"] == "Find Me"
    finally:
        _cleanup(path, orig)


def test_get_event_not_found():
    path, orig = _make_temp_store()
    try:
        found = event_store.get_event("nonexistent-id")
        assert found is None
    finally:
        _cleanup(path, orig)


def test_increment_minted():
    path, orig = _make_temp_store()
    try:
        ev = event_store.create_event(
            name="Mint Test",
            description="d",
            location="l",
            asset_id=222,
            total_badges=5,
        )
        event_store.increment_minted(ev["id"], "CLAIMER_WALLET")

        updated = event_store.get_event(ev["id"])
        assert updated["minted"] == 1
        assert "CLAIMER_WALLET" in updated["attendees"]
    finally:
        _cleanup(path, orig)


def test_has_claimed_prevents_duplicate():
    path, orig = _make_temp_store()
    try:
        ev = event_store.create_event(
            name="Dup Test",
            description="d",
            location="l",
            asset_id=333,
            total_badges=5,
        )
        event_store.increment_minted(ev["id"], "WALLET_A")
        assert event_store.has_claimed(ev["id"], "WALLET_A") is True
        assert event_store.has_claimed(ev["id"], "WALLET_B") is False
    finally:
        _cleanup(path, orig)


def test_list_events_returns_all():
    path, orig = _make_temp_store()
    try:
        event_store.create_event("Ev1", "d", "l", 1, 10)
        event_store.create_event("Ev2", "d", "l", 2, 10)
        events = event_store.list_events()
        assert len(events) == 2
    finally:
        _cleanup(path, orig)


def test_get_stats():
    path, orig = _make_temp_store()
    try:
        ev = event_store.create_event("StatEv", "d", "l", 500, 20)
        event_store.increment_minted(ev["id"], "W1")
        event_store.increment_minted(ev["id"], "W2")
        stats = event_store.get_stats()
        assert stats["total_events"] == 1
        assert stats["total_badges_minted"] == 2
        assert stats["unique_attendees"] == 2
    finally:
        _cleanup(path, orig)


def test_get_claim_proof():
    path, orig = _make_temp_store()
    try:
        ev = event_store.create_event("ProofEv", "d", "l", 600, 10)
        event_store.increment_minted(ev["id"], "W1", image_hash="abc123", ai_confidence=92)
        proof = event_store.get_claim_proof(ev["id"], "W1")
        assert proof["image_hash"] == "abc123"
        assert proof["ai_confidence"] == 92
    finally:
        _cleanup(path, orig)
