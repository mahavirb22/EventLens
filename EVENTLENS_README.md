# EventLens — Trustless Attendance Verification on Algorand

> Multi-layer AI-verified attendance + GPS geo-fencing + on-chain proof storage + soulbound badges. Built for VIT Hack'26.

## Architecture

```
Connect Wallet → Upload Photo → Multi-Layer Verification → On-Chain Proof → Soulbound NFT
                                  ├─ Gemini Vision AI
                                  ├─ GPS Geo-Fencing
                                  ├─ EXIF Metadata Analysis
                                  └─ SHA-256 Image Hashing
```

### Stack

| Layer          | Tech                                           |
| -------------- | ---------------------------------------------- |
| Frontend       | React + Vite + TypeScript + Tailwind + DaisyUI |
| Wallet         | Pera / Defly via @txnlab/use-wallet-react      |
| Backend        | FastAPI (Python) + Rate Limiting               |
| AI             | Google Gemini 2.0 Flash (Vision)               |
| Blockchain     | Algorand TestNet (py-algorand-sdk)             |
| Smart Contract | EventLens ARC4 Contract (algopy)               |
| Storage        | JSON file + on-chain BoxMap proofs             |

### Multi-Layer Verification

| Layer | Technology       | Purpose                                               |
| ----- | ---------------- | ----------------------------------------------------- |
| 1     | Gemini Vision AI | Analyze photo for genuine event attendance indicators |
| 2     | GPS Geo-Fencing  | Verify user is within 2km of venue coordinates        |
| 3     | EXIF Analysis    | Detect photo manipulation, check camera metadata      |
| 4     | Image Hashing    | SHA-256 fingerprint for on-chain audit trail          |

### Soulbound Token Pattern

1. Admin creates ASA with `freeze` + `clawback` set to admin wallet
2. Student opts-in from their wallet
3. Admin transfers 1 unit to student
4. Admin immediately freezes the holding → **non-transferable**

### On-Chain Proof Storage

The dedicated `EventLens` ARC4 smart contract stores:

- Event registrations (name, location, dates, badge count)
- Verification proofs (image hash, AI confidence, attendee, timestamp)
- Claim counts per event
- All data in `BoxMap` storage for scalability

## Project Structure

```
projects/
├── backend/                   ← FastAPI server
│   ├── main.py                ← API endpoints + rate limiting
│   ├── ai_judge.py            ← Multi-layer verification (AI + GPS + EXIF + hash)
│   ├── blockchain.py          ← ASA creation, transfer, freeze, on-chain proofs
│   ├── wallet.py              ← Admin wallet loader
│   ├── models.py              ← Pydantic v2 schemas
│   ├── event_store.py         ← JSON event database with audit trail
│   ├── verify_token.py        ← HMAC tokens with image hash binding
│   ├── config.py              ← Environment config (secure defaults)
│   ├── requirements.txt
│   └── tests/                 ← 36 unit tests
│       ├── test_verify_token.py
│       ├── test_ai_judge.py
│       └── test_event_store.py
├── contracts/                 ← Algorand smart contracts
│   └── smart_contracts/
│       └── eventlens/
│           └── contract.py    ← ARC4 EventLens contract (BoxMap storage)
├── frontend/                  ← React dApp
│   └── src/
│       ├── Home.tsx           ← Main layout with role-based tabs
│       ├── components/
│       │   ├── EventList.tsx      ← Event grid with date + geo badges
│       │   ├── EventDetail.tsx    ← Opt-in → Upload → Verify → Claim flow
│       │   ├── Profile.tsx        ← Badge collection with AI scores + image hashes
│       │   ├── CreateEvent.tsx    ← Admin: date/time + GPS coordinate fields
│       │   ├── AdminDashboard.tsx ← Admin: stats + event table with features
│       │   └── ConnectWallet.tsx  ← Wallet connection modal
│       └── utils/
│           └── api.ts         ← Typed API client with geolocation
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

1. **Admin** creates an event (Admin tab → fills form with date/time + GPS coords → ASA minted on-chain)
2. **Student** connects Pera wallet
3. **Student** clicks event → Opts-in → Uploads live photo
4. **Multi-layer verification** runs:
   - Gemini Vision AI scores the photo
   - GPS geo-fencing checks proximity to venue
   - EXIF metadata detects editing software
   - SHA-256 hash computed for audit trail
5. If composite confidence ≥ 80% → **Claim Soulbound Badge** button appears
6. Badge is transferred + frozen in student's wallet
7. Proof is recorded on-chain (image hash + AI confidence + timestamp)
8. **Profile tab** shows all earned badges with AI scores, image hashes, and explorer links

### 4. Run Tests

```bash
cd projects/backend
python -m pytest tests/ -v
```

36 tests covering: HMAC tokens, geolocation, image hashing, EXIF extraction, event store CRUD.

## API Endpoints

| Method | Endpoint                             | Description                                        |
| ------ | ------------------------------------ | -------------------------------------------------- |
| GET    | `/events`                            | List all events (with dates + coordinates)         |
| POST   | `/events`                            | Create event + mint ASA + register on-chain        |
| GET    | `/events/{id}`                       | Get event details                                  |
| GET    | `/events/{id}/opt-in-check?wallet=X` | Check opt-in status                                |
| POST   | `/verify-attendance`                 | Upload → Multi-layer AI → confidence + image hash  |
| POST   | `/mint-badge`                        | Transfer soulbound ASA + record on-chain proof     |
| GET    | `/profile/{wallet}/badges`           | Badge collection with image hashes + AI confidence |
| GET    | `/stats`                             | Platform-wide statistics                           |
| POST   | `/admin/login`                       | Admin authentication                               |
| GET    | `/is-admin?wallet=X`                 | Check admin role                                   |

## Security

- Admin mnemonic is **never** exposed to the frontend
- Admin password generates random secret if not set (no more `admin123` default)
- HMAC verification tokens include image hash binding
- All sensitive config lives in `.env` (git-ignored)
- Wallet addresses are validated server-side
- Image size capped at 10 MB
- Badge can only be claimed once per event per wallet
- Sliding window rate limiting (30 requests/60s per IP)
- EXIF analysis detects Photoshop/GIMP manipulation

## Team

Built at VIT Hack'26 on Algorand.
