import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, Download, ArrowLeft } from 'lucide-react';

interface ViewPDFProps {
  account: string | null;
  provider: ethers.BrowserProvider | null;
}

const ViewPDF = ({ account, provider }: ViewPDFProps) => {
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
        const contract = new ethers.Contract(
          import.meta.env.VITE_NFT_CONTRACT_ADDRESS!,
          [
            'function ownerOf(uint256) view returns (address)',
            'function tokenURI(uint256) view returns (string)'
          ],
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
        const response = await fetch(`https://pdf-encrypted-using-blockchain-2.onrender.com/api/nft-metadata/${tokenId}`);
        if (!response.ok) {
           console.error('fetchNFTData: Failed to fetch metadata via backend', response.status, response.statusText);
           throw new Error(`Failed to fetch metadata via backend: ${response.statusText}`);
        }
        const metadata = await response.json();
        console.log('fetchNFTData: Metadata received via backend:', metadata);
        setMetadata(metadata);

        // Get the Arweave ID from metadata
        const arweaveId = metadata.properties.file.uri.split('/').pop();
        
        // Fetch and decrypt PDF
        const decryptResponse = await axios.post(`https://pdf-encrypted-using-blockchain-2.onrender.com/api/decrypt/${tokenId}`, {
          walletAddress: account
        }, {
          responseType: 'blob'
        });

        console.log('Decryption response received:', decryptResponse);
        console.log('Decrypted data type (should be Blob):', typeof decryptResponse.data);
        if (decryptResponse.data instanceof Blob) {
          console.log('Decrypted data is a Blob, size:', decryptResponse.data.size);
          console.log('Decrypted data Blob type:', decryptResponse.data.type);

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
          reader.readAsArrayBuffer(decryptResponse.data.slice(0, 4));

        }

        // Create Blob from response data, ensuring correct type
        const pdfBlob = new Blob([decryptResponse.data], { type: 'application/pdf' });
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
        <h3 className="text-lg font-medium text-gray-900">No wallet connected</h3>
        <p className="mt-1 text-sm text-gray-500">Please connect your wallet to view this PDF.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-500">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
        <button
          onClick={() => navigate('/my-nfts')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My NFTs
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{metadata?.name}</h2>
          <button
            onClick={() => navigate('/my-nfts')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My NFTs
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-500">{metadata?.description}</p>
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <span className="font-medium text-gray-500">File:</span>{' '}
              <span className="text-gray-900">{metadata?.properties.file.name}</span>
            </div>
            {/* <div className="text-sm">
              <span className="font-medium text-gray-500">Size:</span>{' '}
              <span className="text-gray-900">
                {(metadata?.properties.file.size / 1024).toFixed(2)} KB
              </span>
            </div> */}
          </div>
        </div>

        {pdfUrl && (
          <div className="mt-6">
            <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
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
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewPDF; 