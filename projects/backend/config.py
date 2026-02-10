"""
config.py — Central configuration loader.
Reads .env once, exports typed values used everywhere.
"""

import os
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

# ── Server ──────────────────────────────────────────────────
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
]
