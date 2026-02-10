"""
wallet.py — Admin wallet loader.
Derives private key + address from the mnemonic stored in env vars.
"""

from algosdk import mnemonic, account
from config import ADMIN_MNEMONIC


def get_admin_account() -> tuple[str, str]:
    """
    Returns (private_key, address) for the admin/issuer wallet.
    The mnemonic MUST be a 25-word Algorand mnemonic set in .env.
    """
    if not ADMIN_MNEMONIC or ADMIN_MNEMONIC == "your_25_word_mnemonic_here":
        raise RuntimeError(
            "ADMIN_MNEMONIC is not configured. "
            "Set it in .env — never hard-code it."
        )
    private_key = mnemonic.to_private_key(ADMIN_MNEMONIC)
    address = account.address_from_private_key(private_key)
    return private_key, address
