import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import UploadPDF from './components/UploadPDF';
import MyNFTs from './components/MyNFTs';
import ViewPDF from './components/ViewPDF';

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

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold">Encrypted PDF NFT</h1>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    to="/"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Upload
                  </Link>
                  <Link
                    to="/my-nfts"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    My NFTs
                  </Link>
                </div>
              </div>
              <div className="flex items-center">
                {account ? (
                  <span className="text-sm text-gray-500">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                ) : (
                  <button
                    onClick={connectWallet}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route
              path="/"
              element={<UploadPDF account={account} provider={provider} />}
            />
            <Route
              path="/my-nfts"
              element={<MyNFTs account={account} provider={provider} />}
            />
            <Route
              path="/view/:tokenId"
              element={<ViewPDF account={account} provider={provider} />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;