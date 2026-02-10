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

# ── Verification Token Secret ───────────────────────────────
# Used to sign verification tokens so /mint-badge can't be called without AI approval
VERIFY_SECRET: str = os.getenv("VERIFY_SECRET", secrets.token_hex(32))

# ── Server ──────────────────────────────────────────────────
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
]
