"""
verify_token.py — HMAC-based verification tokens.
Prevents anyone from calling /mint-badge without going through /verify-attendance.
Simple, stateless, no JWT dependency needed.
"""

import hmac
import hashlib
import time
from config import VERIFY_SECRET

# Tokens expire after 10 minutes (enough for demo)
TOKEN_TTL = 600


def create_verify_token(event_id: str, wallet_address: str, confidence: int) -> str:
    """
    Create an HMAC token proving the AI approved this wallet for this event.
    Format: {timestamp}:{confidence}:{hmac_hex}
    """
    ts = str(int(time.time()))
    payload = f"{event_id}:{wallet_address}:{confidence}:{ts}"
    sig = hmac.new(VERIFY_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{ts}:{confidence}:{sig}"


def validate_verify_token(
    token: str, event_id: str, wallet_address: str, min_confidence: int = 80
) -> bool:
    """
    Validate that the token was issued by us, is not expired,
    and confidence meets the threshold.
    """
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return False

        ts, confidence_str, provided_sig = parts
        confidence = int(confidence_str)
        timestamp = int(ts)

        # Check expiry
        if time.time() - timestamp > TOKEN_TTL:
            return False

        # Check confidence
        if confidence < min_confidence:
            return False

        # Verify HMAC
        payload = f"{event_id}:{wallet_address}:{confidence}:{ts}"
        expected_sig = hmac.new(
            VERIFY_SECRET.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(provided_sig, expected_sig)

    except (ValueError, TypeError):
        return False
