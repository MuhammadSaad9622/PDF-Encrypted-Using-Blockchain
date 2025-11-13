// Contract address - should match backend/contractAddress.json
export const NFT_CONTRACT_ADDRESS = '0xA16185A3639e128eC3C6CDfDF2681C0887673f4d';

// Contract ABI functions (minimal set for common operations)
export const NFT_CONTRACT_ABI = [
  'function ownerOf(uint256) view returns (address)',
  'function tokenURI(uint256) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
];

