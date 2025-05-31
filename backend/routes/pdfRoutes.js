import express from 'express';
import { encryptAndUpload, mintNFT, uploadAndEncrypt, decryptFile } from '../controllers/pdfController.js';

const router = express.Router();

router.post('/encrypt-upload', encryptAndUpload);
router.post('/mint-nft', mintNFT);

// Route for uploading and encrypting PDF
router.post('/upload', uploadAndEncrypt);

// Route for decrypting PDF (requires NFT ownership)
router.post('/decrypt/:tokenId', decryptFile);

export default router;