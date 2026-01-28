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
import { DashboardPage } from './pages/DashboardPage';
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

                {/* Main App - Single Dashboard */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Legacy routes redirect to dashboard */}
                  <Route path="/status" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/challenge" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/proofs" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/scan" element={<Navigate to="/dashboard" replace />} />
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
