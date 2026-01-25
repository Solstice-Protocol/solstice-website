import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { isOnboardingComplete } from '../lib/onboarding';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that ensures users have completed onboarding
 * before accessing main app features.
 * 
 * Redirects to /onboarding if:
 * - Wallet is not connected
 * - Onboarding is not complete for the connected wallet
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { publicKey, connected } = useWallet();
  const location = useLocation();

  // Check onboarding status when wallet changes
  useEffect(() => {
    if (publicKey && connected) {
      const onboarded = isOnboardingComplete(publicKey.toString());
      console.log('🔒 Protected route check:', {
        wallet: publicKey.toString().slice(0, 8) + '...',
        onboarded,
        path: location.pathname
      });
    }
  }, [publicKey, connected, location]);

  // If wallet not connected, redirect to onboarding
  if (!connected || !publicKey) {
    console.log('🚫 No wallet connected, redirecting to onboarding');
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  // If onboarding not complete, redirect to onboarding
  if (!isOnboardingComplete(publicKey.toString())) {
    console.log('🚫 Onboarding not complete, redirecting to onboarding');
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}
