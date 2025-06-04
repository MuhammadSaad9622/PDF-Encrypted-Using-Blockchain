// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract PdfNFT is ERC721URIStorage, Ownable, ReentrancyGuard, ERC721Enumerable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    // Mapping from token ID to encryption key hash
    mapping(uint256 => bytes32) private _encryptionKeyHashes;
    
    // Mapping from token ID to Arweave transaction ID
    mapping(uint256 => string) private _arweaveIds;
    
    // Mapping from token ID to IV
    mapping(uint256 => string) private _ivs;
    
    event NFTMinted(uint256 tokenId, address owner, string tokenURI, string arweaveId);
    event EncryptionKeyUpdated(uint256 tokenId, bytes32 newKeyHash);
    
    constructor() ERC721("EncryptedPdfNFT", "EPDF") Ownable(msg.sender) {}
    
    function mint(
        address to,
        string memory tokenURI,
        string memory arweaveId,
        string memory iv,
        bytes32 encryptionKeyHash
    ) public nonReentrant returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        _arweaveIds[newTokenId] = arweaveId;
        _ivs[newTokenId] = iv;
        _encryptionKeyHashes[newTokenId] = encryptionKeyHash;
        
        emit NFTMinted(newTokenId, to, tokenURI, arweaveId);
        
        return newTokenId;
    }
    
    function getArweaveId(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return _arweaveIds[tokenId];
    }
    
    function getIV(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return _ivs[tokenId];
    }
    
    function getEncryptionKeyHash(uint256 tokenId) public view returns (bytes32) {
        require(_exists(tokenId), "Token does not exist");
        return _encryptionKeyHashes[tokenId];
    }
    
    function updateEncryptionKey(
        uint256 tokenId,
        bytes32 newKeyHash
    ) public onlyOwner nonReentrant {
        require(_exists(tokenId), "Token does not exist");
        _encryptionKeyHashes[tokenId] = newKeyHash;
        emit EncryptionKeyUpdated(tokenId, newKeyHash);
    }
    
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721URIStorage, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _increaseBalance(address account, uint128 value) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
}