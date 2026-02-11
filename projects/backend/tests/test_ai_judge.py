"""
Tests for ai_judge.py — unit tests for non-AI helper functions.
Tests geolocation, image hashing, EXIF extraction.
(Gemini API calls are NOT tested here — those require network + API key.)
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ai_judge import (
    _haversine_distance,
    check_geolocation,
    compute_image_hash,
    extract_exif_metadata,
)


# ── Haversine Distance ──────────────────────────────────────

def test_haversine_same_point():
    d = _haversine_distance(12.9716, 79.1583, 12.9716, 79.1583)
    assert d == 0.0


def test_haversine_known_distance():
    # New Delhi to Mumbai ≈ 1148 km
    d = _haversine_distance(28.6139, 77.2090, 19.0760, 72.8777)
    assert 1100 < d < 1200, f"Expected ~1148 km, got {d}"


def test_haversine_short_distance():
    # Two points about 1km apart in Vellore (VIT campus area)
    d = _haversine_distance(12.9693, 79.1555, 12.9600, 79.1555)
    assert 0.5 < d < 2.0, f"Expected ~1 km, got {d}"


# ── Geolocation Check ───────────────────────────────────────

def test_geo_pass_close():
    result = check_geolocation(12.9693, 79.1555, 12.9700, 79.1555)
    assert result["status"] == "pass"
    assert result["distance_km"] is not None
    assert result["distance_km"] < 2.0


def test_geo_fail_far():
    result = check_geolocation(28.6139, 77.2090, 12.9716, 79.1583)  # Delhi vs Vellore
    assert result["status"] == "fail"


def test_geo_unavailable_no_user():
    result = check_geolocation(None, None, 12.9716, 79.1583)
    assert result["status"] == "unavailable"


def test_geo_unavailable_no_venue():
    result = check_geolocation(12.97, 79.15, None, None)
    assert result["status"] == "unavailable"


def test_geo_custom_max_distance():
    # Points about 100km apart, with max_distance_km=200 should pass
    result = check_geolocation(13.0, 80.0, 13.0, 81.0, max_distance_km=200)
    assert result["status"] == "pass"


# ── Image Hashing ────────────────────────────────────────────

def test_image_hash_deterministic():
    data = b"test image data bytes 12345"
    h1 = compute_image_hash(data)
    h2 = compute_image_hash(data)
    assert h1 == h2


def test_image_hash_is_sha256():
    data = b"hello world"
    h = compute_image_hash(data)
    assert len(h) == 64  # SHA-256 hex digest is 64 chars
    assert all(c in "0123456789abcdef" for c in h)


def test_image_hash_different_data():
    h1 = compute_image_hash(b"image_1")
    h2 = compute_image_hash(b"image_2")
    assert h1 != h2


# ── EXIF Extraction ──────────────────────────────────────────

def test_exif_no_exif_data():
    # Random bytes won't have EXIF
    result = extract_exif_metadata(b"\x00" * 100)
    assert result["has_exif"] is False


def test_exif_returns_expected_keys():
    result = extract_exif_metadata(b"not an image")
    assert "has_exif" in result
    assert "timestamp" in result
    assert "camera_model" in result
    assert "software" in result
    assert "suspicious" in result
    assert "flags" in result


def test_exif_minimal_jpeg():
    """A minimal valid JPEG without EXIF should return has_exif=False."""
    # Minimal JPEG: SOI + EOI markers
    minimal_jpeg = bytes([
        0xFF, 0xD8,  # SOI
        0xFF, 0xE0,  # APP0 marker
        0x00, 0x10,  # Length 16
        0x4A, 0x46, 0x49, 0x46, 0x00,  # JFIF\0
        0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
        0xFF, 0xD9  # EOI
    ])
    result = extract_exif_metadata(minimal_jpeg)
    assert result["has_exif"] is False
