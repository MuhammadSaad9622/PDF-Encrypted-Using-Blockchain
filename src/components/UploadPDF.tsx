import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { FileUp, Upload, Wallet, ArrowRight, CreditCard, DollarSign } from 'lucide-react';
import { WebIrys } from '@irys/sdk';
import { useWalletClient } from 'wagmi';
import { BrowserProvider } from 'ethers';

interface UploadPDFProps {
  account: string | null;
  provider: BrowserProvider | null;
}

const UploadPDF = ({ account, provider }: UploadPDFProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mintResult, setMintResult] = useState<any>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [step, setStep] = useState<number>(1);

  const [encryptedFilePath, setEncryptedFilePath] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [arweavePrice, setArweavePrice] = useState<string | null>(null);
  const [arweaveUploadResult, setArweaveUploadResult] = useState<any>(null);

  const { data: walletClient } = useWalletClient();

  // Helper function to extract file ID from encrypted file path
  const getFileIdFromPath = (filePath: string | null): string | null => {
    if (!filePath) return null;
    const lastSlash = filePath.lastIndexOf('/');
    const lastBackslash = filePath.lastIndexOf('\\'); // Use \\ to escape backslash in regex
    const lastSeparatorIndex = Math.max(lastSlash, lastBackslash);

    const filename = lastSeparatorIndex > -1 ? filePath.substring(lastSeparatorIndex + 1) : filePath;

    // Remove the '_encrypted.pdf' suffix
    if (filename.endsWith('_encrypted.pdf')) {
      return filename.replace('_encrypted.pdf', '');
    }

    return filename; // Return filename even if suffix not found, or add error handling
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError(null);
    setEncryptedFilePath(null);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await axios.post('http://localhost:3001/api/encrypt-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('Upload and encrypt successful:', response.data);
      setEncryptedFilePath(response.data.encryptedFilePath || null);
      setEncryptionKey(response.data.encryptionKey || null);

      setLoading(false);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error encrypting and uploading file');
      console.error(err);
      setLoading(false);
    }
  };

  const handleGetArweavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptedFilePath) {
        setError('Encrypted file path is missing');
        return;
    }

    setLoading(true);
    setError(null);
    setArweavePrice(null);

    try {
        const response = await axios.post('http://localhost:3001/api/arweave-price', {
            encryptedFilePath: encryptedFilePath
        });

        setArweavePrice(response.data.price);

        setLoading(false);
        setStep(3);

    } catch (err: any) {
        setError(err.response?.data?.error || 'Error getting Arweave upload price');
        console.error(err);
        setLoading(false);
    }
  };

  const handleFundBundlr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !arweavePrice) {
      setError('Missing wallet provider or upload price');
      return;
    }

    setLoading(true);
    setError(null);

    try {
        // Get Irys client
        const irys = await getIrysClient();

        // Fund Bundlr (Irys)
        const amountToFund = BigInt(arweavePrice); // Convert string price to BigInt
        const balance = await irys.getBalance(irys.address);
        console.log('Current Irys balance:', balance.toString());

        // Check if funding is necessary (optional but good practice)
        // Convert BigNumber balance to BigInt for comparison and arithmetic
        const balanceBigInt = BigInt(balance.toString());
        if (balanceBigInt < amountToFund) {
           const amountNeeded = amountToFund - balanceBigInt;
           console.log(`Funding Irys with ${amountNeeded} atomic units...`);
            const fundTx = await irys.fund(amountNeeded);
            console.log('Irys funded successfully:', fundTx);
        } else {
             console.log('Irys balance is sufficient.');
        }

        setLoading(false);
        setStep(4); // Move to step 4 after funding

    } catch (err: any) {
        setError(err.message || 'Error funding Irys');
        console.error(err);
        setLoading(false);
    }
  };

  const handleArweaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptedFilePath || !encryptionKey || !file?.name || !recipientAddress || !provider) {
        setError('Missing required information for Arweave upload and minting');
        return;
    }

    setLoading(true);
    setError(null);
    setArweaveUploadResult(null);

    try {
        // Get Irys client
        const irys = await getIrysClient();

        // 1. Fetch the encrypted file from the backend
        const fileId = getFileIdFromPath(encryptedFilePath);
        if (!fileId) {
          setError('Could not extract file ID from path');
          setLoading(false);
          return;
        }

        const fileResponse = await fetch(`http://localhost:3001/api/encrypted-file/${fileId}`);
        if (!fileResponse.ok) {
            throw new Error('Failed to fetch encrypted file from backend');
        }
        const encryptedFileBlob = await fileResponse.blob();

        // Convert Blob to ArrayBuffer and then to Buffer for Irys upload
        const encryptedFileArrayBuffer = await encryptedFileBlob.arrayBuffer();
        const encryptedFileBuffer = Buffer.from(encryptedFileArrayBuffer); // Convert ArrayBuffer to Buffer

        // 2. Upload the file to Arweave using the client-side Irys client
        console.log('Uploading encrypted file to Arweave using Irys...');
        const tags = [
          { name: 'Content-Type', value: encryptedFileBlob.type || 'application/octet-stream' },
          { name: 'App-Name', value: 'YourAppName' }, // Replace with your app name
          // Add other relevant tags if needed
        ];
        // Pass Buffer to upload
        const response = await irys.upload(encryptedFileBuffer, { tags });

        console.log('Arweave upload successful:', response);

        const arweaveId = response.id;
        const arweaveUrl = `https://arweave.net/${arweaveId}`;

        // 3. Call the backend's /api/arweave-upload endpoint for metadata and minting
        console.log('Calling backend for metadata and minting...');
        const mintResponse = await axios.post('http://localhost:3001/api/arweave-upload', {
            arweaveId: arweaveId,
            arweaveUrl: arweaveUrl,
            encryptionKey: encryptionKey, // Use the stored encryptionKey
            originalName: file.name, // Use the original file name (file is guaranteed to exist here)
            recipientAddress: recipientAddress, // Get recipientAddress from state
            name: name || `Encrypted PDF: ${file.name}`,
            description: description || 'Encrypted PDF document with secure access'
        });

        console.log('Backend minting response:', mintResponse.data);

        // Store the transaction request from the backend
        setArweaveUploadResult(mintResponse.data);

        setLoading(false);
        setStep(5); // Move to step 5 after successful Arweave upload and backend call

    } catch (err: any) {
        setError(err.message || err.response?.data?.error || 'Error during Arweave upload or minting with Irys');
        console.error('Irys upload or minting error:', err);
        setLoading(false);
    }
  };
  
  // Utility functions
  async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, backoff * (i + 1)));
      }
    }
    throw new Error('Max retries reached');
  }
  
  function parseEncryptionKey(key: string | object): { key: string; iv: string } {
    try {
      if (typeof key === 'object') return key;
      const parsed = JSON.parse(key);
      if (parsed.key && parsed.iv) return parsed;
      throw new Error('Invalid key format');
    } catch (e) {
      console.error('Key parsing error:', e);
      throw new Error('Failed to parse encryption key');
    }
  }

// Helper function for retrying failed requests

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !arweaveUploadResult?.transactionRequest) {
      setError('Missing wallet provider or transaction data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get the signer from the provider
      const signer = await provider.getSigner();
      
      // Send the transaction
      console.log('Sending minting transaction...');
      const txResponse = await signer.sendTransaction(arweaveUploadResult.transactionRequest);
      console.log('Transaction sent:', txResponse);

      // Wait for the transaction to be mined
      console.log('Waiting for transaction confirmation...');
      const receipt = await txResponse.wait();
      console.log('Transaction confirmed:', receipt);

      // Check if receipt is null before accessing properties
      if (!receipt) {
          throw new Error('Transaction failed to confirm or was not found.');
      }

      // Store the result using receipt properties
      setMintResult({
        transactionHash: receipt.hash, // Use receipt.hash for the transaction hash
        tokenId: arweaveUploadResult.tokenId, // Assuming backend includes this in the response
        metadataUrl: arweaveUploadResult.metadataUrl
      });

      setLoading(false);
      setStep(6); // Move to final success step
    } catch (err: any) {
      setError(err.message || 'Error sending transaction');
      console.error('Transaction error:', err);
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setFile(null);
    setLoading(false);
    setError(null);
    setMintResult(null);
    setRecipientAddress('');
    setName('');
    setDescription('');
    setStep(1);
    setEncryptedFilePath(null);
    setEncryptionKey(null);
    setArweavePrice(null);
    setArweaveUploadResult(null);
  };

  // Helper function to initialize WebIrys client
  const getIrysClient = async () => {
    try {
      // 1. Check for Ethereum provider
      if (!window.ethereum) {
        throw new Error('Please install MetaMask or another Ethereum wallet');
      }

      // 2. Initialize ethers provider correctly
      const provider = new ethers.BrowserProvider(window.ethereum); // Updated for ethers v6
      const signer = await provider.getSigner();
      
      // 3. Initialize Irys with proper configuration
      const irys = new WebIrys({
        url: "https://node1.bundlr.network",
        token: "matic",
        wallet: {
          name: "ethersv6", // Changed to v6
          provider: provider
        }
      });

      await irys.ready();
      console.log('Irys initialized with address:', irys.address);
      return irys;
    } catch (error) {
      console.error('Irys initialization error:', error);
      throw new Error(`Failed to initialize Irys: ${error.message}`);
    }
  };

  if (!account) {
    return (
      <div className="text-center py-12">
        <Wallet className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No wallet connected</h3>
        <p className="mt-1 text-sm text-gray-500">Please connect your wallet to continue.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between mb-8">
        <div className={`flex flex-col items-center ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
            <FileUp size={20} />
          </div>
          <span className="text-xs mt-1">Upload</span>
        </div>
        <div className={`flex-1 border-t-2 self-center ${step >= 2 ? 'border-indigo-600' : 'border-gray-300'}`}></div>
        <div className={`flex flex-col items-center ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
            <Upload size={20} />
          </div>
          <span className="text-xs mt-1">Fund Arweave</span>
        </div>
        <div className={`flex-1 border-t-2 self-center ${step >= 3 ? 'border-indigo-600' : 'border-gray-300'}`}></div>
        <div className={`flex flex-col items-center ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
            <Wallet size={20} />
          </div>
          <span className="text-xs mt-1">Fund Bundlr</span>
        </div>
        <div className={`flex-1 border-t-2 self-center ${step >= 4 ? 'border-indigo-600' : 'border-gray-300'}`}></div>
        <div className={`flex flex-col items-center ${step >= 4 ? 'text-indigo-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 4 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
            <Wallet size={20} />
          </div>
          <span className="text-xs mt-1">Upload to Arweave</span>
        </div>
        <div className={`flex-1 border-t-2 self-center ${step >= 5 ? 'border-indigo-600' : 'border-gray-300'}`}></div>
        <div className={`flex flex-col items-center ${step >= 5 ? 'text-indigo-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 5 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
            <Wallet size={20} />
          </div>
          <span className="text-xs mt-1">Mint NFT</span>
        </div>
        <div className={`flex-1 border-t-2 self-center ${step >= 6 ? 'border-indigo-600' : 'border-gray-300'}`}></div>
        <div className={`flex flex-col items-center ${step >= 6 ? 'text-indigo-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 6 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
            <Wallet size={20} />
          </div>
          <span className="text-xs mt-1">Complete</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleUpload}>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select PDF File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <FileUp className="mx-auto text-gray-400 mb-2" size={40} />
                <p className="text-sm text-gray-600">
                  {file ? file.name : 'Drag & drop your PDF here or click to browse'}
                </p>
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
          >
            {loading ? 'Processing...' : 'Encrypt & Upload'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleGetArweavePrice}>
          <div className="mb-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
              <p className="font-medium">File successfully encrypted and uploaded!</p>
              <p className="text-sm mt-1">Encrypted file ID: {getFileIdFromPath(encryptedFilePath)}</p>
            </div>

            <button
              type="submit"
              disabled={loading || !encryptedFilePath}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
            >
              {loading ? 'Processing...' : 'Get Arweave Upload Price'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleFundBundlr}>
          <div className="mb-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
              <p className="font-medium">Arweave price retrieved!</p>
              {arweavePrice && (
                <p className="text-sm mt-1">Arweave Price: {ethers.formatUnits(arweavePrice, 'wei')} wei</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !arweavePrice}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
            >
              {loading ? 'Processing...' : 'Fund Bundlr'}
            </button>
          </div>
        </form>
      )}

      {step === 4 && (
        <form onSubmit={handleArweaveUpload}>
          <div className="mb-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
              <p className="font-medium">Bundlr successfully funded!</p>
              <p className="text-sm mt-1">Ready to upload to Arweave</p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Recipient Wallet Address (Polygon)
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0x..."
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                NFT Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={`Encrypted PDF: ${file?.name}`}
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Encrypted PDF document with secure access"
                rows={3}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !recipientAddress}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
          >
            {loading ? 'Processing...' : 'Upload to Arweave'}
          </button>
        </form>
      )}

      {step === 5 && arweaveUploadResult && (
        <div>
          <div className="bg-green-50 text-green-700 p-6 rounded-lg mb-6">
            <h3 className="font-bold text-lg mb-2">Ready to Mint NFT!</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">File:</span> {file?.name}</p>
              <p><span className="font-medium">Recipient:</span> {recipientAddress}</p>
              <p>
                <span className="font-medium">Arweave URL:</span>{' '}
                <a 
                  href={arweaveUploadResult.arweaveUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {arweaveUploadResult.arweaveUrl}
                </a>
              </p>
            </div>
          </div>
          
          <button
            onClick={handleMint}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-indigo-300"
          >
            {loading ? 'Minting...' : 'Mint NFT'}
          </button>
        </div>
      )}

      {step === 6 && mintResult && (
        <div>
          <div className="bg-green-50 text-green-700 p-6 rounded-lg mb-6">
            <h3 className="font-bold text-lg mb-2">NFT Successfully Minted! 🎉</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Token ID:</span> {mintResult.tokenId}</p>
              <p>
                <span className="font-medium">Transaction:</span>{' '}
                <a 
                  href={`https://mumbai.polygonscan.com/tx/${mintResult.transactionHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline"
                >
                  View on PolygonScan
                </a>
              </p>
              <p>
                <span className="font-medium">Metadata:</span>{' '}
                <a 
                  href={mintResult.metadataUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {mintResult.metadataUrl}
                </a>
              </p>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-blue-700 text-sm">
            <p className="font-medium">Important:</p>
            <p className="mt-1">The encryption key is stored in the NFT metadata. Only the NFT owner should have access to this key to decrypt the document.</p>
          </div>
          <button
            onClick={resetFlow}
            className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Start New Upload
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadPDF;