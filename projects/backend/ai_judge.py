"""
ai_judge.py — Gemini Vision verification module.
Sends the uploaded image to Google Gemini and asks it whether the photo
is a genuine live attendance selfie at a specific event/venue.
Returns a confidence score (0–100).
"""

import base64
import google.generativeai as genai
from config import GEMINI_API_KEY

# Configure once at module load
genai.configure(api_key=GEMINI_API_KEY)

# Use Gemini 2.0 Flash — fast, vision-capable, free tier friendly
MODEL_NAME = "gemini-2.0-flash"

SYSTEM_PROMPT = """You are an attendance-verification AI for a university event platform called EventLens.

You will receive a photo that a student claims was taken at a live event.

Your job:
1. Determine if the photo appears to be taken LIVE at an indoor/outdoor event or venue.
2. Look for signs of a real environment: people, signage, stage, seating, lighting, badges, lanyards, etc.
3. Reject screenshots, stock photos, AI-generated images, photos of screens, or obviously staged images.

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "confidence": <integer 0-100>,
  "reason": "<one short sentence>"
}

confidence = how confident you are that this is a GENUINE live attendance photo.
- 90-100: Clearly at a real event, strong visual signals
- 70-89: Likely at an event but some ambiguity
- 40-69: Uncertain / could be faked
- 0-39: Likely fake or screenshot
"""


async def verify_attendance_image(image_bytes: bytes, event_name: str) -> dict:
    """
    Send image to Gemini Vision and return { confidence: int, reason: str }.
    """
    model = genai.GenerativeModel(MODEL_NAME)

    # Encode image as base64 data-part for Gemini
    image_part = {
        "mime_type": "image/jpeg",
        "data": base64.b64encode(image_bytes).decode("utf-8"),
    }

    user_prompt = (
        f'The student claims this photo was taken at the event: "{event_name}". '
        "Analyze the image and respond with the JSON confidence score."
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

        import json
        result = json.loads(text)
        return {
            "confidence": int(result.get("confidence", 0)),
            "reason": str(result.get("reason", "No reason provided")),
        }

    except Exception as e:
        print(f"[ai_judge] Gemini error: {e}")
        return {
            "confidence": 0,
            "reason": f"AI verification failed: {str(e)}",
        }
