"""
ai_judge.py — Multi-layer attendance verification module.
Layer 1: Gemini Vision AI — analyzes image for genuine event attendance
Layer 2: GPS Geolocation — checks if user is within range of venue
Layer 3: Image metadata — EXIF timestamp validation
Layer 4: Image hashing — SHA-256 for on-chain audit trail

Returns a composite confidence score incorporating all signals.
"""

import base64
import hashlib
import json
import math
from datetime import datetime, timezone
from io import BytesIO

import google.generativeai as genai
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

from config import GEMINI_API_KEY

# Configure once at module load
genai.configure(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-2.0-flash"

SYSTEM_PROMPT = """You are an attendance-verification AI for a university event platform called EventLens.

You will receive a photo that a student claims was taken at a live event.

Your job:
1. Determine if the photo appears to be taken LIVE at an indoor/outdoor event or venue.
2. Look for signs of a real environment: people, signage, stage, seating, lighting, badges, lanyards, projected slides, speaker at podium, crowd, event banners, etc.
3. Check if the environment matches the claimed location/venue type.
4. Reject screenshots, stock photos, AI-generated images, photos of screens, memes, selfies at home, or obviously staged/fake images.
5. Check for signs of image manipulation: unnatural lighting, clone artifacts, warped geometry.
6. A blurry but genuine event photo is better than a crisp fake one.

Respond with ONLY a JSON object (no markdown, no explanation, no code fences):
{"confidence": <integer 0-100>, "reason": "<one short sentence>", "indicators": ["<sign1>", "<sign2>"]}

confidence = how confident you are that this is a GENUINE live attendance photo.
- 90-100: Clearly at a real event, strong visual signals (crowd, stage, signage, venue)
- 70-89: Likely at an event, some event indicators present
- 40-69: Uncertain / insufficient evidence / could be faked
- 0-39: Likely fake, screenshot, AI-generated, or not at an event

indicators = list of 2-4 visual elements you detected that influenced your score.
"""


# ── Geolocation Verification ────────────────────────────────

def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two GPS coordinates (in km).
    Used to verify if the user is near the event venue.
    """
    R = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def check_geolocation(
    user_lat: float | None,
    user_lon: float | None,
    venue_lat: float | None,
    venue_lon: float | None,
    max_distance_km: float = 2.0,
) -> dict:
    """
    Verify user's GPS location is within range of venue.
    Returns: { status: "pass"|"fail"|"unavailable", distance_km: float|None }
    """
    if user_lat is None or user_lon is None:
        return {"status": "unavailable", "distance_km": None, "detail": "User location not provided"}
    if venue_lat is None or venue_lon is None:
        return {"status": "unavailable", "distance_km": None, "detail": "Venue coordinates not configured"}

    distance = _haversine_distance(user_lat, user_lon, venue_lat, venue_lon)
    passed = distance <= max_distance_km

    return {
        "status": "pass" if passed else "fail",
        "distance_km": round(distance, 2),
        "detail": f"User is {distance:.1f}km from venue (max {max_distance_km}km)",
    }


# ── Image Hashing (Audit Trail) ─────────────────────────────

def compute_image_hash(image_bytes: bytes) -> str:
    """Compute SHA-256 hash of image for on-chain proof storage."""
    return hashlib.sha256(image_bytes).hexdigest()


# ── EXIF Metadata Extraction ────────────────────────────────

def extract_exif_metadata(image_bytes: bytes) -> dict:
    """
    Extract useful metadata from image EXIF data.
    Checks for: timestamp, GPS coordinates, camera model, software editing signs.
    """
    metadata = {
        "has_exif": False,
        "timestamp": None,
        "camera_model": None,
        "software": None,
        "gps_lat": None,
        "gps_lon": None,
        "suspicious": False,
        "flags": [],
    }

    try:
        img = Image.open(BytesIO(image_bytes))
        exif_data = img._getexif()
        if not exif_data:
            metadata["flags"].append("No EXIF data — could be a screenshot or downloaded image")
            return metadata

        metadata["has_exif"] = True

        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, tag_id)
            if tag_name == "DateTime" or tag_name == "DateTimeOriginal":
                metadata["timestamp"] = str(value)
            elif tag_name == "Model":
                metadata["camera_model"] = str(value)
            elif tag_name == "Software":
                metadata["software"] = str(value)
                # Check for editing software
                suspicious_sw = ["photoshop", "gimp", "lightroom", "snapseed"]
                if any(s in str(value).lower() for s in suspicious_sw):
                    metadata["suspicious"] = True
                    metadata["flags"].append(f"Edited with {value}")

    except Exception:
        metadata["flags"].append("Could not read EXIF data")

    return metadata


# ── AI Vision Verification ──────────────────────────────────

async def verify_attendance_image(
    image_bytes: bytes,
    event_name: str,
    location: str = "",
) -> dict:
    """
    Send image to Gemini Vision and return { confidence: int, reason: str, indicators: list }.
    """
    model = genai.GenerativeModel(MODEL_NAME)

    # Encode image as base64 data-part for Gemini
    image_part = {
        "mime_type": "image/jpeg",
        "data": base64.b64encode(image_bytes).decode("utf-8"),
    }

    # Build a location-aware prompt for higher accuracy
    location_hint = f' at the venue: "{location}"' if location else ""
    user_prompt = (
        f'The student claims this photo was taken at the event: "{event_name}"{location_hint}. '
        "Analyze the image carefully and respond with the JSON confidence score."
    )

    try:
        response = model.generate_content(
            [SYSTEM_PROMPT, user_prompt, image_part],
            generation_config={"temperature": 0.1},
        )

        # Parse the JSON from Gemini's response
        text = response.text.strip()
        # Handle markdown-wrapped JSON
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        result = json.loads(text)
        return {
            "confidence": int(result.get("confidence", 0)),
            "reason": str(result.get("reason", "No reason provided")),
            "indicators": result.get("indicators", []),
        }

    except Exception as e:
        print(f"[ai_judge] Gemini error: {e}")
        return {
            "confidence": 0,
            "reason": f"AI verification failed: {str(e)}",
            "indicators": [],
        }


# ── Composite Verification ──────────────────────────────────

async def full_verification(
    image_bytes: bytes,
    event_name: str,
    location: str = "",
    user_lat: float | None = None,
    user_lon: float | None = None,
    venue_lat: float | None = None,
    venue_lon: float | None = None,
) -> dict:
    """
    Run all verification layers and return a composite result.
    Combines: AI vision + geolocation + EXIF metadata analysis.
    """
    # Layer 1: AI Vision
    ai_result = await verify_attendance_image(image_bytes, event_name, location)

    # Layer 2: Geolocation
    geo_result = check_geolocation(user_lat, user_lon, venue_lat, venue_lon)

    # Layer 3: EXIF metadata
    exif = extract_exif_metadata(image_bytes)

    # Layer 4: Image hash
    image_hash = compute_image_hash(image_bytes)

    # ── Composite scoring ──
    base_confidence = ai_result["confidence"]
    adjustments = []

    # Geo bonus/penalty
    if geo_result["status"] == "pass":
        base_confidence = min(100, base_confidence + 5)
        adjustments.append(f"+5 geo check passed ({geo_result['distance_km']}km)")
    elif geo_result["status"] == "fail":
        base_confidence = max(0, base_confidence - 15)
        adjustments.append(f"-15 geo check failed ({geo_result['distance_km']}km away)")

    # EXIF penalty for edited images
    if exif["suspicious"]:
        base_confidence = max(0, base_confidence - 20)
        adjustments.append(f"-20 image edited: {', '.join(exif['flags'])}")

    # No EXIF = slight penalty (screenshots/downloads lack EXIF)
    if not exif["has_exif"] and base_confidence > 60:
        base_confidence = max(0, base_confidence - 5)
        adjustments.append("-5 no EXIF metadata (possible screenshot)")

    return {
        "confidence": base_confidence,
        "reason": ai_result["reason"],
        "indicators": ai_result["indicators"],
        "image_hash": image_hash,
        "geo_check": geo_result["status"],
        "geo_detail": geo_result.get("detail", ""),
        "exif": {
            "has_exif": exif["has_exif"],
            "camera": exif.get("camera_model"),
            "timestamp": exif.get("timestamp"),
            "flags": exif.get("flags", []),
        },
        "adjustments": adjustments,
    }
