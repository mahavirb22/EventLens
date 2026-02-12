"""
generate_wallet.py — Generate a new Algorand wallet with mnemonic.
Run this to create a new admin wallet address and mnemonic.

Usage:
    python generate_wallet.py
"""

from algosdk import account, mnemonic

def generate_new_wallet():
    """Generate a new Algorand account."""
    # Generate a new account
    private_key, address = account.generate_account()
    
    # Convert private key to mnemonic (25 words)
    mnemo = mnemonic.from_private_key(private_key)
    
    print("=" * 70)
    print("NEW ALGORAND WALLET GENERATED")
    print("=" * 70)
    print()
    print("🔑 MNEMONIC (25 words) - KEEP THIS SECRET!")
    print("-" * 70)
    print(mnemo)
    print("-" * 70)
    print()
    print("📍 WALLET ADDRESS:")
    print("-" * 70)
    print(address)
    print("-" * 70)
    print()
    print("⚠️  IMPORTANT:")
    print("   1. Save the mnemonic in a SECURE location")
    print("   2. Add mnemonic to ADMIN_MNEMONIC in Render env vars")
    print("   3. Add address to ADMIN_WALLETS in Render env vars")
    print("   4. Fund this wallet with ALGO on TestNet:")
    print(f"      https://bank.testnet.algorand.network/?account={address}")
    print()
    print("=" * 70)

if __name__ == "__main__":
    generate_new_wallet()
