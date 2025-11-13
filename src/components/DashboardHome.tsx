import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Upload, FileText, Shield, Zap, TrendingUp, BarChart3, Activity, RefreshCw, Wallet } from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '../App';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from '../utils/constants';
import { useTheme, getGradientClasses } from '../utils/theme';

interface MonthlyStat {
  month: string;
  count: number;
  monthIndex: number;
  year: number;
}

interface UserStats {
  totalPDFs: number;
  totalNFTs: number;
  recentActivity: any[];
  monthlyStats: MonthlyStat[];
  walletAddress?: string;
}

const DashboardHome = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();
  const { account, provider, connectWallet } = useWallet();
  const { colorScheme } = useTheme();

  const fetchStatsFromContract = async (showRefreshing = false) => {
    if (!account || !provider) {
      setStats({
        totalPDFs: 0,
        totalNFTs: 0,
        recentActivity: [],
        monthlyStats: [],
        walletAddress: null
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const contract = new ethers.Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      );

      // Get total NFTs owned
      const balance = await contract.balanceOf(account);
      const totalNFTs = Number(balance);

      // Get recent NFTs (last 10) in parallel
      const recentNFTs = [];
      const nftCount = Math.min(totalNFTs, 10);
      
      if (nftCount > 0) {
        const tokenIdPromises = [];
        for (let i = 0; i < nftCount; i++) {
          tokenIdPromises.push(contract.tokenOfOwnerByIndex(account, i));
        }
        const tokenIds = await Promise.all(tokenIdPromises);
        
        // Get token URIs in parallel
        const tokenURIPromises = tokenIds.map(tokenId => contract.tokenURI(tokenId));
        const tokenURIs = await Promise.all(tokenURIPromises);
        
        recentNFTs.push(...tokenIds.map((tokenId, index) => ({
          tokenId: tokenId.toString(),
          tokenURI: tokenURIs[index]
        })));
      }

      // Calculate monthly stats (last 6 months)
      // For now, distribute NFTs evenly (in production, track creation dates from events)
      const monthlyStats = [];
      const currentDate = new Date();
      const nftsPerMonth = Math.floor(totalNFTs / 6);
      const remainder = totalNFTs % 6;
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        
        // Distribute remainder to most recent months
        const count = i >= (6 - remainder) ? nftsPerMonth + 1 : nftsPerMonth;
        
        monthlyStats.push({
          month: `${monthName} ${year}`,
          count: count,
          monthIndex: date.getMonth(),
          year: date.getFullYear()
        });
      }

      setStats({
        totalPDFs: totalNFTs, // PDFs are stored as NFTs
        totalNFTs: totalNFTs,
        recentActivity: recentNFTs.slice(0, 5), // Last 5 NFTs
        monthlyStats: monthlyStats,
        walletAddress: account
      });
    } catch (error) {
      console.error('Error fetching stats from contract:', error);
      setStats({
        totalPDFs: 0,
        totalNFTs: 0,
        recentActivity: [],
        monthlyStats: [],
        walletAddress: account
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatsFromContract();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(() => fetchStatsFromContract(false), 30000);
    
    // Also refresh when user comes back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatsFromContract(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [account, provider]);

  // Refresh when navigating to dashboard or wallet changes
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      fetchStatsFromContract(false);
    }
  }, [location.pathname, account]);

  // Calculate max value for chart scaling
  const maxCount = stats?.monthlyStats.length 
    ? Math.max(...stats.monthlyStats.map(s => s.count), 1) 
    : 1;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`card-dark bg-gradient-to-r ${getGradientClasses(colorScheme, 'dark')} border-opacity-20 border-current`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total PDFs</p>
              <p className="text-3xl font-bold text-white">
                {loading ? '...' : stats?.totalPDFs || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Encrypted documents</p>
            </div>
            <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${getGradientClasses(colorScheme, 'medium')} flex items-center justify-center`}>
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className={`card-dark bg-gradient-to-r ${getGradientClasses(colorScheme, 'dark')} border-opacity-20 border-current`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total NFTs</p>
              <p className="text-3xl font-bold text-white">
                {loading ? '...' : stats?.totalNFTs || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Owned tokens</p>
            </div>
            <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${getGradientClasses(colorScheme, 'medium')} flex items-center justify-center`}>
              <Activity className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className={`card-dark bg-gradient-to-r ${getGradientClasses(colorScheme, 'dark')} border-opacity-20 border-current`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Reports Generated</p>
              <p className="text-3xl font-bold text-white">
                {loading ? '...' : stats?.totalPDFs || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">This account</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Statistics Chart */}
        <div className="card-dark">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <span>Monthly Activity</span>
            </h2>
            <button
              onClick={() => fetchStatsFromContract(true)}
              disabled={refreshing}
              className="btn-secondary p-2"
              title="Refresh stats"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {!account ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Wallet className="h-12 w-12 mb-4 opacity-50" />
              <p>Connect your wallet to view analytics</p>
              <button
                onClick={connectWallet}
                className="btn-primary mt-4 inline-flex items-center space-x-2"
              >
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : stats?.monthlyStats && stats.monthlyStats.length > 0 ? (
            <div className="space-y-4">
              {/* Chart Bars */}
              <div className="flex items-end justify-between h-48 space-x-2">
                {stats.monthlyStats.map((stat, index) => {
                  const height = (stat.count / maxCount) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full flex flex-col items-center justify-end h-full">
                        <div
                          className={`w-full rounded-t-lg bg-gradient-to-t ${getGradientClasses(colorScheme, 'primary')} transition-all hover:opacity-80 cursor-pointer`}
                          style={{ height: `${height}%`, minHeight: stat.count > 0 ? '4px' : '0' }}
                          title={`${stat.month}: ${stat.count} PDFs`}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        {stat.month.split(' ')[0]}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{stat.count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
              <p>No data available yet</p>
              <p className="text-sm mt-2">Upload your first PDF to see statistics</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card-dark">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-400" />
              <span>Recent Activity</span>
            </h2>
            <button
              onClick={() => fetchStatsFromContract(true)}
              disabled={refreshing}
              className="btn-secondary p-2"
              title="Refresh stats"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {!account ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Wallet className="h-12 w-12 mb-4 opacity-50" />
              <p>Connect your wallet to view analytics</p>
              <button
                onClick={connectWallet}
                className="btn-primary mt-4 inline-flex items-center space-x-2"
              >
                <Wallet className="h-4 w-4" />
                <span>Connect Wallet</span>
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-dark-hover rounded-lg hover:bg-dark-hover/80 transition-colors"
                >
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-r ${getGradientClasses(colorScheme, 'medium')} flex items-center justify-center flex-shrink-0`}>
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      PDF #{activity.tokenId || index + 1}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      Token ID: {activity.tokenId || 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Activity className="h-12 w-12 mb-4 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm mt-2">Your recent PDF uploads will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className={`card-dark bg-gradient-to-r ${getGradientClasses(colorScheme, 'dark')} border-opacity-20 border-current`}>
        <div className="text-center py-8">
          <h1 className={`text-4xl font-bold mb-4 bg-gradient-to-r ${getGradientClasses(colorScheme, 'text')} bg-clip-text text-transparent`}>
            Secure, encrypt, own your documents
          </h1>
          <p className="text-gray-400 text-lg mb-2">AES-256-CBC ENCRYPTION</p>
          <p className="text-gray-300 mb-6">
            Protect and manage PDFs with blockchain security and NFT ownership
          </p>
          <Link to="/dashboard/upload" className="btn-primary inline-flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Upload Your First PDF</span>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-dark hover:opacity-80 transition-opacity">
          <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${getGradientClasses(colorScheme, 'medium')} flex items-center justify-center mb-4`}>
            <Shield className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">AES-256-CBC</h3>
          <p className="text-gray-400 text-sm">
            Military-grade encryption for your documents
          </p>
        </div>

        <div className="card-dark hover:opacity-80 transition-opacity">
          <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${getGradientClasses(colorScheme, 'medium')} flex items-center justify-center mb-4`}>
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Blockchain Security</h3>
          <p className="text-gray-400 text-sm">
            Decentralized storage on Arweave
          </p>
        </div>

        <div className="card-dark hover:opacity-80 transition-opacity">
          <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${getGradientClasses(colorScheme, 'medium')} flex items-center justify-center mb-4`}>
            <FileText className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">NFT Ownership</h3>
          <p className="text-gray-400 text-sm">
            Own your encrypted documents as NFTs
          </p>
        </div>

        <div className="card-dark hover:opacity-80 transition-opacity">
          <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${getGradientClasses(colorScheme, 'medium')} flex items-center justify-center mb-4`}>
            <Upload className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Easy Upload</h3>
          <p className="text-gray-400 text-sm">
            Simple and secure PDF encryption process
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
