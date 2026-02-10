# EventLens — Trustless Attendance Verification on Algorand

> AI-verified attendance + blockchain-issued soulbound badges. Built for VIT Hack'26.

[![Built on Algorand](https://img.shields.io/badge/Built%20on-Algorand-black?logo=algorand)](https://algorand.co/)
[![AI Powered](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-blue)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Problem Statement

Event attendance verification today relies on trust — sign-in sheets, QR codes, or self-reporting. These are easily faked and produce no verifiable proof. **EventLens** solves this with AI-powered photo verification and blockchain-issued soulbound badges that are tamper-proof and non-transferable.

---

## How It Works

```
Connect Wallet → Browse Events → Opt-In → Upload Photo → Gemini AI Verifies → Soulbound NFT Minted
```

1. **Admin** creates an event (mints an ASA on Algorand TestNet)
2. **Student** connects Pera/Defly wallet and opts-in to the event ASA
3. **Student** uploads a live photo as attendance proof
4. **Gemini AI** analyzes the photo and returns a confidence score (0–100%)
5. If confidence ≥ 80% → student can **claim a soulbound badge**
6. Badge is transferred to the student's wallet and **immediately frozen** (non-transferable)
7. **Profile tab** shows all earned badges with Algorand explorer links

### Soulbound Token Pattern

```
Admin creates ASA (freeze + clawback = admin)
        ↓
Student opts-in to ASA
        ↓
Admin transfers 1 unit → Student
        ↓
Admin freezes the holding → Non-transferable ✓
```

---

## Tech Stack

| Layer      | Tech                                |
| ---------- | ----------------------------------- |
| Frontend   | React + Vite + Tailwind + DaisyUI   |
| Wallet     | Pera / Defly via @txnlab/use-wallet |
| Backend    | FastAPI (Python)                    |
| AI         | Google Gemini 2.0 Flash (Vision)    |
| Blockchain | Algorand TestNet (py-algorand-sdk)  |
| Storage    | JSON file (hackathon-grade)         |

---

## Project Structure

```
projects/
├── backend/              ← FastAPI server
│   ├── main.py           ← API endpoints
│   ├── ai_judge.py       ← Gemini Vision verification
│   ├── blockchain.py     ← ASA creation, transfer, freeze
│   ├── wallet.py         ← Admin wallet loader
│   ├── models.py         ← Pydantic schemas
│   ├── event_store.py    ← JSON-based event database
│   ├── config.py         ← Environment config
│   └── requirements.txt
├── frontend/             ← React dApp
│   └── src/
│       ├── Home.tsx          ← Main layout with tab navigation
│       ├── components/
│       │   ├── EventList.tsx     ← Event grid
│       │   ├── EventDetail.tsx   ← Opt-in → Upload → Verify → Claim flow
│       │   ├── Profile.tsx       ← Badge collection viewer
│       │   ├── CreateEvent.tsx   ← Admin event creation
│       │   └── ConnectWallet.tsx ← Wallet connection modal
│       └── utils/
│           └── api.ts        ← Typed API client
├── contracts/            ← Algorand smart contracts (AlgoKit)
│   └── smart_contracts/
│       ├── bank/         ← Bank contract (deposit/withdraw demo)
│       └── counter/      ← Counter contract (simple demo)
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- [AlgoKit](https://github.com/algorandfoundation/algokit-cli) installed
- Docker (for local Algorand node, optional)

### 1. Clone the repo

```bash
git clone https://github.com/mahavirb22/EventLens.git
cd EventLens
```

### 2. Backend Setup

```bash
cd projects/backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Create `.env` from the template:

```bash
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
```

Fill in your `.env`:

| Variable         | Description                                 |
| ---------------- | ------------------------------------------- |
| `GEMINI_API_KEY` | Get from https://aistudio.google.com/apikey |
| `ADMIN_MNEMONIC` | 25-word Algorand TestNet wallet mnemonic    |

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd projects/frontend
npm install
```

Create `.env` from the template:

```bash
copy .env.template .env
```

Set the Algorand TestNet variables:

```env
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_PORT=
VITE_ALGOD_TOKEN=
VITE_ALGOD_NETWORK=testnet
VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud
VITE_INDEXER_PORT=
VITE_INDEXER_TOKEN=
```

Start the frontend:

```bash
npm run dev
```

Open http://localhost:5173

---

## API Endpoints

| Method | Endpoint                             | Description                                 |
| ------ | ------------------------------------ | ------------------------------------------- |
| GET    | `/events`                            | List all events                             |
| POST   | `/events`                            | Create event + mint ASA                     |
| GET    | `/events/{id}`                       | Get event details                           |
| GET    | `/events/{id}/opt-in-check?wallet=X` | Check opt-in status                         |
| POST   | `/verify-attendance`                 | Upload image → Gemini AI → confidence score |
| POST   | `/mint-badge`                        | Transfer soulbound ASA to wallet            |
| GET    | `/profile/{wallet}/badges`           | Get wallet's badge collection               |

---

## Demo Flow

1. **Admin** → Admin tab → Create Event (name, description, location, date) → ASA minted on-chain
2. **Student** → Connect Pera wallet → Browse Events
3. **Student** → Click event → Opt-In to ASA → Upload live photo
4. **AI** → Gemini Vision scores photo (confidence 0–100%)
5. **Score ≥ 80%** → "Claim Soulbound Badge" button appears
6. **Badge** → Transferred + frozen in student's wallet (non-transferable)
7. **Profile** → View all earned badges with Algorand explorer links

---

## Security

- Admin mnemonic is **never** exposed to the frontend
- All sensitive config lives in `.env` (git-ignored)
- Wallet addresses are validated server-side
- Image size capped at 10 MB
- Badge can only be claimed once per event per wallet

---

## Environment Variables

### Backend (`projects/backend/.env`)

| Variable         | Required | Description                    |
| ---------------- | -------- | ------------------------------ |
| `GEMINI_API_KEY` | Yes      | Google Gemini API key          |
| `ADMIN_MNEMONIC` | Yes      | Algorand admin wallet mnemonic |

### Frontend (`projects/frontend/.env`)

| Variable              | Required | Description            |
| --------------------- | -------- | ---------------------- |
| `VITE_ALGOD_SERVER`   | Yes      | Algorand node URL      |
| `VITE_ALGOD_NETWORK`  | Yes      | Network name (testnet) |
| `VITE_INDEXER_SERVER` | Yes      | Algorand Indexer URL   |
| `VITE_PINATA_JWT`     | Optional | For IPFS NFT uploads   |

---

## Troubleshooting

| Issue                        | Fix                                                        |
| ---------------------------- | ---------------------------------------------------------- |
| Backend won't start          | Check `.env` exists with valid `GEMINI_API_KEY` & mnemonic |
| Wallet won't connect         | Use Pera Wallet on TestNet                                 |
| AI verification always fails | Ensure clear, well-lit photo; check Gemini API quota       |
| Badge claim fails            | Verify opt-in completed; check admin wallet has funds      |
| Frontend env errors          | Ensure `.env` exists in `projects/frontend/`; restart dev  |

---

## Links

- [Algorand Developer Portal](https://dev.algorand.co/)
- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli)
- [Pera Wallet](https://perawallet.app/)
- [Google Gemini AI](https://aistudio.google.com/)

---

## Team

Built at **VIT Hack'26** on Algorand.

---

## License

MIT
