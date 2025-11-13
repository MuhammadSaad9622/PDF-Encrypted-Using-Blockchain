import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Download, ArrowLeft, Wallet } from 'lucide-react';
import { useWallet } from '../App';
import { pdfApi } from '../utils/api';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from '../utils/constants';

const ViewPDF = () => {
  const { account, provider, connectWallet } = useWallet();
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    const fetchNFTData = async () => {
      if (!account || !provider || !tokenId) return;

      try {
        if (!NFT_CONTRACT_ADDRESS) {
          setError('NFT contract address is not configured');
          setLoading(false);
          return;
        }

        const contract = new ethers.Contract(
          NFT_CONTRACT_ADDRESS,
          NFT_CONTRACT_ABI,
          provider
        );

        // Verify ownership
        const owner = await contract.ownerOf(tokenId);
        if (owner.toLowerCase() !== account.toLowerCase()) {
          setError('You do not own this NFT');
          return;
        }

        // Get NFT data
        const tokenURI = await contract.tokenURI(tokenId);
        
        console.log('fetchNFTData: Got token URI:', tokenURI);
        
        // Fetch metadata from Arweave via the backend
        console.log('fetchNFTData: Fetching metadata via backend for token ID:', tokenId);
        const metadata = await pdfApi.getNftMetadata(tokenId);
        console.log('fetchNFTData: Metadata received via backend:', metadata);
        setMetadata(metadata);

        // Get the Arweave ID from metadata
        const arweaveId = metadata.properties.file.uri.split('/').pop();
        
        // Fetch and decrypt PDF
        const decryptResponse = await pdfApi.decryptFile(tokenId, account);

        console.log('Decryption response received:', decryptResponse);
        console.log('Decrypted data type (should be Blob):', typeof decryptResponse);
        if (decryptResponse instanceof Blob) {
          console.log('Decrypted data is a Blob, size:', decryptResponse.size);
          console.log('Decrypted data Blob type:', decryptResponse.type);

          // Read the first few bytes of the Blob to check for PDF signature
          const reader = new FileReader();
          reader.onload = function(event) {
            if (event.target?.result) {
              const arrayBuffer = event.target.result as ArrayBuffer;
              const uint8Array = new Uint8Array(arrayBuffer);
              const pdfSignature = String.fromCharCode(...uint8Array.slice(0, 4));
              console.log('First 4 bytes of decrypted data (should be %PDF-):', pdfSignature);
            }
          };
          reader.readAsArrayBuffer(decryptResponse.slice(0, 4));

        }

        // Create Blob from response data, ensuring correct type
        const pdfBlob = new Blob([decryptResponse], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(pdfUrl);
      } catch (err: any) {
        setError(err.message || 'Error fetching NFT data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTData();
  }, [account, provider, tokenId]);

  if (!account) {
    return (
      <div className="text-center py-12">
        <Wallet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-white">No wallet connected</h3>
        <p className="mt-1 text-sm text-gray-400">Please connect your wallet to view this PDF.</p>
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
        <p className="mt-4 text-sm text-gray-400">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg">
          {error}
        </div>
        <button
          onClick={() => navigate('/dashboard/my-nfts')}
          className="btn-primary mt-4 inline-flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My NFTs
        </button>
      </div>
    );
  }

  return (
    <div className="card-dark">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">{metadata?.name}</h2>
        <button
          onClick={() => navigate('/dashboard/my-nfts')}
          className="btn-secondary inline-flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My NFTs
        </button>
      </div>

      <div className="mb-6">
        <p className="text-gray-400">{metadata?.description}</p>
        <div className="mt-4 space-y-2">
          <div className="text-sm">
            <span className="font-medium text-gray-400">File:</span>{' '}
            <span className="text-white">{metadata?.properties.file.name}</span>
          </div>
        </div>
      </div>

      {pdfUrl && (
        <div className="mt-6">
          <div className="aspect-w-16 aspect-h-9 bg-gray-800 rounded-lg overflow-hidden">
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="PDF Viewer"
            />
          </div>
          <div className="mt-4">
            <a
              href={pdfUrl}
              download={`${metadata?.properties.file.name}`}
              className="btn-primary inline-flex items-center"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewPDF; 