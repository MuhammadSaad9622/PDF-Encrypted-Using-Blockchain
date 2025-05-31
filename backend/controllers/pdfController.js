import crypto from 'crypto';
import Bundlr from '@bundlr-network/client';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encryptFile, decryptData } from '../utils/encryption.js';
import { getUploadPrice, getBundlrAddress } from '../utils/arweave.js';
import { generateMetadata, uploadMetadata } from '../utils/generateMetadata.js';
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

export const uploadToArweavePreFunded = async (req, res) => {
    // This function now receives arweaveId and arweaveUrl from the frontend
    try {
        // Removed file path handling as upload happens on frontend
        // const { encryptedFilePath } = req.body; 

        // Get arweaveId and arweaveUrl from the request body
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

        // Generate and upload metadata (using the received arweaveUrl)
        const metadata = generateMetadata({
            name: `Encrypted PDF: ${originalName}`,
            description: `Encrypted PDF document with secure access`,
            arweaveUrl: arweaveUrl,
            encryptionKey: parsedEncryptionKey, // Use the parsed object here
            originalName
        });

        console.log('Generated metadata for minting:', metadata);

        const metadataResult = await uploadMetadata(metadata);
        console.log('Uploaded metadata for minting to Arweave:', metadataResult.url);

        // Mint the NFT
         const mintResult = await mintNFTWithMetadata(
            recipientAddress,
            `https://arweave.net/${metadataResult.id}`,
            arweaveId,
            parsedEncryptionKey.iv, // Use iv from the parsed object
             ethers.keccak256(ethers.toUtf8Bytes(parsedEncryptionKey.key)) // Use key from the parsed object
        );

        console.log('Prepared Mint transaction request:', mintResult);

        return res.status(200).json({
            success: true,
            transactionRequest: mintResult, // Return the transaction request for the frontend to sign and send
            metadataUrl: `https://arweave.net/${metadataResult.id}`,
            arweaveId: arweaveId, // Return the arweaveId for confirmation
            arweaveUrl: arweaveUrl // Return the arweaveUrl for confirmation
        });

    } catch (error) {
        console.error('Error in uploadToArweavePreFunded (now handles minting):', error);
        // Clean up the encrypted temporary file if upload failed (this logic might need adjustment)
        // if (encryptedFilePath && fs.existsSync(encryptedFilePath)) {
        //      fs.unlinkSync(encryptedFilePath);
        // }
        return res.status(500).json({ error: error.message });
    }
};

export const mintNFT = async (req, res) => {
  // This function is now redundant as minting is handled in uploadToArweavePreFunded
  // It can be removed or repurposed if needed for a different flow.
  console.log('MintNFT endpoint hit - this should not happen in the new flow unless intended.');
  return res.status(405).json({ error: 'Method not allowed in this flow.' });
};

export const decryptFile = async (req, res) => {
  try {
    console.log('Incoming request: POST /api/decrypt/' + req.params.tokenId);
    
    const { walletAddress } = req.body;
    const tokenId = req.params.tokenId;

    // Validate input parameters
    if (!walletAddress || !tokenId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Initialize Ethereum provider
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com');
    const contract = new ethers.Contract(
      contractAddress,
      ['function ownerOf(uint256) view returns (address)', 'function tokenURI(uint256) view returns (string)'],
      provider
    );

    // Verify NFT ownership
    const owner = await contract.ownerOf(tokenId);
    if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to decrypt this file' });
    }

    // Get tokenURI from contract
    const tokenURI = await contract.tokenURI(tokenId);
    console.log('Fetched tokenURI:', tokenURI);

    // Fetch metadata from tokenURI
    const metadataResponse = await fetch(tokenURI);
    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch metadata from ${tokenURI}. Status: ${metadataResponse.status}`);
    }

    const metadata = await metadataResponse.json();
    console.log('Metadata received:', JSON.stringify(metadata, null, 2));

    // Get encryption details from metadata
    let encryptionDetails = metadata.properties?.encryption;
    if (!encryptionDetails) {
      throw new Error('No encryption details found in metadata');
    }

    // Handle different encryption details formats
    if (typeof encryptionDetails === 'string') {
      try {
        // Try to parse as JSON first
        encryptionDetails = JSON.parse(encryptionDetails);
      } catch (e) {
        console.log('Encryption details is not JSON, treating as raw key string');
        // Handle as raw key string format (adjust based on your actual format)
        encryptionDetails = {
          key: encryptionDetails.slice(0, 64),  // First 64 chars as key (32 bytes hex)
          iv: encryptionDetails.slice(64, 96)   // Next 32 chars as IV (16 bytes hex)
        };
      }
    }

    // Validate encryption details
    if (!encryptionDetails.key || !encryptionDetails.iv) {
      console.error('Invalid encryption details:', encryptionDetails);
      throw new Error('Encryption details missing key or IV');
    }

    console.log('Using encryption details:', encryptionDetails);

    // Fetch the encrypted file from Arweave
    const arweaveUrl = metadata.properties?.file?.uri;
    if (!arweaveUrl) {
      throw new Error('Arweave URL not found in metadata');
    }

    console.log('Fetching encrypted file from:', arweaveUrl);
    const encryptedFileResponse = await fetch(arweaveUrl);
    if (!encryptedFileResponse.ok) {
      throw new Error(`Failed to fetch encrypted file from ${arweaveUrl}. Status: ${encryptedFileResponse.status}`);
    }

    // Get encrypted data
    const encryptedData = await encryptedFileResponse.text();
    console.log('Encrypted data length:', encryptedData.length);

    // Decrypt the file
    console.log('Starting decryption...');
    const decryptedData = decryptData(encryptedData, encryptionDetails);
    console.log('Decryption successful');

    // Return the decrypted file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="decrypted_${metadata.originalName || 'file.pdf'}"`);
    res.send(decryptedData);

  } catch (error) {
    console.error('Error in decrypt-file:', error);
    return res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      suggestion: 'Please verify the encryption details format matches what was used during encryption'
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
    res.download(encryptedFilePath, encryptedFileName, (err) => {
      if (err) {
        console.error('Error serving encrypted file:', err);
        // If there is an error sending the file, clean up the temporary file.
         if (fs.existsSync(encryptedFilePath)) {
             fs.unlinkSync(encryptedFilePath);
         }
        // Note: In a production environment, you might want more robust error handling
        // and potentially not delete the file immediately if the download failed mid-transfer.
      }
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