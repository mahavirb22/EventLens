# EventLens — Trustless Attendance Verification on Algorand

> AI-verified attendance + blockchain-issued soulbound badges. Built for VIT Hack'26.

## Architecture

```
Connect Wallet → Upload Photo → Gemini AI Verifies → Soulbound NFT Minted
```

### Stack

| Layer      | Tech                                |
| ---------- | ----------------------------------- |
| Frontend   | React + Vite + Tailwind + DaisyUI   |
| Wallet     | Pera / Defly via @txnlab/use-wallet |
| Backend    | FastAPI (Python)                    |
| AI         | Google Gemini 2.0 Flash (Vision)    |
| Blockchain | Algorand TestNet (py-algorand-sdk)  |
| Storage    | JSON file (hackathon-grade)         |

### Soulbound Token Pattern

1. Admin creates ASA with `freeze` + `clawback` set to admin wallet
2. Student opts-in from their wallet
3. Admin transfers 1 unit to student
4. Admin immediately freezes the holding → **non-transferable**

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
```

## Quick Start

### 1. Backend

```bash
cd projects/backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create `.env` from the template:

```bash
copy .env.example .env
```

Fill in:

- `GEMINI_API_KEY` — Get from https://aistudio.google.com/apikey
- `ADMIN_MNEMONIC` — 25-word Algorand TestNet wallet mnemonic

Start server:

```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd projects/frontend
npm install
npm run dev
```

Open http://localhost:5173

### 3. Demo Flow

1. **Admin** creates an event (Admin tab → fills form → ASA minted on-chain)
2. **Student** connects Pera wallet
3. **Student** clicks event → Opts-in → Uploads live photo
4. **Gemini AI** scores the photo (confidence 0–100%)
5. If confidence ≥ 80% → **Claim Soulbound Badge** button appears
6. Badge is transferred + frozen in student's wallet
7. **Profile tab** shows all earned badges with explorer links

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

## Security

- Admin mnemonic is **never** exposed to the frontend
- All sensitive config lives in `.env` (git-ignored)
- Wallet addresses are validated server-side
- Image size capped at 10 MB
- Badge can only be claimed once per event per wallet

## Team

Built at VIT Hack'26 on Algorand.
