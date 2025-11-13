import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Search, Wallet } from 'lucide-react';
import { useWallet } from '../App';
import { pdfApi } from '../utils/api';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from '../utils/constants';

interface NFT {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  properties: {
    file: {
      name: string;
      type: string;
      size: number;
    };
    encryption: {
      algorithm: string;
      iv: string;
    };
  };
}

const MyNFTs = () => {
  const { account, provider, connectWallet } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNFTs = async () => {
      console.log('fetchNFTs: Starting fetch. Account:', account, 'Provider:', !!provider);

      if (!account || !provider) {
        console.log('fetchNFTs: Account or provider not available. Exiting.');
        setLoading(false); // Ensure loading is set to false if we exit early
        return;
      }

      try {
        // Log the connected network
        try {
          const network = await provider.getNetwork();
          console.log('fetchNFTs: Connected network:', network.chainId, network.name);
        } catch (netErr) {
          console.error('fetchNFTs: Could not get network from provider:', netErr);
          // Continue, as sometimes provider might be valid even if network check fails early
        }

        console.log('fetchNFTs: Using contract address:', NFT_CONTRACT_ADDRESS);

        if (!NFT_CONTRACT_ADDRESS) {
          console.error('fetchNFTs: NFT contract address is not defined');
          setError('NFT contract address is not configured.');
          setLoading(false);
          return;
        }

        const contract = new ethers.Contract(
          NFT_CONTRACT_ADDRESS,
          NFT_CONTRACT_ABI,
          provider
        );

        console.log('fetchNFTs: Contract instance created. Calling balanceOf...');
        const balance = await contract.balanceOf(account);
        console.log('fetchNFTs: Balance received:', balance.toString());
        
        if (balance === 0n) {
          setNfts([]);
          setLoading(false);
          return;
        }

        // Fetch all token IDs in parallel
        const tokenIdPromises = [];
        for (let i = 0; i < balance; i++) {
          tokenIdPromises.push(contract.tokenOfOwnerByIndex(account, i));
        }
        const tokenIds = await Promise.all(tokenIdPromises);
        console.log('fetchNFTs: All token IDs fetched:', tokenIds.map(t => t.toString()));

        // Fetch all metadata in parallel
        const nftPromises = tokenIds.map(async (tokenId) => {
          try {
            const tokenIdStr = tokenId.toString();
            console.log('fetchNFTs: Fetching metadata for token ID:', tokenIdStr);
            const metadata = await pdfApi.getNftMetadata(tokenIdStr);
            console.log('fetchNFTs: Metadata received for token ID:', tokenIdStr);
            return {
              tokenId: tokenIdStr,
              ...metadata
            };
          } catch (error) {
            console.error(`Error fetching metadata for token ${tokenId.toString()}:`, error);
            return null;
          }
        });

        const nftData = (await Promise.all(nftPromises)).filter(nft => nft !== null);
        console.log('fetchNFTs: All NFT data fetched', nftData);
        setNfts(nftData);
      } catch (err: any) {
        console.error('fetchNFTs: Error fetching NFTs:', err);
        setError(err.message || 'Error fetching NFTs');
      } finally {
        setLoading(false);
        console.log('fetchNFTs: Loading set to false');
      }
    };

    fetchNFTs();
  }, [account, provider]);

  if (!account) {
    return (
      <div className="text-center py-12">
        <Wallet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-white">No wallet connected</h3>
        <p className="mt-1 text-sm text-gray-400">Please connect your wallet to view your NFTs.</p>
        <button
          onClick={connectWallet}
          className="btn-primary mt-6 inline-flex items-center space-x-2"
        >
          <Wallet className="h-5 w-5" />
          <span>Connect Wallet</span>
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-400">Loading your NFTs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-white">No NFTs found</h3>
        <p className="mt-1 text-sm text-gray-400">You haven't minted any PDF NFTs yet.</p>
      </div>
    );
  }

  const filteredNFTs = nfts.filter(nft => 
    nft.properties.file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="input-dark w-full pl-10"
          placeholder="Search by file name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredNFTs.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-white">No matching NFTs found</h3>
          <p className="mt-1 text-sm text-gray-400">Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNFTs.map((nft) => (
            <div key={nft.tokenId} className="card-dark">
              <h3 className="text-lg font-medium text-white truncate">{nft.name}</h3>
              <p className="mt-1 text-sm text-gray-400">{nft.description}</p>
              
              <div className="mt-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-400">File:</span>{' '}
                  <span className="text-white">{nft.properties.file.name}</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => navigate(`/dashboard/view/${nft.tokenId}`)}
                  className="btn-primary w-full inline-flex items-center justify-center"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyNFTs; 