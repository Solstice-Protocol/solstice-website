/**
 * Generate identity commitment from Aadhaar data
 * This creates a cryptographic commitment without revealing personal information
 */
export async function generateIdentityCommitment(aadhaarData: {
  name: string;
  dateOfBirth: string;
  gender: string;
  address: string;
}): Promise<string> {
  // Combine sensitive data fields (same format as backend)
  const dataString = `${aadhaarData.name}|${aadhaarData.dateOfBirth}|${aadhaarData.gender}|${aadhaarData.address}`;
  
  // Create SHA-256 hash as commitment
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const commitment = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return commitment;
}
