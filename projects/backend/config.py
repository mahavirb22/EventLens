"""
config.py — Central configuration loader.
Reads .env once, exports typed values used everywhere.
"""

import os
import secrets
from dotenv import load_dotenv

load_dotenv()  # reads .env at project root

# ── Gemini ──────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
# Demo mode: auto-pass verification if Gemini quota exceeded (for hackathon demos)
DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() == "true"

# ── Algorand ────────────────────────────────────────────────
ADMIN_MNEMONIC: str = os.getenv("ADMIN_MNEMONIC", "")
ALGOD_SERVER: str = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
ALGOD_PORT: str = os.getenv("ALGOD_PORT", "443")
ALGOD_TOKEN: str = os.getenv("ALGOD_TOKEN", "")
INDEXER_SERVER: str = os.getenv("INDEXER_SERVER", "https://testnet-idx.algonode.cloud")
INDEXER_PORT: str = os.getenv("INDEXER_PORT", "443")
INDEXER_TOKEN: str = os.getenv("INDEXER_TOKEN", "")

# ── Admin Guard ─────────────────────────────────────────────
# Optional: restrict event creation to specific wallet addresses
ADMIN_WALLETS: list[str] = [
    w.strip()
    for w in os.getenv("ADMIN_WALLETS", "").split(",")
    if w.strip()
]

# ── Admin Password ──────────────────────────────────────────
# Password required to access the admin dashboard and create events
# MUST be set via environment variable in production — no insecure default
ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")
if not ADMIN_PASSWORD:
    import warnings
    warnings.warn(
        "ADMIN_PASSWORD not set! Set it in .env for security. "
        "Defaulting to a random password (check logs).",
        stacklevel=2,
    )
    ADMIN_PASSWORD = secrets.token_urlsafe(16)
    print(f"[config] Generated temporary admin password: {ADMIN_PASSWORD}")

# ── Admin Token Secret ──────────────────────────────────────
# Used to sign admin session tokens after password login
ADMIN_TOKEN_SECRET: str = os.getenv("ADMIN_TOKEN_SECRET", secrets.token_hex(32))

# ── Verification Token Secret ───────────────────────────────
# Used to sign verification tokens so /mint-badge can't be called without AI approval
VERIFY_SECRET: str = os.getenv("VERIFY_SECRET", secrets.token_hex(32))

# ── EventLens Smart Contract ────────────────────────────────
# App ID of the deployed EventLens ARC4 contract (set after deployment)
EVENTLENS_APP_ID: int = int(os.getenv("EVENTLENS_APP_ID", "0"))

# ── Rate Limiting ───────────────────────────────────────────
RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "30"))
RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # seconds

# ── Server ──────────────────────────────────────────────────
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
]
