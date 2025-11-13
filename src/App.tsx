import { useState, useEffect, createContext, useContext } from 'react';
import { ethers } from 'ethers';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './utils/theme';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Dashboard from './components/Dashboard';
import DashboardHome from './components/DashboardHome';
import UploadPDF from './components/UploadPDF';
import MyNFTs from './components/MyNFTs';
import ViewPDF from './components/ViewPDF';
import Settings from './components/Settings';
import ProtectedRoute from './components/ProtectedRoute';

interface WalletContextType {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  provider: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchWallet: async () => {},
});

export const useWallet = () => useContext(WalletContext);

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(provider);

          // Check if already connected
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0].address);
          }

          // Listen for account changes
          window.ethereum.on('accountsChanged', (accounts: string[]) => {
            setAccount(accounts[0] || null);
          });
        } catch (error) {
          console.error('Error initializing provider:', error);
        }
      }
    };

    init();
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        setAccount(accounts[0]);
        setProvider(provider);
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    } else {
      alert('Please install MetaMask to use this application');
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
  };

  const switchWallet = async () => {
    if (window.ethereum) {
      try {
        // Request account switch
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
        // Get the new accounts
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
          setProvider(provider);
        } else {
          disconnectWallet();
        }
      } catch (error) {
        console.error('Error switching wallet:', error);
        // If user cancels, just disconnect
        disconnectWallet();
      }
    }
  };

  return (
    <ThemeProvider>
      <WalletContext.Provider value={{ account, provider, connectWallet, disconnectWallet, switchWallet }}>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            
            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="upload" element={<UploadPDF />} />
              <Route path="my-nfts" element={<MyNFTs />} />
              <Route path="settings" element={<Settings />} />
              <Route path="view/:tokenId" element={<ViewPDF />} />
            </Route>

            {/* Redirect root to dashboard or signin */}
            <Route
              path="/"
              element={
                localStorage.getItem('token') ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/signin" replace />
                )
              }
            />
          </Routes>
        </Router>
      </WalletContext.Provider>
    </ThemeProvider>
  );
}

export default App;