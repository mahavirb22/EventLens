# EventLens — Trustless Attendance Verification on Algorand

> AI-verified attendance + blockchain-issued soulbound badges. Built for VIT Hack'26.

[![Built on Algorand](https://img.shields.io/badge/Built%20on-Algorand-black?logo=algorand)](https://algorand.co/)
[![AI Powered](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-blue)](https://aistudio.google.com/)

---

## 📑 Table of Contents

1. [For Judges](#-for-judges) - Quick overview and demo flow
2. [Implementation Status](#-implementation-status) - What's done and what's next
3. [Key Files for Judges](#-key-files-for-judges) - Where to look
4. [Technical Highlights](#️-technical-highlights) - Why this matters
5. [Problem Statement](#problem-statement) - What we're solving
6. [How It Works](#how-it-works) - Architecture and flow
7. [Tech Stack](#tech-stack) - Technologies used
8. [Quick Start](#quick-start) - Setup instructions
9. [API Endpoints](#api-endpoints) - Backend API docs
10. [Challenges & Solutions](#-challenges--solutions) - Technical decisions
11. [Future Roadmap](#-future-roadmap) - Next steps

---

## ⚡ Quick Start for Judges

**Want to run it locally? 3 steps:**

```powershell
# 1. Backend (PowerShell - Windows)
cd projects/backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Create .env with GEMINI_API_KEY and ADMIN_MNEMONIC
uvicorn main:app --reload --port 8000

# 2. Frontend (new terminal)
cd projects/frontend
npm install
# Copy .env.template to .env with testnet config
npm run dev

# 3. Open http://localhost:5173 and connect Pera Wallet (TestNet)
```

**Don't want to set up? Watch the demo video:** _[Add link]_

---

## 🎯 For Judges

**TL;DR**: EventLens replaces trust-based attendance systems with AI-verified photo proof and blockchain-issued soulbound attendance badges on Algorand TestNet.

### Quick Demo Flow

1. Admin creates event → ASA minted on Algorand
2. Student connects wallet → Opts-in to event ASA
3. Student uploads live photo → Gemini AI verifies (80%+ confidence required)
4. Student claims badge → Soulbound NFT transferred & frozen (non-transferable)
5. Profile shows all earned badges with blockchain explorer links

### Key Innovation

**Soulbound tokens** + **AI verification** = Unfakeable attendance proof that lives on-chain forever.

---

## ✅ Implementation Status

### **Fully Implemented Features**

#### Frontend (React + TypeScript + Tailwind)

- ✅ Wallet integration (Pera/Defly via @txnlab/use-wallet)
- ✅ Event browsing with grid layout
- ✅ Real-time opt-in status checking
- ✅ Photo upload with preview
- ✅ AI confidence score display
- ✅ Soulbound badge claiming flow
- ✅ Profile page with badge collection
- ✅ Admin dashboard for event creation
- ✅ Responsive UI with DaisyUI components
- ✅ Error boundaries and loading states

#### Backend (FastAPI + Python)

- ✅ RESTful API with CORS support
- ✅ Gemini Vision AI integration (photo verification)
- ✅ ASA creation, transfer, and freeze operations
- ✅ Opt-in status verification
- ✅ Event CRUD operations with JSON storage
- ✅ Wallet address validation
- ✅ Image size limits (10 MB cap)
- ✅ Duplicate badge prevention
- ✅ Admin wallet management with mnemonic

#### Blockchain (Algorand TestNet)

- ✅ ASA minting for each event
- ✅ Soulbound token pattern (freeze after transfer)
- ✅ Opt-in transaction handling
- ✅ Badge transfer with atomic operations
- ✅ Explorer link generation for verification

#### AI/ML

- ✅ Gemini 2.0 Flash Vision API integration
- ✅ Confidence scoring (0-100%)
- ✅ Image analysis for event authenticity
- ✅ Error handling for API failures

### **Remaining/Future Enhancements**

#### High Priority

- ⏳ Multi-layer verification (GPS geo-fencing, EXIF analysis)
- ⏳ On-chain proof storage via smart contract (EventLens ARC4 contract exists but not fully integrated)
- ⏳ Rate limiting on API endpoints
- ⏳ Unit test coverage expansion (36 tests exist in backend/tests/)
- ⏳ Certificate PDF generation with QR codes

#### Medium Priority

- 💡 NFT metadata on IPFS (Pinata integration scaffolded)
- 💡 Event capacity limits
- 💡 Admin analytics dashboard
- 💡 Email notifications for badge claims
- 💡 Batch operations for admins

#### Nice-to-Have

- 💡 Multi-event badge bundles
- 💡 Leaderboard/gamification
- 💡 Social sharing features
- 💡 Mobile app (React Native)

---

## 🔍 Key Files for Judges

### **Must Review** (Core Implementation)

| File                                                    | Why It Matters                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`projects/backend/main.py`][1]                         | FastAPI endpoints - full API logic for events, verification, minting     |
| [`projects/backend/ai_judge.py`][2]                     | Gemini Vision integration - how AI scores attendance photos              |
| [`projects/backend/blockchain.py`][3]                   | Algorand ASA operations - creation, transfer, freeze (soulbound pattern) |
| [`projects/frontend/src/Home.tsx`][4]                   | Main React app structure with tab navigation                             |
| [`projects/frontend/src/components/EventDetail.tsx`][5] | Complete user flow: opt-in → upload → verify → claim                     |
| [`projects/frontend/src/components/Profile.tsx`][6]     | Badge collection viewer with blockchain links                            |

[1]: projects/backend/main.py
[2]: projects/backend/ai_judge.py
[3]: projects/backend/blockchain.py
[4]: projects/frontend/src/Home.tsx
[5]: projects/frontend/src/components/EventDetail.tsx
[6]: projects/frontend/src/components/Profile.tsx

### **Architecture & Config**

| File                                                             | Description                                      |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| [`projects/backend/models.py`][7]                                | Pydantic schemas for type safety                 |
| [`projects/backend/event_store.py`][8]                           | JSON-based event persistence                     |
| [`projects/backend/wallet.py`][9]                                | Admin wallet loader from mnemonic                |
| [`projects/frontend/src/utils/api.ts`][10]                       | Typed API client with error handling             |
| [`projects/contracts/smart_contracts/eventlens/contract.py`][11] | ARC4 smart contract (for future on-chain proofs) |

[7]: projects/backend/models.py
[8]: projects/backend/event_store.py
[9]: projects/backend/wallet.py
[10]: projects/frontend/src/utils/api.ts
[11]: projects/contracts/smart_contracts/eventlens/contract.py

### **Testing**

| File                                                | Coverage                    |
| --------------------------------------------------- | --------------------------- |
| [`projects/backend/tests/test_ai_judge.py`][12]     | AI verification logic tests |
| [`projects/backend/tests/test_event_store.py`][13]  | Event CRUD operation tests  |
| [`projects/backend/tests/test_verify_token.py`][14] | Token generation/validation |

[12]: projects/backend/tests/test_ai_judge.py
[13]: projects/backend/tests/test_event_store.py
[14]: projects/backend/tests/test_verify_token.py

---

## 🏗️ Technical Highlights

### **Why This Project Stands Out**

1. **Real Soulbound Tokens**: Implements true non-transferable NFTs via Algorand's freeze feature
2. **AI Integration**: Gemini Vision API for intelligent photo verification
3. **Full-Stack Implementation**: Working React frontend + FastAPI backend + Algorand integration
4. **Type Safety**: TypeScript frontend + Pydantic backend schemas
5. **Production-Ready Patterns**: Environment config, error handling, loading states
6. **Testable**: Unit tests for critical backend logic
7. **Smart Contract Ready**: ARC4 EventLens contract written in algopy (scaffolded for future deployment)

### **Algorand-Specific Features**

- ✅ ASA (Algorand Standard Asset) creation for each event
- ✅ Opt-in transaction handling
- ✅ Freeze address functionality for soulbound tokens
- ✅ Clawback address for admin recovery
- ✅ Transaction signing and confirmation
- ✅ AlgoKit integration for contract development

### **Code Quality**

- Clean separation of concerns (models, services, routes)
- Environment-based configuration (no hardcoded secrets)
- Comprehensive error handling with user-friendly messages
- Responsive UI with accessibility considerations
- Git-ignored sensitive files (.env, **pycache**)

---

## 📊 Project Metrics

| Metric               | Count                                 |
| -------------------- | ------------------------------------- |
| **Total Components** | 9 React components                    |
| **API Endpoints**    | 7 REST endpoints                      |
| **Backend Modules**  | 8 Python modules                      |
| **Unit Tests**       | 36 tests (backend)                    |
| **Smart Contracts**  | 3 (Counter, Bank, EventLens)          |
| **Lines of Code**    | ~3,500+ (excluding dependencies)      |
| **External APIs**    | 2 (Gemini AI, Algorand)               |
| **Dependencies**     | 25+ npm packages, 15+ Python packages |

**Development Time**: Built during VIT Hack'26 (48 hours)

---

## 📹 Demo & Screenshots

### Live Flow

_https://drive.google.com/file/d/11PoY9gONAnXho8yRXwVjvDJ5TsdGOxaS/view?usp=sharing_

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

## 🎓 Challenges & Solutions

### Challenge 1: Soulbound Token Implementation

**Problem**: Algorand doesn't have native non-transferable NFTs  
**Solution**: Utilized ASA freeze feature — admin freezes the asset holding immediately after transfer, making it permanently non-transferable

### Challenge 2: AI Reliability

**Problem**: Gemini Vision API can have variable confidence scores  
**Solution**: Implemented 80% confidence threshold with detailed prompting to ensure genuine attendance detection

### Challenge 3: Wallet Security

**Problem**: Need admin wallet for ASA operations without exposing private keys  
**Solution**: Server-side wallet management with mnemonic stored in environment variables, never exposed to frontend

### Challenge 4: One Badge Per Person

**Problem**: Prevent duplicate badge claims for the same event  
**Solution**: Server-side validation checking existing claims before minting + blockchain freezes prevent transfers

---

## 🎯 Alignment with VIT Hack'26 Goals

| Criterion                 | How EventLens Delivers                                 |
| ------------------------- | ------------------------------------------------------ |
| **Blockchain Innovation** | Novel soulbound token pattern on Algorand TestNet      |
| **AI Integration**        | Gemini Vision for intelligent attendance verification  |
| **Real-World Impact**     | Solves trust issues in event attendance tracking       |
| **Technical Depth**       | Full-stack dApp with smart contracts + AI + blockchain |
| **User Experience**       | Clean UI, wallet integration, instant feedback         |
| **Scalability**           | ASA-based badges scale to thousands of events/users    |

---

## 🚀 Future Roadmap

### Phase 1 (Post-Hackathon)

- [ ] Deploy EventLens smart contract to TestNet
- [ ] Integrate on-chain proof storage (image hashes, AI scores)
- [ ] Add GPS geo-fencing verification
- [ ] Implement rate limiting on API endpoints

### Phase 2 (Production)

- [ ] Move to Algorand MainNet
- [ ] IPFS integration for NFT metadata
- [ ] Mobile app (React Native)
- [ ] Admin analytics dashboard with charts

### Phase 3 (Scale)

- [ ] Multi-organization support
- [ ] Credential aggregation (display all badges in one portfolio)
- [ ] Integration with university LMS systems
- [ ] Decentralized identity features

---

## Links

- [Algorand Developer Portal](https://dev.algorand.co/)
- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli)
- [Pera Wallet](https://perawallet.app/)
- [Google Gemini AI](https://aistudio.google.com/)
- [EventLens GitHub Repository](https://github.com/mahavirb22/EventLens)

---

## 📝 Additional Documentation

- [`EVENTLENS_README.md`](EVENTLENS_README.md) - Enhanced architecture with multi-layer verification details
- [`CHANGELOG_ENHANCEMENTS.md`](CHANGELOG_ENHANCEMENTS.md) - Feature evolution and version history
- [`Alokit_setup.md`](Alokit_setup.md) - AlgoKit environment setup guide

---

## 🏆 Team & Credits

**Built for VIT Hack'26** — Algorand Track

### Tech Stack Credits

- **Blockchain**: Algorand Foundation ([AlgoKit](https://github.com/algorandfoundation/algokit-cli), [py-algorand-sdk](https://github.com/algorand/py-algorand-sdk))
- **AI**: Google Gemini 2.0 Flash Vision
- **Wallet**: [Pera Wallet](https://perawallet.app/), [Defly Wallet](https://defly.app/)
- **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [DaisyUI](https://daisyui.com/)
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/), [Pydantic](https://docs.pydantic.dev/)

---

## 📧 Contact & Support

For questions about this project or collaboration:

- **GitHub Issues**: [Open an issue](https://github.com/mahavirb22/EventLens/issues)
- **Hackathon**: VIT Hack'26

---

## 📄 License

This project is built for educational and hackathon purposes. See individual component licenses for production usage.

---

**⭐ If you're a judge, thank you for reviewing EventLens! We're excited to show how blockchain + AI can solve real trust problems in event management.**
