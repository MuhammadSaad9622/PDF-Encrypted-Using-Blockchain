import { useState } from 'react';
import { ethers } from 'ethers';
import { FileUp, Upload, Wallet, CreditCard, DollarSign } from 'lucide-react';
import { WebIrys } from '@irys/sdk';
import { useWallet } from '../App';
import { pdfApi } from '../utils/api';

const UploadPDF = () => {
  const { account, provider, connectWallet } = useWallet();
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
      const response = await pdfApi.encryptUpload(formData);

      console.log('Upload and encrypt successful:', response);
      setEncryptedFilePath(response.encryptedFilePath || null);
      setEncryptionKey(response.encryptionKey || null);

      setLoading(false);
      // After upload and encryption, move to the step where user enters recipient/NFT details
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Error encrypting and uploading file');
      console.error('Encrypt and upload error:', err);
      setLoading(false);
    }
  };

  // Renamed function to get total price
  const handleGetTotalArweavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure all required details from step 2 are available
    if (!encryptedFilePath || !encryptionKey || !file?.name || !recipientAddress) {
        setError('Missing required information to calculate price. Please go back to the previous step.');
        console.error('Missing required information for handleGetTotalArweavePrice', { encryptedFilePath, encryptionKey, fileName: file?.name, recipientAddress });
        return;
    }

    setLoading(true);
    setError(null);
    setArweavePrice(null);

    try {
        // Call the new backend endpoint to get total price for file + metadata
        const response = await pdfApi.getTotalArweavePrice({
            encryptedFilePath: encryptedFilePath,
            originalName: file.name, // Pass original name
            encryptionKey: encryptionKey, // Pass encryption key
            recipientAddress: recipientAddress, // Pass recipient address
            name: name, // Pass NFT name
            description: description // Pass NFT description
             // arweaveId and arweaveUrl are not available yet, pass as null or undefined
        });

        console.log('Total Arweave price response:', response);

        setArweavePrice(response.totalPrice); // Store the total price

        setLoading(false);
        setStep(4); // Move to fund Bundlr step (step 4 in the new flow)

    } catch (err: any) {
        setError(err.message || 'Error getting total Arweave upload price');
        console.error('Get total Arweave price error:', err);
        setLoading(false);
    }
  };

  const handleFundBundlr = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure total Arweave price is available from step 3
    if (!provider || !arweavePrice) {
      setError('Missing wallet provider or total upload price. Please go back to the previous step.');
      console.error('Missing required information for handleFundBundlr', { provider, arweavePrice });
      return;
    }

    setLoading(true);
    setError(null);

    try {
        // Get Irys client
        const irys = await getIrysClient();

        // Fund Bundlr (Irys) with the total price
        const amountToFund = BigInt(arweavePrice); // Convert string price to BigInt
        const balance = await irys.getBalance(irys.address);
        console.log('Current Irys balance:', balance.toString());

        // Check if funding is necessary
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
        setStep(5); // Move to Upload to Arweave step (step 5 in the new flow)

    } catch (err: any) {
        setError(err.message || 'Error funding Irys');
        console.error('Irys funding error:', err);
        setLoading(false);
    }
  };

  const handleArweaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure necessary info is available from previous steps
    if (!encryptedFilePath || !encryptionKey || !file?.name || !recipientAddress || !provider) {
        setError('Missing required information for Arweave upload. Please go back to previous steps.');
         console.error('Missing required information for handleArweaveUpload', { encryptedFilePath, encryptionKey, fileName: file?.name, recipientAddress, provider });
        return;
    }

    setLoading(true);
    setError(null);
    setArweaveUploadResult(null);

    try {
        // Get Irys client
        const irys = await getIrysClient();

        // 1. Fetch the encrypted file from the backend (already done in previous step, but re-fetching for upload)
        const fileId = getFileIdFromPath(encryptedFilePath);
        if (!fileId) {
          setError('Could not extract file ID from path');
          setLoading(false);
          return;
        }

        // Fetch encrypted file using API utility
        const encryptedFileBlob = await pdfApi.getEncryptedFile(fileId);

        // Log Blob details
        console.log('Fetched encrypted file Blob size:', encryptedFileBlob.size);
        console.log('Fetched encrypted file Blob type:', encryptedFileBlob.type);

        // Convert Blob to ArrayBuffer and then to Buffer for Irys upload
        const encryptedFileArrayBuffer = await encryptedFileBlob.arrayBuffer();
        // Use Buffer.from with the correct type for ArrayBuffer
        const encryptedFileBuffer = Buffer.from(encryptedFileArrayBuffer); // Convert ArrayBuffer to Buffer

        // Log Buffer size
        console.log('Encrypted file Buffer size after conversion:', encryptedFileBuffer.length);

        // 2. Upload the *encrypted file* to Arweave using the client-side Irys client
        console.log('Uploading encrypted file to Arweave using Irys...');

        // Log the buffer being sent to Irys
        console.log('Buffer being uploaded to Irys - Type:', typeof encryptedFileBuffer);
        console.log('Buffer being uploaded to Irys - Size:', encryptedFileBuffer.length);

        const fileTags = [
          { name: 'Content-Type', value: encryptedFileBlob.type || 'application/octet-stream' },
          { name: 'App-Name', value: 'EncryptedPDF-DApp' }, // Replace with your app name
          // Add other relevant tags if needed
        ];
        const fileUploadResponse = await irys.upload(encryptedFileBuffer, { tags: fileTags });

        console.log('Encrypted file Arweave upload successful:', fileUploadResponse);

        const arweaveId = fileUploadResponse.id;
        const arweaveUrl = `https://arweave.net/${arweaveId}`;

        // 3. Call the backend to *generate* the metadata JSON
         console.log('Calling backend to generate metadata before uploading metadata...');
        const metadataGenerationResponse = await pdfApi.generateMetadata({
            arweaveId: arweaveId, // Pass the Arweave ID from the file upload
            arweaveUrl: arweaveUrl, // Pass the Arweave URL from the file upload
            encryptionKey: encryptionKey, // Use the stored encryptionKey
            originalName: file.name, // Use the original file name
            recipientAddress: recipientAddress, // Get recipientAddress from state
            name: name,
            description: description || 'Encrypted PDF document with secure access'
        });

        const metadataJson = metadataGenerationResponse.metadata;
         console.log('Generated metadata for upload:', metadataJson);

        // 4. Upload the *metadata JSON* to Arweave using the client-side Irys client
        console.log('Uploading metadata JSON to Arweave using Irys...');
         const metadataTags = [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'App-Name', value: 'EncryptedPDF-DApp' }, // Replace with your app name
          // Add other relevant tags if needed
        ];
        const metadataUploadResponse = await irys.upload(JSON.stringify(metadataJson), { tags: metadataTags });

        console.log('Metadata Arweave upload successful:', metadataUploadResponse);

        const metadataArweaveId = metadataUploadResponse.id;
        const metadataArweaveUrl = `https://arweave.net/${metadataArweaveId}`;

        // 5. Call the backend's new /api/mint-nft endpoint to mint the NFT
        console.log('Calling backend for minting...');
        const mintResponse = await pdfApi.mintNft({
            arweaveId: arweaveId, // Arweave ID of the encrypted file
            arweaveUrl: arweaveUrl, // Arweave URL of the encrypted file
            metadataArweaveUrl: metadataArweaveUrl, // Arweave URL of the metadata
            encryptionKey: encryptionKey, // Use the stored encryptionKey
            originalName: file.name, // Use the original file name
            recipientAddress: recipientAddress, // Get recipientAddress from state
        });

        console.log('Backend minting response:', mintResponse);

        // Store the transaction request from the backend
        setArweaveUploadResult(mintResponse);

        setLoading(false);
        setStep(6); // Move to Mint NFT step (step 6 in the new flow)

    } catch (err: any) {
        setError(err.message || 'Error during Arweave upload or minting with Irys');
        console.error('Irys upload or minting error:', err);
        setLoading(false);
    }
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure transaction data is available from step 5
    if (!provider || !arweaveUploadResult?.transactionRequest) {
      setError('Missing wallet provider or transaction data. Please go back to the previous step.');
      console.error('Missing required information for handleMint', { provider, transactionRequest: arweaveUploadResult?.transactionRequest });
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
      // Assuming backend returns tokenId in arweaveUploadResult
      setMintResult({
        transactionHash: receipt.hash, // Use receipt.hash for the transaction hash
        tokenId: arweaveUploadResult.tokenId, // Assuming backend includes this in the response
        metadataUrl: arweaveUploadResult.metadataUrl
      });

      setLoading(false);
      setStep(7); // Move to final complete step (step 7 in the new flow)
    } catch (err: any) {
      setError(err.message || 'Error sending transaction');
      console.error('Transaction error:', err);
      // Log additional error details if available
      if (err.data) console.error('Error data:', err.data);
      if (err.reason) console.error('Error reason:', err.reason);
      if (err.code) console.error('Error code:', err.code);
      if (err.transaction) console.error('Failing transaction:', err.transaction);
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
    } catch (error: any) {
      console.error('Irys initialization error:', error);
      throw new Error(`Failed to initialize Irys: ${error.message}`);
    }
  };

  if (!account) {
    return (
      <div className="text-center py-12">
        <Wallet className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-white">No wallet connected</h3>
        <p className="mt-1 text-sm text-gray-400">Please connect your wallet to continue.</p>
        <button
          onClick={connectWallet}
          className="btn-primary mt-6 inline-flex items-center space-x-2"
        >
          <Wallet className="h-5 w-5" />
          <span>Connect Wallet</span>
        </button>
      </div>
    );
  }

  return (
    <div className="card-dark">
      <div className="flex justify-between mb-8">
        {/* Step 1: Upload */}
        <div className={`flex flex-col items-center ${step >= 1 ? 'text-purple-400' : 'text-gray-500'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-purple-500 bg-purple-500/20' : 'border-gray-600'}`}>
            <FileUp size={20} />
          </div>
          <span className="text-xs mt-1">Upload</span>
        </div>

        {/* Step 2: Details */}
        <div className={`flex-1 border-t-2 self-center ${step >= 2 ? 'border-purple-500' : 'border-gray-600'}`}></div>
        <div className={`flex flex-col items-center ${step >= 2 ? 'text-purple-400' : 'text-gray-500'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-purple-500 bg-purple-500/20' : 'border-gray-600'}`}>
            <CreditCard size={20} />
          </div>
          <span className="text-xs mt-1">Details</span>
        </div>

        {/* Step 3: Get Price */}
        <div className={`flex-1 border-t-2 self-center ${step >= 3 ? 'border-purple-500' : 'border-gray-600'}`}></div>
        <div className={`flex flex-col items-center ${step >= 3 ? 'text-purple-400' : 'text-gray-500'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-purple-500 bg-purple-500/20' : 'border-gray-600'}`}>
            <DollarSign size={20} />
          </div>
          <span className="text-xs mt-1">Get Price</span>
        </div>

        {/* Step 4: Fund Bundlr */}
        <div className={`flex-1 border-t-2 self-center ${step >= 4 ? 'border-purple-500' : 'border-gray-600'}`}></div>
        <div className={`flex flex-col items-center ${step >= 4 ? 'text-purple-400' : 'text-gray-500'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 4 ? 'border-purple-500 bg-purple-500/20' : 'border-gray-600'}`}>
            <Wallet size={20} />
          </div>
          <span className="text-xs mt-1">Fund Bundlr</span>
        </div>

        {/* Step 5: Upload to Arweave */}
        <div className={`flex-1 border-t-2 self-center ${step >= 5 ? 'border-purple-500' : 'border-gray-600'}`}></div>
        <div className={`flex flex-col items-center ${step >= 5 ? 'text-purple-400' : 'text-gray-500'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 5 ? 'border-purple-500 bg-purple-500/20' : 'border-gray-600'}`}>
            <Upload size={20} />
          </div>
          <span className="text-xs mt-1">Upload to Arweave</span>
        </div>

        {/* Step 6: Mint NFT */}
        <div className={`flex-1 border-t-2 self-center ${step >= 6 ? 'border-purple-500' : 'border-gray-600'}`}></div>
        <div className={`flex flex-col items-center ${step >= 6 ? 'text-purple-400' : 'text-gray-500'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 6 ? 'border-purple-500 bg-purple-500/20' : 'border-gray-600'}`}>
            <Wallet size={20} />
          </div>
          <span className="text-xs mt-1">Mint NFT</span>
        </div>

        {/* Step 7: Complete */}
        <div className={`flex-1 border-t-2 self-center ${step >= 7 ? 'border-purple-500' : 'border-gray-600'}`}></div>
        <div className={`flex flex-col items-center ${step >= 7 ? 'text-purple-400' : 'text-gray-500'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 7 ? 'border-purple-500 bg-purple-500/20' : 'border-gray-600'}`}>
            <Wallet size={20} />
          </div>
          <span className="text-xs mt-1">Complete</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleUpload}>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Select PDF File
            </label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <FileUp className="mx-auto text-gray-400 mb-2" size={40} />
                <p className="text-sm text-gray-300">
                  {file ? file.name : 'Drag & drop your PDF here or click to browse'}
                </p>
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !file}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Processing...' : 'Encrypt & Upload'}
          </button>
        </form>
      )}

      {/* Step 2: Enter Details */}
      {step === 2 && encryptedFilePath && encryptionKey && file?.name && recipientAddress !== undefined && name !== undefined && description !== undefined && (
        <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
          <div className="mb-6">
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-lg mb-6">
              <p className="font-medium">File successfully encrypted and uploaded!</p>
              <p className="text-sm mt-1">Encrypted file ID: {getFileIdFromPath(encryptedFilePath)}</p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-bold mb-2">
                Recipient Wallet Address (Polygon)
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="input-dark w-full"
                placeholder="0x..." // Assuming Polygon address format
                required
              />
            </div>

            {/* <div className="mb-4">
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
            </div> */}

            {/* <div className="mb-4">
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
            </div> */}

             <button
              type="submit"
              disabled={loading || !recipientAddress} // Require recipient address to proceed
              className="btn-primary w-full py-3"
            >
              Continue
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Get Total Price */}
      {step === 3 && encryptedFilePath && encryptionKey && file?.name && recipientAddress && (
        <form onSubmit={handleGetTotalArweavePrice}>
          <div className="mb-6">
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-lg mb-6">
              <p className="font-medium">Details captured!</p>
              <p className="text-sm mt-1">Ready to get total Arweave upload price.</p>
            </div>

            <button
              type="submit"
              disabled={loading || !encryptedFilePath || !encryptionKey || !file?.name || !recipientAddress}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Processing...' : 'Get Total Arweave Upload Price'}
            </button>
          </div>
        </form>
      )}

      {/* Step 4: Fund Bundlr */}
      {step === 4 && arweavePrice && provider && (
        <form onSubmit={handleFundBundlr}>
          <div className="mb-6">
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-lg mb-6">
              <p className="font-medium">Total Arweave price retrieved!</p>
              {arweavePrice && (
                <p className="text-sm mt-1">Total Arweave Price: {ethers.formatUnits(arweavePrice, 'wei')} wei</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !arweavePrice}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Processing...' : 'Fund Bundlr'}
            </button>
          </div>
        </form>
      )}

      {/* Step 5: Upload to Arweave */}
      {step === 5 && encryptedFilePath && encryptionKey && file?.name && recipientAddress && provider && (
        <form onSubmit={handleArweaveUpload}>
          <div className="mb-6">
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-lg mb-6">
              <p className="font-medium">Bundlr successfully funded!</p>
              <p className="text-sm mt-1">Ready to upload encrypted file and metadata to Arweave.</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Processing...' : 'Upload to Arweave'}
          </button>
        </form>
      )}

      {/* Step 6: Mint NFT */}
      {step === 6 && arweaveUploadResult && provider && (
        <div>
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-6 rounded-lg mb-6">
            <h3 className="font-bold text-lg mb-2">Files uploaded to Arweave!</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">File:</span> {file?.name}</p>
              <p><span className="font-medium">Recipient:</span> {recipientAddress}</p>
              <p>
                <span className="font-medium">Encrypted File Arweave URL:</span>{' '}
                <a
                  href={arweaveUploadResult.arweaveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {arweaveUploadResult.arweaveUrl}
                </a>
              </p>
               <p>
                <span className="font-medium">Metadata Arweave URL:</span>{' '}
                <a
                  href={arweaveUploadResult.metadataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {arweaveUploadResult.metadataUrl}
                </a>
              </p>
            </div>
          </div>

          <button
            onClick={handleMint}
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Minting...' : 'Mint NFT'}
          </button>
        </div>
      )}

       {/* Step 7: Complete */}
       {step === 7 && mintResult && (
        <div>
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-6 rounded-lg mb-6">
            <h3 className="font-bold text-lg mb-2">NFT Successfully Minted! 🎉</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Token ID:</span> {mintResult.tokenId}</p>
              <p>
                <span className="font-medium">Transaction:</span>{' '}
                <a 
                  href={`https://polygonscan.com/tx/${mintResult.transactionHash}`} 
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
          <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-lg text-blue-400 text-sm">
            <p className="font-medium">Important:</p>
            <p className="mt-1">The encryption key is stored in the NFT metadata. Only the NFT owner should have access to this key to decrypt the document.</p>
          </div>
          <button
            onClick={resetFlow}
            className="btn-primary w-full mt-6 py-3"
          >
            Start New Upload
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadPDF; 