# Solstice Protocol Website

Official web application for [Solstice Protocol](https://github.com/SolsticeProtocol) - Zero-Knowledge Identity Verification on Solana.

## Overview

This repository contains the **frontend website** that connects to the Solstice Protocol backend and circuits for zero-knowledge identity verification.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Solstice Ecosystem                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  SolsticeProtocol (Main Repo)      solstice-website     │
│  ┌─────────────────────┐           ┌──────────────────┐ │
│  │ Backend (Express)   │◄──────────┤ Frontend (React) │ │
│  │ - API Server        │   HTTP    │ - Landing Page   │ │
│  │ - Database          │           │ - Web App        │ │
│  │ - Auth System       │           │ - ZK UI          │ │
│  └─────────────────────┘           └──────────────────┘ │
│           ▲                                  │           │
│           │                                  │           │
│           ▼                                  ▼           │
│  ┌─────────────────────┐           ┌──────────────────┐ │
│  │ Circuits (Circom)   │───────────►│ Public Circuits  │ │
│  │ - age_proof         │   Copied   │ (WASM + Keys)    │ │
│  │ - nationality_proof │           └──────────────────┘ │
│  │ - uniqueness_proof  │                                │
│  └─────────────────────┘                                │
│           ▲                                              │
│           │                                              │
│           ▼                                              │
│  ┌─────────────────────┐                                │
│  │ Solana Contracts    │                                │
│  │ (Anchor/Rust)       │                                │
│  └─────────────────────┘                                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Access to SolsticeProtocol repository (backend & circuits)
- Solana wallet browser extension (Phantom recommended)

### Installation

1. **Install frontend dependencies:**
```bash
cd frontend
npm install
```

2. **Sync circuits from SolsticeProtocol:**
```bash
# From solstice-website root directory
./sync-circuits.sh
```

3. **Configure environment:**
```bash
cd frontend
cp .env.example .env
# Edit .env with your settings
```

4. **Start development server:**
```bash
npm run dev
```

Visit `http://localhost:5173`

## Running Full Stack

**Terminal 1 - Backend:**
```bash
cd ../SolsticeProtocol/backend
npm install
npm run dev  # Runs on port 3000
```

**Terminal 2 - Frontend:**
```bash
cd solstice-website/frontend
npm run dev  # Runs on port 5173
```

See [INTEGRATION.md](./INTEGRATION.md) for detailed setup.

## Tech Stack

- React 19, TypeScript, Vite, Tailwind CSS
- snarkjs (ZK proofs), Solana Web3.js
- Custom fonts: Advercase & Nighty

