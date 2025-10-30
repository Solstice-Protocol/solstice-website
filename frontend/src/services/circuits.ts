/**
 * Solstice Protocol Circuit Service
 * Handles ZK proof generation and verification using circuits
 */

import { groth16 } from 'snarkjs';

// Circuit paths - these will be loaded from public/circuits
const CIRCUIT_PATHS = {
  age: {
    wasm: '/circuits/age_proof_js/age_proof.wasm',
    zkey: '/circuits/age_proof_final.zkey',
    vkey: '/circuits/age_proof_verification_key.json',
  },
  nationality: {
    wasm: '/circuits/nationality_proof_js/nationality_proof.wasm',
    zkey: '/circuits/nationality_proof_final.zkey',
    vkey: '/circuits/nationality_proof_verification_key.json',
  },
  uniqueness: {
    wasm: '/circuits/uniqueness_proof_js/uniqueness_proof.wasm',
    zkey: '/circuits/uniqueness_proof_final.zkey',
    vkey: '/circuits/uniqueness_proof_verification_key.json',
  },
};

export type ProofType = 'age' | 'nationality' | 'uniqueness';

export interface CircuitInputs {
  [key: string]: string | string[] | number | bigint;
}

export interface ProofData {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

/**
 * Generate a zero-knowledge proof using the specified circuit
 */
export async function generateProof(
  proofType: ProofType,
  inputs: CircuitInputs
): Promise<ProofData> {
  try {
    console.log(`Generating ${proofType} proof...`);
    
    const circuitPaths = CIRCUIT_PATHS[proofType];
    
    // Generate the proof using snarkjs
    const { proof, publicSignals } = await groth16.fullProve(
      inputs,
      circuitPaths.wasm,
      circuitPaths.zkey
    );

    console.log(`${proofType} proof generated successfully`);
    
    return {
      proof,
      publicSignals,
    };
  } catch (error) {
    console.error(`Failed to generate ${proofType} proof:`, error);
    throw new Error(`Proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify a zero-knowledge proof
 */
export async function verifyProof(
  proofType: ProofType,
  proofData: ProofData
): Promise<boolean> {
  try {
    console.log(`Verifying ${proofType} proof...`);
    
    const circuitPaths = CIRCUIT_PATHS[proofType];
    
    // Load verification key
    const vkeyResponse = await fetch(circuitPaths.vkey);
    const vkey = await vkeyResponse.json();
    
    // Verify the proof
    const isValid = await groth16.verify(
      vkey,
      proofData.publicSignals,
      proofData.proof
    );

    console.log(`${proofType} proof verification result:`, isValid);
    
    return isValid;
  } catch (error) {
    console.error(`Failed to verify ${proofType} proof:`, error);
    throw new Error(`Proof verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Prepare age proof inputs from Aadhaar data
 */
export function prepareAgeProofInputs(
  aadhaarData: {
    dob: string;
    aadhaarHash: string;
    signature: string;
  },
  minAge: number
): CircuitInputs {
  // Convert DOB to timestamp
  const dobTimestamp = new Date(aadhaarData.dob).getTime();
  const currentTimestamp = Date.now();
  
  // Convert signature to array (assuming it's a hex string)
  const signatureArray = aadhaarData.signature.match(/.{1,2}/g)?.map(byte => 
    parseInt(byte, 16).toString()
  ) || [];
  
  return {
    aadhaarHash: aadhaarData.aadhaarHash,
    signature: signatureArray,
    dob: dobTimestamp.toString(),
    currentDate: currentTimestamp.toString(),
    minAge,
  };
}

/**
 * Prepare nationality proof inputs from Aadhaar data
 */
export function prepareNationalityProofInputs(
  aadhaarData: {
    state: string;
    aadhaarHash: string;
    signature: string;
  },
  allowedCountries: string[]
): CircuitInputs {
  // Convert signature to array
  const signatureArray = aadhaarData.signature.match(/.{1,2}/g)?.map(byte => 
    parseInt(byte, 16).toString()
  ) || [];
  
  // Map state to nationality code (simplified)
  const nationalityCode = 'IN'; // India
  
  return {
    aadhaarHash: aadhaarData.aadhaarHash,
    signature: signatureArray,
    nationality: nationalityCode,
    allowedCountries,
  };
}

/**
 * Prepare uniqueness proof inputs from Aadhaar data
 */
export function prepareUniquenessProofInputs(
  aadhaarData: {
    aadhaarNumber: string;
    aadhaarHash: string;
    signature: string;
  },
  secret: string
): CircuitInputs {
  // Convert signature to array
  const signatureArray = aadhaarData.signature.match(/.{1,2}/g)?.map(byte => 
    parseInt(byte, 16).toString()
  ) || [];
  
  // Generate nullifier from aadhaar number and secret
  const nullifier = hashToField(aadhaarData.aadhaarNumber + secret);
  
  return {
    aadhaarHash: aadhaarData.aadhaarHash,
    signature: signatureArray,
    nullifier,
    secret,
  };
}

/**
 * Hash a string to a field element (simplified)
 */
function hashToField(input: string): string {
  // This is a simplified implementation
  // In production, use a proper hash function like Poseidon
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString();
}

/**
 * Export proof to JSON format for storage
 */
export function exportProof(proofData: ProofData): string {
  return JSON.stringify(proofData, null, 2);
}

/**
 * Import proof from JSON format
 */
export function importProof(proofJson: string): ProofData {
  return JSON.parse(proofJson);
}

/**
 * Check if circuits are loaded and available
 */
export async function checkCircuitsAvailable(): Promise<{
  age: boolean;
  nationality: boolean;
  uniqueness: boolean;
}> {
  const results = {
    age: false,
    nationality: false,
    uniqueness: false,
  };
  
  for (const [type, paths] of Object.entries(CIRCUIT_PATHS)) {
    try {
      const response = await fetch(paths.wasm, { method: 'HEAD' });
      results[type as ProofType] = response.ok;
    } catch {
      results[type as ProofType] = false;
    }
  }
  
  return results;
}

export default {
  generateProof,
  verifyProof,
  prepareAgeProofInputs,
  prepareNationalityProofInputs,
  prepareUniquenessProofInputs,
  exportProof,
  importProof,
  checkCircuitsAvailable,
};
