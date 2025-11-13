import User from '../models/User.js';
import { ethers } from 'ethers';
import { contractAddress } from '../utils/wallet.js';

// Get user statistics
export const getUserStats = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user's wallet address
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.walletAddress) {
      return res.status(200).json({
        success: true,
        stats: {
          totalPDFs: 0,
          totalNFTs: 0,
          recentActivity: [],
          monthlyStats: [],
          walletAddress: null
        }
      });
    }

    // Initialize provider and contract
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com');
    
    if (!contractAddress) {
      return res.status(200).json({
        success: true,
        stats: {
          totalPDFs: 0,
          totalNFTs: 0,
          recentActivity: [],
          monthlyStats: []
        }
      });
    }

    const contract = new ethers.Contract(
      contractAddress,
      [
        'function balanceOf(address owner) view returns (uint256)',
        'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
        'function tokenURI(uint256 tokenId) view returns (string)'
      ],
      provider
    );

    // Get total NFTs owned
    const balance = await contract.balanceOf(user.walletAddress);
    const totalNFTs = Number(balance);

    // Get recent NFTs (last 10)
    const recentNFTs = [];
    const nftCount = Math.min(totalNFTs, 10);
    
    for (let i = 0; i < nftCount; i++) {
      try {
        const tokenId = await contract.tokenOfOwnerByIndex(user.walletAddress, i);
        const tokenURI = await contract.tokenURI(tokenId);
        recentNFTs.push({
          tokenId: tokenId.toString(),
          tokenURI: tokenURI
        });
      } catch (error) {
        console.error(`Error fetching NFT ${i}:`, error);
      }
    }

    // Calculate monthly stats (last 6 months)
    const monthlyStats = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      
      // For now, distribute NFTs evenly across months (in real app, track creation dates)
      const count = i === 5 ? Math.floor(totalNFTs / 6) : Math.floor(totalNFTs / 6);
      
      monthlyStats.push({
        month: `${monthName} ${year}`,
        count: count,
        monthIndex: date.getMonth(),
        year: date.getFullYear()
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalPDFs: totalNFTs, // PDFs are stored as NFTs
        totalNFTs: totalNFTs,
        recentActivity: recentNFTs.slice(0, 5), // Last 5 NFTs
        monthlyStats: monthlyStats,
        walletAddress: user.walletAddress
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ 
      error: error.message || 'Error fetching statistics',
      stats: {
        totalPDFs: 0,
        totalNFTs: 0,
        recentActivity: [],
        monthlyStats: []
      }
    });
  }
};

