import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye } from 'lucide-react';

interface MyNFTsProps {
  account: string | null;
  provider: ethers.BrowserProvider | null;
}

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

const MyNFTs = ({ account, provider }: MyNFTsProps) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

        const contractAddress = '0xA16185A3639e128eC3C6CDfDF2681C0887673f4d';
        console.log('fetchNFTs: Using contract address:', contractAddress);

        if (!contractAddress) {
          console.error('fetchNFTs: NFT contract address is not defined');
          setError('NFT contract address is not configured.');
          setLoading(false);
          return;
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

        console.log('fetchNFTs: Contract instance created. Calling balanceOf...');
        const balance = await contract.balanceOf(account);
        console.log('fetchNFTs: Balance received:', balance.toString());
        
        const nftPromises = [];

        for (let i = 0; i < balance; i++) {
          console.log('fetchNFTs: Fetching token ID for index:', i);
          const tokenId = await contract.tokenOfOwnerByIndex(account, i);
          console.log('fetchNFTs: Got token ID:', tokenId.toString());
          
          console.log('fetchNFTs: Fetching token URI for token ID:', tokenId.toString());
          const tokenURI = await contract.tokenURI(tokenId);
          console.log('fetchNFTs: Got token URI:', tokenURI);

          // Fetch metadata from Arweave via the backend
          console.log('fetchNFTs: Fetching metadata via backend for token ID:', tokenId.toString());
          const response = await fetch(`http://localhost:3001/api/nft-metadata/${tokenId.toString()}`);
          if (!response.ok) {
             console.error('fetchNFTs: Failed to fetch metadata via backend', response.status, response.statusText);
             // It might be useful to throw an error here or set an error state if fetching metadata fails
             throw new Error(`Failed to fetch metadata via backend for token ${tokenId.toString()}`);
          }
          const metadata = await response.json();
          console.log('fetchNFTs: Metadata received via backend:', metadata);
          
          nftPromises.push({
            tokenId: tokenId.toString(),
            ...metadata
          });
        }

        const nftData = await Promise.all(nftPromises);
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
        <h3 className="text-lg font-medium text-gray-900">No wallet connected</h3>
        <p className="mt-1 text-sm text-gray-500">Please connect your wallet to view your NFTs.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-500">Loading your NFTs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No NFTs found</h3>
        <p className="mt-1 text-sm text-gray-500">You haven't minted any PDF NFTs yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {nfts.map((nft) => (
        <div key={nft.tokenId} className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 truncate">{nft.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{nft.description}</p>
            
            <div className="mt-4 space-y-2">
              <div className="text-sm">
                <span className="font-medium text-gray-500">File:</span>{' '}
                <span className="text-gray-900">{nft.properties.file.name}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium text-gray-500">Size:</span>{' '}
                <span className="text-gray-900">
                  {(nft.properties.file.size / 1024).toFixed(2)} KB
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => navigate(`/view/${nft.tokenId}`)}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Eye className="mr-2 h-4 w-4" />
                View PDF
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MyNFTs; 