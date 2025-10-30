# 🚀 Solstice Protocol - Complete Setup Guide

## Overview

This guide will help you set up the complete Solstice Protocol ecosystem with backend, circuits, and frontend working together.

## Architecture

```
/Users/shaurya/Documents/Solstice/
├── SolsticeProtocol/         # Main protocol repository
│   ├── backend/              # Express API (Port 3000)
│   ├── circuits/             # ZK circuits (Circom)
│   └── contracts/            # Solana programs
└── solstice-website/         # Website repository
    └── frontend/             # React app (Port 5173)
```

## Step-by-Step Setup

### 1️⃣ Backend Setup (SolsticeProtocol)

```bash
cd /Users/shaurya/Documents/Solstice/SolsticeProtocol/backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Edit .env - KEY SETTINGS:
# FRONTEND_URL=http://localhost:5173
# PORT=3000

# Start backend
npm run dev
```

✅ **Backend running on:** `http://localhost:3000`  
✅ **Health check:** `curl http://localhost:3000/health`

### 2️⃣ Circuits Setup (Already Built)

Circuits are already built in `SolsticeProtocol/circuits/build/`

If you need to rebuild:
```bash
cd /Users/shaurya/Documents/Solstice/SolsticeProtocol/circuits
npm install
npm run build
```

### 3️⃣ Frontend Setup (solstice-website)

```bash
cd /Users/shaurya/Documents/Solstice/solstice-website/frontend

# Install dependencies
npm install

# Sync circuits (important!)
cd ..
./sync-circuits.sh

# Return to frontend
cd frontend

# Verify .env settings
cat .env
# Should have:
# VITE_API_URL=http://localhost:3000/api
# VITE_SOLANA_NETWORK=devnet

# Start frontend
npm run dev
```

✅ **Frontend running on:** `http://localhost:5173`  
✅ **Landing page:** `http://localhost:5173/`  
✅ **App:** `http://localhost:5173/app`

## Running the Full Stack

Open 2 terminals:

**Terminal 1 - Backend:**
```bash
cd /Users/shaurya/Documents/Solstice/SolsticeProtocol/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /Users/shaurya/Documents/Solstice/solstice-website/frontend
npm run dev
```

## Verify Everything Works

### Test Backend Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-30T...",
  "service": "Solstice Protocol API"
}
```

### Test Frontend
1. Open browser: `http://localhost:5173/`
2. Should see landing page with hero section
3. Click "Launch App" button
4. Should navigate to `/app` with Solana wallet integration

### Test Circuit Integration
In browser console on `/app` page:
```javascript
// Check if circuits are loaded
fetch('/circuits/age_proof_verification_key.json')
  .then(r => r.json())
  .then(console.log)
```

## Common Issues & Solutions

### ❌ Backend won't start

**Problem:** Port 3000 already in use
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
```

**Problem:** Database connection fails
- Check PostgreSQL is running
- Verify credentials in `.env`

### ❌ Frontend can't connect to backend

**Problem:** CORS error
- Check `FRONTEND_URL` in backend `.env`
- Should be: `http://localhost:5173`

**Problem:** API 404 errors
- Verify backend is running on port 3000
- Check `VITE_API_URL` in frontend `.env`

### ❌ Circuits not loading

**Problem:** 404 on circuit files
```bash
# Re-sync circuits
cd /Users/shaurya/Documents/Solstice/solstice-website
./sync-circuits.sh
```

**Problem:** Circuit files missing
```bash
# Check if circuits exist
ls -lh /Users/shaurya/Documents/Solstice/solstice-website/frontend/public/circuits/
```

## Development Workflow

### Making Backend Changes
1. Edit files in `SolsticeProtocol/backend/`
2. Server auto-reloads (nodemon)
3. Frontend automatically picks up API changes

### Making Frontend Changes
1. Edit files in `solstice-website/frontend/src/`
2. Vite auto-reloads browser
3. Changes appear instantly

### Updating Circuits
1. Edit `.circom` files in `SolsticeProtocol/circuits/`
2. Rebuild: `npm run build` in circuits folder
3. Sync to frontend:
   ```bash
   cd /Users/shaurya/Documents/Solstice/solstice-website
   ./sync-circuits.sh
   ```
4. Refresh browser

## Testing the Integration

### Test Identity Registration Flow

1. Open `http://localhost:5173/app`
2. Connect Solana wallet
3. Scan Aadhaar QR code (or use test data)
4. Generate ZK proof (should take 2-5 seconds)
5. Submit to backend
6. Verify on blockchain

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Check identity exists (replace PUBLIC_KEY)
curl http://localhost:3000/api/identity/exists/YOUR_PUBLIC_KEY

# Test proof verification
curl -X POST http://localhost:3000/api/proof/verify \
  -H "Content-Type: application/json" \
  -d '{"proofType":"age","proof":{},"publicInputs":[]}'
```

## Folder Structure Reference

```
solstice-website/
├── frontend/
│   ├── public/
│   │   ├── circuits/              # ← Synced from SolsticeProtocol
│   │   │   ├── age_proof_js/
│   │   │   ├── age_proof_final.zkey
│   │   │   ├── age_proof_verification_key.json
│   │   │   └── ... (all circuit files)
│   │   └── fonts/                 # ← Add Advercase & Nighty fonts here
│   ├── src/
│   │   ├── services/
│   │   │   ├── api.ts            # ← Backend integration
│   │   │   └── circuits.ts       # ← ZK proof generation
│   │   ├── pages/
│   │   │   └── Home.tsx          # ← Landing page
│   │   └── components/
│   └── .env                       # ← Configure API URL
├── sync-circuits.sh               # ← Run after circuit changes
├── INTEGRATION.md
└── README.md

SolsticeProtocol/
├── backend/
│   ├── src/
│   │   ├── routes/               # API endpoints
│   │   │   ├── identity.js       # Identity registration
│   │   │   ├── proof.js          # Proof verification
│   │   │   └── auth.js           # Authentication
│   │   └── index.js              # Express server
│   └── .env                       # ← Configure FRONTEND_URL
└── circuits/
    └── build/                     # Built circuits
```

## Environment Variables Checklist

### Backend (.env in SolsticeProtocol/backend)
- [x] `PORT=3000`
- [x] `FRONTEND_URL=http://localhost:5173`
- [x] `NODE_ENV=development`
- [x] `SOLANA_NETWORK=devnet`

### Frontend (.env in solstice-website/frontend)
- [x] `VITE_API_URL=http://localhost:3000/api`
- [x] `VITE_SOLANA_NETWORK=devnet`
- [x] `VITE_SOLANA_RPC_URL=https://api.devnet.solana.com`

## Next Steps

1. ✅ Backend running
2. ✅ Circuits synced
3. ✅ Frontend running
4. ✅ Integration working

Now you can:
- Build new features in frontend
- Add API endpoints in backend
- Create new circuits for different proofs
- Deploy to production

## Production Deployment

See [INTEGRATION.md](./INTEGRATION.md) for production deployment instructions.

## Need Help?

- Check [INTEGRATION.md](./INTEGRATION.md) for detailed docs
- Review [frontend/LANDING_PAGE.md](./frontend/LANDING_PAGE.md) for UI docs
- Open an issue on GitHub

---

**Happy Building! 🚀**
