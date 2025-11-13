import express from 'express';
import { signup, signin, getCurrentUser, updateWalletAddress, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/me', authenticate, getCurrentUser);
router.put('/wallet', authenticate, updateWalletAddress);
router.put('/profile', authenticate, updateProfile);

export default router;

