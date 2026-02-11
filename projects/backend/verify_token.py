"""
verify_token.py — HMAC-based verification tokens.
Prevents anyone from calling /mint-badge without going through /verify-attendance.
Now includes image_hash in the token for audit trail continuity.
"""

import hmac
import hashlib
import time
from config import VERIFY_SECRET

# Tokens expire after 10 minutes (enough for demo)
TOKEN_TTL = 600


def create_verify_token(
    event_id: str, wallet_address: str, confidence: int, image_hash: str = ""
) -> str:
    """
    Create an HMAC token proving the AI approved this wallet for this event.
    Format: {timestamp}:{confidence}:{image_hash_prefix}:{hmac_hex}
    """
    ts = str(int(time.time()))
    hash_prefix = image_hash[:16] if image_hash else "none"
    payload = f"{event_id}:{wallet_address}:{confidence}:{hash_prefix}:{ts}"
    sig = hmac.new(VERIFY_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{ts}:{confidence}:{hash_prefix}:{sig}"


def validate_verify_token(
    token: str, event_id: str, wallet_address: str, min_confidence: int = 80
) -> dict | None:
    """
    Validate that the token was issued by us, is not expired,
    and confidence meets the threshold.
    Returns a dict with token data if valid, None if invalid.
    """
    try:
        parts = token.split(":")
        if len(parts) != 4:
            return None

        ts, confidence_str, hash_prefix, provided_sig = parts
        confidence = int(confidence_str)
        timestamp = int(ts)

        # Check expiry
        if time.time() - timestamp > TOKEN_TTL:
            return None

        # Check confidence
        if confidence < min_confidence:
            return None

        # Verify HMAC
        payload = f"{event_id}:{wallet_address}:{confidence}:{hash_prefix}:{ts}"
        expected_sig = hmac.new(
            VERIFY_SECRET.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(provided_sig, expected_sig):
            return None

        return {
            "confidence": confidence,
            "image_hash": hash_prefix,
            "timestamp": timestamp,
        }

    except (ValueError, TypeError):
        return None
