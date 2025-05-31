import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get contract address from file
export let contractAddress; // Export the contractAddress variable
try {
  const contractAddressFile = path.join(__dirname, '../contractAddress.json');
  if (fs.existsSync(contractAddressFile)) {
    const contractData = JSON.parse(fs.readFileSync(contractAddressFile, 'utf8'));
    contractAddress = contractData.address;
  } else {
      console.error('Error: contractAddress.json not found. Please ensure the contract address is set up.');
      // Optionally, you might want to exit or prevent the server from starting without the address
  }
} catch (error) {
  console.error('Error reading contract address from file:', error);
}

// Initialize provider
const provider = new ethers.JsonRpcProvider(
  process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com'
);

// Get contract ABI from file
const getContractABI = () => {
  try {
    const artifactPath = path.join(__dirname, '../PdfNFT.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    console.log('ABI file path is:', artifactPath);
    // Return the inner ABI array
    if (Array.isArray(artifact.abi) && Array.isArray(artifact.abi[0])) {
        console.log('Returning nested ABI array');
        return artifact.abi[0];
    } else if (Array.isArray(artifact.abi)) {
        console.log('Returning flat ABI array');
        return artifact.abi;
    } else {
        throw new Error('Invalid ABI format in PdfNFT.json');
    }
  } catch (error) {
    console.error('Error reading contract ABI:', error);
    throw new Error('Contract ABI not found or invalid format. Make sure the file is in the correct location and format.');
  }
};

/**
 * Prepares the transaction data for minting an NFT with the given metadata URI, Arweave ID, IV, and encryption key hash
 * @param {string} recipientAddress - Address to mint the NFT to
 * @param {string} metadataUri - URI of the metadata on Arweave
 * @param {string} arweaveId - Arweave transaction ID of the encrypted PDF
 * @param {string} iv - Initialization Vector used for encryption
 * @param {bytes32} encryptionKeyHash - Hash of the encryption key
 * @returns {Promise<object>} - Transaction request object
 */
export const mintNFTWithMetadata = async (
  recipientAddress,
  metadataUri,
  arweaveId,
  iv,
  encryptionKeyHash
) => {
  try {
    if (!contractAddress) {
      throw new Error('Contract address not found. Deploy the contract first.');
    }

    const abi = getContractABI();
    // Initialize contract instance with provider only, no signer needed for preparing tx
    const contract = new ethers.Contract(contractAddress, abi, provider);

    console.log('Preparing mint transaction data with:', {
      to: recipientAddress,
      tokenURI: metadataUri,
      arweaveId,
      iv,
      encryptionKeyHash: encryptionKeyHash // Pass as bytes32
    });

    // Encode the transaction data
    const data = contract.interface.encodeFunctionData("mint", [
      recipientAddress,
      metadataUri,
      arweaveId,
      iv,
      encryptionKeyHash
    ]);

    // Prepare the transaction request object
    const transactionRequest = {
      to: contractAddress,
      data: data,
      // Add gas price, gas limit, nonce if needed (can often be estimated on frontend)
      // value: ethers.parseEther("0.00"), // Example for sending ETH
    };

    console.log('Prepared transaction request:', transactionRequest);

    // Return the transaction request object for the frontend to sign and send
    return transactionRequest;
  } catch (error) {
    console.error('Error preparing mint transaction:', error);
    throw error;
  }
};