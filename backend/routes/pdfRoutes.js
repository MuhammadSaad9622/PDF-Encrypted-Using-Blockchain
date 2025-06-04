import express from 'express';
import { encryptAndUpload,uploadAndEncrypt, decryptFile, getArweaveUploadPrice, generateMetadataJson, serveEncryptedFile, mintNftWithArweaveDetails, getTotalArweavePrice, getNFTMetadata } from '../controllers/pdfController.js';

const router = express.Router();

router.post('/encrypt-upload', encryptAndUpload);

// Route for decrypting PDF (requires NFT ownership)
router.post('/decrypt/:tokenId', decryptFile);

// New route to fetch NFT metadata from Arweave via backend
router.get('/nft-metadata/:tokenId', getNFTMetadata);

// Route to get Arweave upload price for file only (can be removed later if not needed)
router.post('/arweave-price', getArweaveUploadPrice);

// New route to generate metadata JSON
router.post('/generate-metadata', generateMetadataJson);

// New route to calculate total Arweave upload price for file and metadata
router.post('/total-arweave-price', getTotalArweavePrice);

// New route to handle NFT minting after frontend Arweave uploads
router.post('/mint-nft', mintNftWithArweaveDetails);

// Route to serve the encrypted file to the frontend
router.get('/encrypted-file/:fileId', serveEncryptedFile);

export default router;