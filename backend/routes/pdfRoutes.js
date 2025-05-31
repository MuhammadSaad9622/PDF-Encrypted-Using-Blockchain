import express from 'express';
import { encryptAndUpload, mintNFT, decryptFile, getArweaveUploadPrice, uploadToArweavePreFunded, serveEncryptedFile } from '../controllers/pdfController.js';

const router = express.Router();

router.post('/encrypt-upload', encryptAndUpload);
router.post('/mint-nft', mintNFT);

// Route for decrypting PDF (requires NFT ownership)
router.post('/decrypt/:tokenId', decryptFile);

// New route to get Arweave upload price
router.post('/arweave-price', getArweaveUploadPrice);

// New route to upload to Arweave after funding
router.post('/arweave-upload', uploadToArweavePreFunded);

// New route to serve the encrypted file to the frontend
router.get('/encrypted-file/:fileId', serveEncryptedFile);

export default router;