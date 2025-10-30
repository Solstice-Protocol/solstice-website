# Solstice Website Configuration

This frontend connects to the **SolsticeProtocol** backend and circuits.

## Project Structure

```
Solstice/
├── SolsticeProtocol/          # Main protocol repository
│   ├── backend/               # Express API server
│   ├── circuits/              # ZK circuits (Circom)
│   ├── contracts/             # Solana smart contracts
│   └── frontend/              # Old frontend (can be archived)
│
└── solstice-website/          # Website repository (this one)
    └── frontend/              # New landing page + app
```

## Backend Connection

The frontend connects to the SolsticeProtocol backend running separately.

### Setup Instructions

#### 1. Start the Backend (SolsticeProtocol)

```bash
cd /Users/shaurya/Documents/Solstice/SolsticeProtocol/backend

# Install dependencies (first time only)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and configure:
# - PORT=3000
# - FRONTEND_URL=http://localhost:5173
# - Database credentials
# - Solana RPC URL

# Start the backend
npm run dev
```

Backend will run on: `http://localhost:3000`

#### 2. Build Circuits (if not already built)

```bash
cd /Users/shaurya/Documents/Solstice/SolsticeProtocol/circuits

# Install dependencies (first time only)
npm install

# Compile circuits (if needed)
npm run build
```

#### 3. Copy Circuit Files to Frontend

```bash
# From the solstice-website directory
mkdir -p frontend/public/circuits

# Copy the built circuits
cp -r ../SolsticeProtocol/circuits/build/* frontend/public/circuits/
```

#### 4. Start the Frontend (solstice-website)

```bash
cd /Users/shaurya/Documents/Solstice/solstice-website/frontend

# Install dependencies (first time only)
npm install

# Make sure .env is configured
# VITE_API_URL should point to backend: http://localhost:3000/api

# Start the frontend
npm run dev
```

Frontend will run on: `http://localhost:5173`

## Environment Variables

### Backend (.env in SolsticeProtocol/backend)
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=solstice
DB_USER=postgres
DB_PASSWORD=your_password

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Redis (optional for caching)
REDIS_URL=redis://localhost:6379
```

### Frontend (.env in solstice-website/frontend)
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=8jrTVUyvHrL5WTWyDoa6PTJRhh3MwbvLZXeGT81YjJjz
```

## API Integration

The frontend uses these services to connect to the backend:

### `/src/services/api.ts`
- `identityApi.register()` - Register new identity
- `identityApi.verify()` - Verify identity
- `proofApi.generate()` - Generate ZK proof
- `proofApi.verify()` - Verify ZK proof
- `authApi.login()` - Authenticate with wallet

### `/src/services/circuits.ts`
- `generateProof()` - Client-side proof generation
- `verifyProof()` - Client-side proof verification
- Uses snarkjs with circuits from `/public/circuits`

## Development Workflow

### Running Both Services

Terminal 1 (Backend):
```bash
cd /Users/shaurya/Documents/Solstice/SolsticeProtocol/backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd /Users/shaurya/Documents/Solstice/solstice-website/frontend
npm run dev
```

### Making Changes

**Backend/Circuits Changes:**
- Edit in `SolsticeProtocol/` repository
- Backend auto-reloads with nodemon
- Circuits require rebuild: `npm run build` in circuits folder

**Frontend Changes:**
- Edit in `solstice-website/frontend/`
- Vite auto-reloads

**Circuit Updates:**
- After rebuilding circuits, copy to frontend:
  ```bash
  cp -r ../SolsticeProtocol/circuits/build/* frontend/public/circuits/
  ```

## Production Deployment

### Backend Deployment
- Deploy SolsticeProtocol backend to cloud service (e.g., AWS, Railway, Render)
- Set `FRONTEND_URL` to your production domain
- Enable CORS for production domain

### Frontend Deployment
- Update `VITE_API_URL` to production backend URL
- Build: `npm run build`
- Deploy `dist/` folder to Vercel/Netlify/etc
- Ensure circuits are included in deployment

### Important Notes
1. Backend must be accessible from frontend domain
2. CORS must be configured properly
3. Circuit files must be served with frontend (they're large, ~10MB)
4. Consider CDN for circuit files in production

## Troubleshooting

### Frontend can't connect to backend
- Check backend is running: `curl http://localhost:3000/health`
- Check `VITE_API_URL` in frontend `.env`
- Check CORS settings in backend

### Circuits not loading
- Verify files exist in `frontend/public/circuits/`
- Check browser console for 404 errors
- Rebuild circuits if needed

### Proof generation fails
- Check circuit inputs match circuit expectations
- Verify witness data is correct
- Check browser console for detailed errors

## File Sync Script

To keep circuit files in sync, you can use this script:

```bash
#!/bin/bash
# sync-circuits.sh
# Run from solstice-website directory

echo "Syncing circuits from SolsticeProtocol..."
rm -rf frontend/public/circuits/*
cp -r ../SolsticeProtocol/circuits/build/* frontend/public/circuits/
echo "Circuits synced successfully!"
```

Make it executable:
```bash
chmod +x sync-circuits.sh
./sync-circuits.sh
```
