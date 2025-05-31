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

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(
  process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com'
);

// Set private key directly for testing
const privateKey = 'f'; // Replace this with your actual private key

const wallet = new ethers.Wallet(privateKey, provider);

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
 * Mints an NFT with the given metadata URI, Arweave ID, IV, and encryption key hash
 * @param {string} recipientAddress - Address to mint the NFT to
 * @param {string} metadataUri - URI of the metadata on Arweave
 * @param {string} arweaveId - Arweave transaction ID of the encrypted PDF
 * @param {string} iv - Initialization Vector used for encryption
 * @param {bytes32} encryptionKeyHash - Hash of the encryption key
 * @returns {Promise<{tokenId: number, transactionHash: string}>} - Token ID and transaction hash
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
    
    const abi = getContractABI(); // Use the hardcoded ABI
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    
    console.log('Calling contract.mint with:', {
      to: recipientAddress,
      tokenURI: metadataUri,
      arweaveId,
      iv,
      encryptionKeyHash: encryptionKeyHash // Pass as bytes32
    });

    // Mint the NFT with all required arguments
    const tx = await contract.mint(
      recipientAddress,
      metadataUri,
      arweaveId,
      iv,
      encryptionKeyHash
    );
    
    console.log('Mint transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Mint transaction confirmed:', receipt.hash);

    // Get the token ID from the event
    const event = receipt.logs
      .filter(log => log.topics[0] === ethers.id('NFTMinted(uint256,address,string,string)')) // Updated event signature
      .map(log => {
        const parsedLog = contract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        return parsedLog.args;
      })[0];

    console.log('Minted Token ID:', event[0].toString());
    
    return {
      tokenId: event[0].toString(), // Return as string
      transactionHash: receipt.hash
    };
  } catch (error) {
    console.error('Error minting NFT:', error);
    throw error;
  }
};