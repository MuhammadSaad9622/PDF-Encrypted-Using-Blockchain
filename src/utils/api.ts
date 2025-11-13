// API utility with support for both development and production URLs
const getApiUrl = () => {
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
  const productionUrl = 'https://pdf-encrypted-using-blockchain-2.onrender.com';
  const developmentUrl = 'http://localhost:5000';
  
  return isDevelopment ? developmentUrl : productionUrl;
};

export const API_BASE_URL = getApiUrl();

// Helper function to make API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || 'API request failed');
  }
  
  return response.json();
};

// Auth API calls
export const authApi = {
  signup: async (email: string, password: string, name?: string) => {
    return apiCall('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },
  
  signin: async (email: string, password: string) => {
    return apiCall('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  getCurrentUser: async () => {
    return apiCall('/api/auth/me');
  },
  
  updateWalletAddress: async (walletAddress: string) => {
    return apiCall('/api/auth/wallet', {
      method: 'PUT',
      body: JSON.stringify({ walletAddress }),
    });
  },
  
  updateProfile: async (profileData: {
    name?: string;
    email?: string;
    profilePhoto?: string;
    bio?: string;
    phone?: string;
    location?: string;
    website?: string;
    company?: string;
    jobTitle?: string;
  }) => {
    return apiCall('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// PDF API calls
export const pdfApi = {
  encryptUpload: async (formData: FormData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/encrypt-upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }
    
    return response.json();
  },
  
  getTotalArweavePrice: async (data: any) => {
    return apiCall('/api/total-arweave-price', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  getEncryptedFile: async (fileId: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/encrypted-file/${fileId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch encrypted file');
    }
    
    return response.blob();
  },
  
  generateMetadata: async (data: any) => {
    return apiCall('/api/generate-metadata', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  mintNft: async (data: any) => {
    return apiCall('/api/mint-nft', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  getNftMetadata: async (tokenId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/nft-metadata/${tokenId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch NFT metadata');
    }
    return response.json();
  },
  
  decryptFile: async (tokenId: string, walletAddress: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/decrypt/${tokenId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ walletAddress }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Decryption failed' }));
      throw new Error(error.error || 'Decryption failed');
    }
    
    return response.blob();
  },
};

// Stats API calls
export const statsApi = {
  getUserStats: async () => {
    return apiCall('/api/stats/user-stats');
  },
};

