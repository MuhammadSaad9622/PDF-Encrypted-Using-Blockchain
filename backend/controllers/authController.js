import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Sign up
export const signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists (use normalized email)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user (use normalized email)
    const user = new User({
      email: normalizedEmail,
      password,
      name: name || ''
    });

    await user.save();

    // Generate token (convert _id to string)
    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error stack:', error.stack);
    
    // Handle MongoDB duplicate key error (unique index violation)
    if (error.code === 11000 || error.code === 11001) {
      const field = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'email';
      // Map username to email for better error message
      const fieldName = field === 'username' ? 'email' : field;
      return res.status(400).json({ error: `User with this ${fieldName} already exists` });
    }
    
    // Handle MongoDB connection errors
    if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
      console.error('MongoDB connection error during signup:', error.message);
      return res.status(503).json({ error: 'Database connection error. Please try again.' });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    
    res.status(500).json({ 
      error: error.message || 'Error creating user',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Sign in
export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Find user (use normalized email)
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token (convert _id to string)
    const token = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: error.message || 'Error signing in' });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        website: user.website,
        company: user.company,
        jobTitle: user.jobTitle,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: error.message || 'Error fetching user' });
  }
};

// Update wallet address
export const updateWalletAddress = async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.walletAddress = walletAddress;
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        website: user.website,
        company: user.company,
        jobTitle: user.jobTitle
      }
    });
  } catch (error) {
    console.error('Update wallet address error:', error);
    res.status(500).json({ error: error.message || 'Error updating wallet address' });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, profilePhoto, bio, phone, location, website, company, jobTitle } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields if provided
    if (name !== undefined) user.name = name;
    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: req.userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already taken' });
      }
      user.email = normalizedEmail;
    }
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    if (bio !== undefined) user.bio = bio;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (company !== undefined) user.company = company;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;
    
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        phone: user.phone,
        location: user.location,
        website: user.website,
        company: user.company,
        jobTitle: user.jobTitle,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message || 'Error updating profile' });
  }
};

