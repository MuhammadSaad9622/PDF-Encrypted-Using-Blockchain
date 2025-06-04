import crypto from 'crypto';
import Bundlr from '@bundlr-network/client';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encryptFile, decryptData } from '../utils/encryption.js';
import { getUploadPrice, getBundlrAddress, bundlr } from '../utils/arweave.js';
import { generateMetadata } from '../utils/generateMetadata.js';
import { mintNFTWithMetadata, contractAddress } from '../utils/wallet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, '../temp');

export const encryptAndUpload = async (req, res) => {
  try {
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfFile = req.files.pdf;
    const fileId = crypto.randomUUID();
    const originalFilePath = path.join(tempDir, `${fileId}_original.pdf`);
    const encryptedFilePath = path.join(tempDir, `${fileId}_encrypted.pdf`);
    
    // Save original file temporarily
    await pdfFile.mv(originalFilePath);
    
    // Encrypt the file
    const encryptionKey = await encryptFile(originalFilePath, encryptedFilePath);
    
    console.log('Encryption successful. Generated encryptionKey:', encryptionKey);
    
    // Clean up original temporary file
    fs.unlinkSync(originalFilePath);
    // Keep the encrypted file in temp for the next step (Arweave upload)

    return res.status(200).json({
      success: true,
      fileId,
      encryptionKey,
      encryptedFilePath: encryptedFilePath, // Return the path to the encrypted file
      originalName: pdfFile.name
      // arweaveId and arweaveUrl will be returned after the Arweave upload step
    });
  } catch (error) {
    console.error('Error in encrypt-upload:', error);
    // Clean up encrypted file if something went wrong after encryption
    if (req.files && req.files.pdf && req.files.pdf.tempFilePath && fs.existsSync(req.files.pdf.tempFilePath)) {
        fs.unlinkSync(req.files.pdf.tempFilePath);
    }
    return res.status(500).json({ error: error.message });
  }
};

export const getArweaveUploadPrice = async (req, res) => {
    try {
        const { encryptedFilePath } = req.body; // Get the path from the request body

        if (!encryptedFilePath || !fs.existsSync(encryptedFilePath)) {
            return res.status(400).json({ error: 'Encrypted file not found or path missing' });
        }

        const price = await getUploadPrice(encryptedFilePath);
        const bundlrAddress = getBundlrAddress();

        return res.status(200).json({
            success: true,
            price: price, // Price in atomic units
            bundlrAddress: bundlrAddress,
        });
    } catch (error) {
        console.error('Error getting Arweave upload price:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const generateMetadataJson = async (req, res) => {
    // This function now receives arweaveId and arweaveUrl from the frontend
    // And generates and returns the metadata JSON
    try {
        const { arweaveId, arweaveUrl, encryptionKey, originalName, recipientAddress } = req.body;

        if (!arweaveId || !arweaveUrl || !encryptionKey || !originalName || !recipientAddress) {
             return res.status(400).json({ error: 'Missing required parameters (arweaveId, arweaveUrl, encryptionKey, originalName, or recipientAddress)' });
        }

        // Parse the encryptionKey string into an object
        let parsedEncryptionKey;
        try {
            parsedEncryptionKey = JSON.parse(encryptionKey);
            // Basic validation to ensure it has key and iv
            if (!parsedEncryptionKey || !parsedEncryptionKey.key || !parsedEncryptionKey.iv) {
                 throw new Error('Invalid encryptionKey format');
            }
        } catch (e) {
            console.error('Failed to parse encryptionKey string:', e);
            return res.status(400).json({ error: 'Invalid encryption key format provided.' });
        }

        // Generate metadata (using the received arweaveUrl)
        const metadata = generateMetadata({
            name: `Encrypted PDF: ${originalName}`,
            description: `Encrypted PDF document with secure access`,
            arweaveUrl: arweaveUrl,
            encryptionKey: parsedEncryptionKey, // Use the parsed object here
            originalName
        });

        console.log('Generated metadata for minting:', metadata);

        // Return the metadata JSON to the frontend
        return res.status(200).json({
            success: true,
            metadata: metadata,
        });

    } catch (error) {
        console.error('Error in generateMetadataJson:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const mintNftWithArweaveDetails = async (req, res) => {
    // This function handles minting after frontend Arweave uploads
    try {
        const { arweaveId, arweaveUrl, metadataArweaveUrl, encryptionKey, originalName, recipientAddress } = req.body;

        if (!arweaveId || !arweaveUrl || !metadataArweaveUrl || !encryptionKey || !originalName || !recipientAddress) {
             return res.status(400).json({ error: 'Missing required parameters for minting' });
        }

         // Parse the encryptionKey string into an object (needed for IV and key hash)
        let parsedEncryptionKey;
        try {
            parsedEncryptionKey = JSON.parse(encryptionKey);
            // Basic validation to ensure it has key and iv
            if (!parsedEncryptionKey || !parsedEncryptionKey.key || !parsedEncryptionKey.iv) {
                 throw new Error('Invalid encryptionKey format');
            }
        } catch (e) {
            console.error('Failed to parse encryptionKey string in mintNftWithArweaveDetails:', e);
            return res.status(400).json({ error: 'Invalid encryption key format provided for minting.' });
        }

        // Mint the NFT using the metadata Arweave URL and extracted details
    const mintResult = await mintNFTWithMetadata(
      recipientAddress,
            metadataArweaveUrl,
      arweaveId,
            parsedEncryptionKey.iv, // Use iv from the parsed object
             ethers.keccak256(ethers.toUtf8Bytes(parsedEncryptionKey.key)) // Use key from the parsed object
    );
    
    console.log('Prepared Mint transaction request:', mintResult);

    return res.status(200).json({
      success: true,
            transactionRequest: mintResult, // Return the transaction request for the frontend to sign and send
            metadataUrl: metadataArweaveUrl,
            arweaveId: arweaveId, // Return the arweaveId for confirmation
            arweaveUrl: arweaveUrl // Return the arweaveUrl for confirmation
        });

  } catch (error) {
        console.error('Error in mintNftWithArweaveDetails:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const mintNFT = async (req, res) => {
  // This function is now redundant
  console.log('MintNFT endpoint hit - this should not happen in the new flow unless intended.');
  return res.status(405).json({ error: 'Method not allowed in this flow.' });
};

export const decryptFile = async (req, res) => {
  try {
    console.log('Incoming request: POST /api/decrypt/' + req.params.tokenId);
    console.log('Attempting to decrypt file...');
    
    const { walletAddress } = req.body;
    const tokenId = req.params.tokenId;

    // Validate input parameters
    if (!walletAddress || !tokenId) {
      console.log('Missing required parameters for decryption (walletAddress or tokenId)');
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log('Decrypting file for token:', tokenId);

    // Initialize Ethereum provider
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com');

    if (!contractAddress) {
      console.error('Contract address not loaded in decryptFile');
      return res.status(500).json({ error: 'Contract address not configured in backend.' });
    }

    // Initialize contract instance
    const contract = new ethers.Contract(
      contractAddress,
      ['function ownerOf(uint256) view returns (address)', 'function tokenURI(uint256) view returns (string)'],
      provider
    );

    // Verify NFT ownership
    const owner = await contract.ownerOf(tokenId);
    if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
      console.log('Ownership verification failed. Owner:', owner, 'Wallet:', walletAddress);
      return res.status(403).json({ error: 'Not authorized to decrypt this file' });
    }

    console.log('Ownership verified for:', walletAddress);

    // Get tokenURI from contract
    const tokenURI = await contract.tokenURI(tokenId);
    console.log('Fetched tokenURI:', tokenURI);

    // Fetch metadata from tokenURI
    console.log('Fetching metadata from Arweave...', tokenURI);
    const metadataResponse = await fetch(tokenURI);
    if (!metadataResponse.ok) {
      console.error('Failed to fetch metadata from Arweave', metadataResponse.status, metadataResponse.statusText);
      throw new Error('Failed to fetch metadata from Arweave');
    }

    const metadata = await metadataResponse.json();
    console.log('Full metadata structure:', JSON.stringify(metadata, null, 2));

    // Parse encryption details
    let encryptionDetails;
    try {
      if (typeof metadata.properties?.encryption === 'string') {
        encryptionDetails = JSON.parse(metadata.properties.encryption);
      } else {
        encryptionDetails = metadata.properties?.encryption;
      }
    } catch (e) {
      console.error('Failed to parse encryption details:', e);
      throw new Error('Invalid encryption details format');
    }

    console.log('Parsed encryption details:', encryptionDetails);

    // Validate encryption details
    if (!encryptionDetails || 
        typeof encryptionDetails.key !== 'string' || 
        encryptionDetails.key.length === 0 || 
        typeof encryptionDetails.iv !== 'string' || 
        encryptionDetails.iv.length === 0) {
      console.error('Invalid encryption details:', encryptionDetails);
      throw new Error('Invalid encryption key or IV format');
    }

    // Extract Arweave ID from file URI
    if (!metadata.properties?.file?.uri) {
      console.error('File URI not found in metadata');
      throw new Error('File URI not found in metadata');
    }

    const arweaveId = metadata.properties.file.uri.split('/').pop();
    if (!arweaveId) {
      console.error('Arweave ID not found in metadata file URI', metadata.properties.file.uri);
      throw new Error('Arweave ID not found in metadata');
    }
    console.log('Extracted Arweave ID for file data:', arweaveId);

    // Fetch encrypted data from Arweave
    console.log('Fetching encrypted data from Arweave...', `https://arweave.net/${arweaveId}`);
    const response = await fetch(`https://arweave.net/${arweaveId}`);
    if (!response.ok) {
      console.error('Failed to fetch encrypted data from Arweave', response.status, response.statusText);
      throw new Error('Failed to fetch encrypted data from Arweave');
    }

    const encryptedData = await response.text();
    console.log('Encrypted data length:', encryptedData.length);

    // Decrypt the file
    console.log('Decrypting data using encryption utility...');
    const decrypted = decryptData(encryptedData, {
      key: encryptionDetails.key,
      iv: encryptionDetails.iv
    });
    console.log('Decrypted data length:', decrypted.length);

    // Log the first few bytes of the decrypted data to inspect
    console.log('First 10 bytes of decrypted data:', decrypted.slice(0, 10));

    // Send the decrypted file
    console.log('Sending decrypted PDF data...');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${metadata.properties.file.name}`);
    res.end(decrypted);

  } catch (error) {
    console.error('Error in decryptFile:', error);
    res.status(500).json({ 
      error: 'Failed to decrypt file',
      details: error.message 
    });
  }
};

// New controller function to serve the encrypted file
export const serveEncryptedFile = async (req, res) => {
  try {
    const { fileId } = req.params; // Get fileId from route parameters
    const encryptedFileName = `${fileId}_encrypted.pdf`;
    const encryptedFilePath = path.join(tempDir, encryptedFileName);

    console.log(`Attempting to serve file at: ${encryptedFilePath}`);

    // Check if the file exists
    if (!fs.existsSync(encryptedFilePath)) {
      console.error(`Encrypted file not found: ${encryptedFilePath}`);
      return res.status(404).json({ error: 'Encrypted file not found.' });
    }

    // Send the file
    res.setHeader('Content-Type', 'application/octet-stream'); // Or appropriate content type if known
    const readStream = fs.createReadStream(encryptedFilePath);
    console.log('Read stream created for file:', encryptedFilePath);

    readStream.on('data', (chunk) => {
      console.log('Streaming chunk of size:', chunk.length);
    });

    readStream.pipe(res);
    
    readStream.on('error', (err) => {
      console.error('Error streaming encrypted file:', err);
      res.status(500).send('Error serving file');
    });
    
    readStream.on('end', () => {
      console.log('Finished streaming encrypted file.');
      // Optional: Clean up the temporary file after it has been served successfully.
      // This depends on your cleanup strategy. You might prefer a scheduled cleanup task.
       if (fs.existsSync(encryptedFilePath)) {
           fs.unlinkSync(encryptedFilePath);
       }
    });

  } catch (error) {
    console.error('Error in serveEncryptedFile:', error);
    return res.status(500).json({ error: error.message });
  }
};

// New controller function to calculate total Arweave upload price for file and metadata
export const getTotalArweavePrice = async (req, res) => {
    try {
        const { encryptedFilePath, originalName, recipientAddress, name, description, arweaveId, arweaveUrl, encryptionKey } = req.body;

        // Validate encrypted file path
        if (!encryptedFilePath || !fs.existsSync(encryptedFilePath)) {
            return res.status(400).json({ error: 'Encrypted file not found or path missing' });
        }

        // 1. Get price for the encrypted file
        const filePrice = await getUploadPrice(encryptedFilePath);
        const filePriceBigInt = BigInt(filePrice); // Convert price string to BigInt

        // 2. Generate metadata JSON (needed to calculate its size for pricing)
         let parsedEncryptionKey;
        try {
            parsedEncryptionKey = JSON.parse(encryptionKey);
             if (!parsedEncryptionKey || !parsedEncryptionKey.key || !parsedEncryptionKey.iv) {
                 throw new Error('Invalid encryptionKey format');
            }
        } catch (e) {
             console.error('Failed to parse encryptionKey string in getTotalArweavePrice:', e);
            return res.status(400).json({ error: 'Invalid encryption key format provided.' });
        }

        const metadata = generateMetadata({
            name: name || `Encrypted PDF: ${originalName}`,
            description: description || 'Encrypted PDF document with secure access',
            arweaveUrl: arweaveUrl, // Note: arweaveUrl might not be available yet here, using file's expected URL
            encryptionKey: parsedEncryptionKey,
            originalName: originalName
        });

        const metadataString = JSON.stringify(metadata);

        // 3. Get price for the metadata JSON
        // Use the bundlr instance imported from arweave.js for pricing
        const metadataPrice = await bundlr.getPrice(Buffer.byteLength(metadataString));
        const metadataPriceBigInt = BigInt(metadataPrice.toString()); // Convert BigNumber price to BigInt

        // 4. Calculate total price
        const totalprice = filePriceBigInt + metadataPriceBigInt;

        console.log(`Total upload cost (file + metadata): ${totalprice.toString()} atomic units`);

        return res.status(200).json({
            success: true,
            totalPrice: totalprice.toString(), // Return total price as string
            bundlrAddress: getBundlrAddress(), // Include bundlr address for frontend funding
        });

    } catch (error) {
        console.error('Error getting total Arweave upload price:', error);
    return res.status(500).json({ error: error.message });
  }
};