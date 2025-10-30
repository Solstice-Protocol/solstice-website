/**
 * Solstice Protocol API Service
 * Handles all communication with the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// API Response types
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Identity types
export interface AadhaarData {
  name: string;
  dob: string;
  gender: string;
  address: string;
  pincode: string;
  state: string;
  aadhaarNumber: string;
  photoBase64?: string;
  signature: string;
}

export interface IdentityRegistration {
  publicKey: string;
  aadhaarHash: string;
  commitment: string;
  signature: string;
}

export interface IdentityVerification {
  publicKey: string;
  isVerified: boolean;
  verifiedAt?: string;
  proofs?: {
    age?: boolean;
    nationality?: boolean;
    uniqueness?: boolean;
  };
}

// Proof types
export interface ProofGenerationRequest {
  publicKey: string;
  proofType: 'age' | 'nationality' | 'uniqueness';
  witness: any;
  publicInputs: any;
}

export interface ProofVerificationRequest {
  proof: any;
  publicInputs: any;
  proofType: 'age' | 'nationality' | 'uniqueness';
}

export interface ProofResult {
  valid: boolean;
  proof?: any;
  publicInputs?: any;
  error?: string;
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { data };
  } catch (error) {
    console.error('API call failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Identity API endpoints
export const identityApi = {
  /**
   * Register a new identity
   */
  register: async (data: IdentityRegistration): Promise<ApiResponse<{ id: string }>> => {
    return apiCall('/identity/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Verify an existing identity
   */
  verify: async (publicKey: string): Promise<ApiResponse<IdentityVerification>> => {
    return apiCall(`/identity/verify/${publicKey}`, {
      method: 'GET',
    });
  },

  /**
   * Check if identity exists
   */
  exists: async (publicKey: string): Promise<ApiResponse<{ exists: boolean }>> => {
    return apiCall(`/identity/exists/${publicKey}`, {
      method: 'GET',
    });
  },

  /**
   * Get identity details
   */
  getDetails: async (publicKey: string): Promise<ApiResponse<any>> => {
    return apiCall(`/identity/${publicKey}`, {
      method: 'GET',
    });
  },
};

// Proof API endpoints
export const proofApi = {
  /**
   * Generate a zero-knowledge proof
   */
  generate: async (request: ProofGenerationRequest): Promise<ApiResponse<ProofResult>> => {
    return apiCall('/proof/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Verify a zero-knowledge proof
   */
  verify: async (request: ProofVerificationRequest): Promise<ApiResponse<ProofResult>> => {
    return apiCall('/proof/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Get proof status
   */
  getStatus: async (proofId: string): Promise<ApiResponse<{ status: string }>> => {
    return apiCall(`/proof/status/${proofId}`, {
      method: 'GET',
    });
  },

  /**
   * Get all proofs for a public key
   */
  getProofs: async (publicKey: string): Promise<ApiResponse<any[]>> => {
    return apiCall(`/proof/list/${publicKey}`, {
      method: 'GET',
    });
  },
};

// Auth API endpoints
export const authApi = {
  /**
   * Authenticate with wallet signature
   */
  login: async (publicKey: string, signature: string, message: string): Promise<ApiResponse<{ token: string }>> => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ publicKey, signature, message }),
    });
  },

  /**
   * Get authentication nonce
   */
  getNonce: async (publicKey: string): Promise<ApiResponse<{ nonce: string }>> => {
    return apiCall(`/auth/nonce/${publicKey}`, {
      method: 'GET',
    });
  },

  /**
   * Verify authentication token
   */
  verifyToken: async (token: string): Promise<ApiResponse<{ valid: boolean }>> => {
    return apiCall('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  /**
   * Logout
   */
  logout: async (): Promise<ApiResponse<{ success: boolean }>> => {
    return apiCall('/auth/logout', {
      method: 'POST',
    });
  },
};

// Health check
export const healthCheck = async (): Promise<ApiResponse<{ status: string; timestamp: string }>> => {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Health check failed',
    };
  }
};

export default {
  identity: identityApi,
  proof: proofApi,
  auth: authApi,
  healthCheck,
};
