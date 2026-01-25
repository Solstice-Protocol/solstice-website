import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { SolsticeProvider } from './contexts/SolsticeContext';
import { Layout } from './components/Layout';
import { OnboardingFlow } from './components/OnboardingFlow';
import { ProtectedRoute } from './components/ProtectedRoute';
import { IdentityStatusPage } from './pages/IdentityStatusPage';
import { QRScannerPage } from './pages/QRScannerPage';
import { ChallengeScannerPage } from './pages/ChallengeScannerPage';
import { ProofsPage } from './pages/ProofsPage';
import './App.css';
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  // Configure Solana network
  const network = (import.meta.env.VITE_SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta' | 'testnet';
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Configure wallet adapters - only Phantom to avoid duplicate keys
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  );

  return (
    <BrowserRouter>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <SolsticeProvider>
              <Routes>
                {/* Onboarding Route - First time users */}
                <Route path="/onboarding" element={<OnboardingFlow />} />
                
                {/* Main App Routes - Protected, requires onboarding */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/status" replace />} />
                  <Route 
                    path="/status" 
                    element={
                      <ProtectedRoute>
                        <IdentityStatusPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/scan" 
                    element={
                      <ProtectedRoute>
                        <QRScannerPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/challenge" 
                    element={
                      <ProtectedRoute>
                        <ChallengeScannerPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/proofs" 
                    element={
                      <ProtectedRoute>
                        <ProofsPage />
                      </ProtectedRoute>
                    } 
                  />
                </Route>
              </Routes>
            </SolsticeProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </BrowserRouter>
  );
}

export default App;
