/**
 * Onboarding utilities for Solstice Protocol
 * 
 * Manages the one-time onboarding process that links
 * an Aadhaar identity to a Solana wallet.
 */

/**
 * Check if a wallet has completed onboarding
 */
export function isOnboardingComplete(walletAddress: string | null): boolean {
  if (!walletAddress) return false;
  
  const onboardingKey = `solstice_onboarded_${walletAddress}`;
  return localStorage.getItem(onboardingKey) === 'true';
}

/**
 * Mark onboarding as complete for a wallet
 */
export function setOnboardingComplete(walletAddress: string): void {
  const onboardingKey = `solstice_onboarded_${walletAddress}`;
  localStorage.setItem(onboardingKey, 'true');
}

/**
 * Clear onboarding status (for testing/reset)
 */
export function clearOnboardingStatus(walletAddress: string): void {
  const onboardingKey = `solstice_onboarded_${walletAddress}`;
  localStorage.removeItem(onboardingKey);
}

/**
 * Link an Aadhaar number to a wallet address
 */
export function linkAadhaarToWallet(aadhaarNumber: string, walletAddress: string): void {
  const linkKey = `solstice_linked_${aadhaarNumber}`;
  localStorage.setItem(linkKey, walletAddress);
}

/**
 * Get wallet address linked to an Aadhaar number
 */
export function getLinkedWallet(aadhaarNumber: string): string | null {
  const linkKey = `solstice_linked_${aadhaarNumber}`;
  return localStorage.getItem(linkKey);
}

/**
 * Check if an Aadhaar is already linked to a wallet
 */
export function isAadhaarLinked(aadhaarNumber: string): boolean {
  return getLinkedWallet(aadhaarNumber) !== null;
}

/**
 * Check if the current wallet matches the linked Aadhaar
 */
export function verifyAadhaarWalletLink(
  aadhaarNumber: string,
  currentWallet: string
): { valid: boolean; linkedWallet: string | null; message: string } {
  const linkedWallet = getLinkedWallet(aadhaarNumber);
  
  if (!linkedWallet) {
    return {
      valid: true,
      linkedWallet: null,
      message: 'No existing link found. You can proceed with linking.'
    };
  }
  
  if (linkedWallet === currentWallet) {
    return {
      valid: true,
      linkedWallet,
      message: 'This Aadhaar is already linked to your current wallet.'
    };
  }
  
  return {
    valid: false,
    linkedWallet,
    message: `This Aadhaar is already linked to another wallet (${linkedWallet.slice(0, 8)}...)`
  };
}

/**
 * Get all onboarding related data for a wallet
 */
export function getOnboardingData(walletAddress: string) {
  return {
    isComplete: isOnboardingComplete(walletAddress),
    completedAt: localStorage.getItem(`solstice_onboarded_at_${walletAddress}`),
  };
}

/**
 * Store onboarding completion timestamp
 */
export function recordOnboardingCompletion(walletAddress: string): void {
  setOnboardingComplete(walletAddress);
  localStorage.setItem(
    `solstice_onboarded_at_${walletAddress}`,
    new Date().toISOString()
  );
}
