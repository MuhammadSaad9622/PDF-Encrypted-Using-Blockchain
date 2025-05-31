import crypto from 'crypto';
import Bundlr from '@bundlr-network/client';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { encryptFile, decryptData } from '../utils/encryption.js';
import { uploadToArweave } from '../utils/arweave.js';
import { generateMetadata, uploadMetadata } from '../utils/generateMetadata.js';
import { mintNFTWithMetadata, contractAddress } from '../utils/wallet.js';
import e from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, '../temp');

// Initialize Bundlr client
const bundlr = new Bundlr(
  'https://node1.bundlr.network',
  'matic',
  'f',
  {
    providerUrl: 'https://polygon-rpc.com'
  }
);

export const encryptAndUpload = async (req, res) => {
  try {
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfFile = req.files.pdf;
    const fileId = uuidv4();
    const originalFilePath = path.join(tempDir, `${fileId}_original.pdf`);
    const encryptedFilePath = path.join(tempDir, `${fileId}_encrypted.pdf`);
    
    // Save original file temporarily
    await pdfFile.mv(originalFilePath);
    
    // Encrypt the file
    const encryptionKey = await encryptFile(originalFilePath, encryptedFilePath);
    
    // Upload to Arweave via Bundlr
    const arweaveResult = await uploadToArweave(encryptedFilePath);
    
    // Clean up temporary files
    fs.unlinkSync(originalFilePath);
    fs.unlinkSync(encryptedFilePath);
    
    return res.status(200).json({
      success: true,
      fileId,
      encryptionKey,
      arweaveId: arweaveResult.id,
      arweaveUrl: `https://arweave.net/${arweaveResult.id}`,
      originalName: pdfFile.name
    });
  } catch (error) {
    console.error('Error in encrypt-upload:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const mintNFT = async (req, res) => {
  try {
    const { arweaveId, encryptionKey, recipientAddress, name, description, originalName } = req.body;
    
    if (!arweaveId || !encryptionKey || !recipientAddress) {
      console.log('Missing required parameters for minting');
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log('Minting NFT with data:', { arweaveId, recipientAddress, name, description, originalName });

    // Generate and upload metadata
    const metadata = generateMetadata({
      name: name || `Encrypted PDF: ${originalName}`,
      description: description || `Encrypted PDF document with secure access`,
      arweaveUrl: `https://arweave.net/${arweaveId}`,
      // Pass the full encryption key object received from the frontend
      encryptionKey,
      originalName
    });
    
    console.log('Generated metadata:', metadata);

    const metadataResult = await uploadMetadata(metadata);
    console.log('Uploaded metadata to Arweave:', metadataResult.url);
    
    // Parse the encryption key and IV from the JSON string
    let parsedEncryptionKey;
    try {
      parsedEncryptionKey = JSON.parse(encryptionKey);
      if (!parsedEncryptionKey.key || !parsedEncryptionKey.iv) {
         throw new Error('Invalid encryption key format');
      }
    } catch (e) {
      console.error('Failed to parse encryption key JSON:', e);
      return res.status(400).json({ error: 'Invalid encryption key format' });
    }

    // Hash the encryption key (not the IV)
    const encryptionKeyHash = ethers.keccak256(ethers.toUtf8Bytes(parsedEncryptionKey.key));
    console.log('Generated encryption key hash:', encryptionKeyHash);

    // Mint NFT with all parameters
    const mintResult = await mintNFTWithMetadata(
      recipientAddress,
      `https://arweave.net/${metadataResult.id}`,
      arweaveId,
      parsedEncryptionKey.iv,
      encryptionKeyHash
    );
    
    console.log('NFT Minted successfully:', mintResult);

    return res.status(200).json({
      success: true,
      tokenId: mintResult.tokenId,
      transactionHash: mintResult.transactionHash,
      metadataUrl: `https://arweave.net/${metadataResult.id}`
    });
  } catch (error) {
    console.error('Error in mint-nft:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const uploadAndEncrypt = async (req, res) => {
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
    
    // Upload to Arweave
    const arweaveResult = await uploadToArweave(encryptedFilePath);
    
    // Clean up temporary files
    fs.unlinkSync(originalFilePath);
    fs.unlinkSync(encryptedFilePath);
    
    // Return the necessary data for NFT minting
    res.json({
      arweaveId: arweaveResult.id,
      arweaveUrl: arweaveResult.url,
      encryptionKey,
      metadata: {
        name: pdfFile.name,
        description: 'Encrypted PDF NFT',
        image: arweaveResult.url,
        properties: {
          file: {
            name: pdfFile.name,
            type: pdfFile.mimetype,
            size: pdfFile.size
          },
          encryption: {
            algorithm: 'AES-256-CBC'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in uploadAndEncrypt:', error);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
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

    // Send the decrypted file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${metadata.properties.file.name}`);
    console.log('Sending decrypted PDF data...');
    res.send(decrypted);

  } catch (error) {
    console.error('Error in decryptFile:', error);
    res.status(500).json({ 
      error: 'Failed to decrypt file',
      details: error.message 
    });
  }
};