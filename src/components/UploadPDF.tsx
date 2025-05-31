import { useState } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { FileUp, Upload, Wallet } from 'lucide-react';

interface UploadPDFProps {
  account: string | null;
  provider: ethers.BrowserProvider | null;
}

const UploadPDF = ({ account, provider }: UploadPDFProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [mintResult, setMintResult] = useState<any>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [step, setStep] = useState<number>(1);

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

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await axios.post('http://localhost:3001/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadResult(response.data);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error uploading file');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadResult || !recipientAddress) {
      setError('Missing required information');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call backend API to mint NFT
      const response = await axios.post('http://localhost:3001/api/mint-nft', {
        fileId: uploadResult.fileId, // Assuming fileId is part of uploadResult now
        arweaveId: uploadResult.arweaveId,
        encryptionKey: uploadResult.encryptionKey,
        recipientAddress,
        name: name || `Encrypted PDF: ${file?.name}`,
        description: description || 'Encrypted PDF document with secure access',
        originalName: file?.name
      });

      setMintResult(response.data);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error minting NFT');
      console.error(err);
    } finally {
      setLoading(false);
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
          <span className="text-xs mt-1">Encrypt</span>
        </div>
        <div className={`flex-1 border-t-2 self-center ${step >= 3 ? 'border-indigo-600' : 'border-gray-300'}`}></div>
        <div className={`flex flex-col items-center ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
            <Wallet size={20} />
          </div>
          <span className="text-xs mt-1">Mint NFT</span>
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

      {step === 2 && uploadResult && (
        <form onSubmit={handleMint}>
          <div className="mb-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">
              <p className="font-medium">File successfully encrypted and uploaded!</p>
              <p className="text-sm mt-1">Arweave URL: <a href={`https://arweave.net/${uploadResult.arweaveId}`} target="_blank" rel="noopener noreferrer" className="underline">{uploadResult.arweaveId}</a></p>
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
            {loading ? 'Processing...' : 'Mint NFT'}
          </button>
        </form>
      )}

      {step === 3 && mintResult && (
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
            onClick={() => {
              setFile(null);
              setUploadResult(null);
              setMintResult(null);
              setRecipientAddress('');
              setName('');
              setDescription('');
              setStep(1);
            }}
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