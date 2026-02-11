"""
Tests for verify_token.py — HMAC token generation and validation.
"""

import sys
import os
import time

# Ensure backend is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from verify_token import create_verify_token, validate_verify_token, TOKEN_TTL


EVENT = "evt-001"
WALLET = "TESTADDR1234567890ABCDEF"


def test_create_token_returns_string():
    token = create_verify_token(EVENT, WALLET, 85)
    assert isinstance(token, str)
    assert len(token) > 20


def test_token_has_four_parts():
    token = create_verify_token(EVENT, WALLET, 90, "abcdef1234567890ffffffffffff")
    parts = token.split(":")
    assert len(parts) == 4, f"Expected 4 parts, got {len(parts)}: {parts}"


def test_validate_correct_token():
    token = create_verify_token(EVENT, WALLET, 85)
    result = validate_verify_token(token, EVENT, WALLET)
    assert result is not None
    assert result["confidence"] == 85


def test_validate_wrong_event():
    token = create_verify_token(EVENT, WALLET, 90)
    result = validate_verify_token(token, "wrong-event", WALLET)
    assert result is None


def test_validate_wrong_wallet():
    token = create_verify_token(EVENT, WALLET, 90)
    result = validate_verify_token(token, EVENT, "WRONGWALLET")
    assert result is None


def test_validate_below_threshold():
    token = create_verify_token(EVENT, WALLET, 60)
    result = validate_verify_token(token, EVENT, WALLET, min_confidence=80)
    assert result is None


def test_validate_at_threshold():
    token = create_verify_token(EVENT, WALLET, 80)
    result = validate_verify_token(token, EVENT, WALLET, min_confidence=80)
    assert result is not None


def test_image_hash_prefix_in_token():
    hash_val = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
    token = create_verify_token(EVENT, WALLET, 90, hash_val)
    parts = token.split(":")
    assert parts[2] == hash_val[:16]


def test_no_image_hash_defaults_to_none():
    token = create_verify_token(EVENT, WALLET, 90)
    parts = token.split(":")
    assert parts[2] == "none"


def test_validate_returns_image_hash():
    hash_val = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
    token = create_verify_token(EVENT, WALLET, 85, hash_val)
    result = validate_verify_token(token, EVENT, WALLET)
    assert result is not None
    assert result["image_hash"] == hash_val[:16]


def test_tampered_token_rejected():
    token = create_verify_token(EVENT, WALLET, 90)
    # Flip a character in the HMAC
    parts = token.split(":")
    sig = parts[3]
    tampered_sig = sig[:-1] + ("0" if sig[-1] != "0" else "1")
    fake_token = f"{parts[0]}:{parts[1]}:{parts[2]}:{tampered_sig}"
    result = validate_verify_token(fake_token, EVENT, WALLET)
    assert result is None


def test_malformed_token_rejected():
    assert validate_verify_token("not:a:valid:token:format:extra", EVENT, WALLET) is None
    assert validate_verify_token("garbage", EVENT, WALLET) is None
    assert validate_verify_token("", EVENT, WALLET) is None
