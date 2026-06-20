// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IMangaMonPlayer {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

/**
 * @title MangaMonMarketplace
 * @notice On-chain peer-to-peer shop for listing and buying MangaMonPlayer NFTs with native MON.
 */
contract MangaMonMarketplace {
    IMangaMonPlayer public immutable playerContract;

    struct Listing {
        address seller;
        uint256 price; // in wei (native MON)
        bool active;
    }

    mapping(uint256 => Listing) public listings;
    uint256[] private _listedTokenIds;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event Delisted(uint256 indexed tokenId, address indexed seller);

    constructor(address _playerContract) {
        playerContract = IMangaMonPlayer(_playerContract);
    }

    // List an agent NFT for sale at a given price (in wei).
    // Caller must have approved this contract to transfer the token first.
    function listAgent(uint256 tokenId, uint256 price) external {
        require(price > 0, "Marketplace: price must be > 0");
        require(playerContract.ownerOf(tokenId) == msg.sender, "Marketplace: not token owner");
        require(
            playerContract.getApproved(tokenId) == address(this) ||
            playerContract.isApprovedForAll(msg.sender, address(this)),
            "Marketplace: contract not approved to transfer token"
        );

        if (!listings[tokenId].active) {
            _listedTokenIds.push(tokenId);
        }

        listings[tokenId] = Listing({ seller: msg.sender, price: price, active: true });

        emit Listed(tokenId, msg.sender, price);
    }

    // Buy a listed agent. Send exactly the listed price in native MON.
    function buyAgent(uint256 tokenId) external payable {
        Listing memory listing = listings[tokenId];
        require(listing.active, "Marketplace: token not listed");
        require(msg.value == listing.price, "Marketplace: incorrect MON amount");
        require(listing.seller != msg.sender, "Marketplace: seller cannot buy own token");

        // Mark inactive before transfer (re-entrancy guard)
        listings[tokenId].active = false;

        // Transfer NFT from seller to buyer
        playerContract.transferFrom(listing.seller, msg.sender, tokenId);

        // Pay seller
        (bool sent, ) = payable(listing.seller).call{ value: msg.value }("");
        require(sent, "Marketplace: MON transfer to seller failed");

        emit Sold(tokenId, listing.seller, msg.sender, listing.price);
    }

    // Remove your own listing.
    function delistAgent(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Marketplace: token not listed");
        require(listing.seller == msg.sender, "Marketplace: not the seller");

        listing.active = false;

        emit Delisted(tokenId, msg.sender);
    }

    // Returns all currently active listings as parallel arrays.
    function getActiveListings() external view returns (
        uint256[] memory tokenIds,
        address[] memory sellers,
        uint256[] memory prices
    ) {
        uint256 count = 0;
        for (uint256 i = 0; i < _listedTokenIds.length; i++) {
            if (listings[_listedTokenIds[i]].active) count++;
        }

        tokenIds = new uint256[](count);
        sellers  = new address[](count);
        prices   = new uint256[](count);

        uint256 idx = 0;
        for (uint256 i = 0; i < _listedTokenIds.length; i++) {
            uint256 tid = _listedTokenIds[i];
            if (listings[tid].active) {
                tokenIds[idx] = tid;
                sellers[idx]  = listings[tid].seller;
                prices[idx]   = listings[tid].price;
                idx++;
            }
        }
    }
}
