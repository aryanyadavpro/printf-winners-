// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title MangaMonPlayer
 * @notice ERC-721 Dynamic NFT representing autonomous player agents with on-chain SVG artwork.
 */
contract MangaMonPlayer {
    // ERC-721 State Variables
    string public constant name = "Manga-Mon Players";
    string public constant symbol = "MNGA";

    uint256 private _totalSupply;

    // Contract owner — the only address allowed to mint new agents
    address public owner;

    // Mappings
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // Uniqueness registry: keccak256(lowercase name) => tokenId (1-indexed, 0 = not minted)
    mapping(bytes32 => uint256) private _nameToTokenId;

    // Game Metadata Struct
    struct PlayerStats {
        string playerName;
        string personalityTrait; // Arrogant, Calculative, Panic-Prone, Maverick, Team-First
        uint8 speed;
        uint8 passing;
        uint8 shooting;
        uint8 defense;
        uint8 stamina;
        uint32 matchesPlayed;
        uint32 goalsScored;
        uint32 assists;
    }

    mapping(uint256 => PlayerStats) private _playerStats;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event PlayerMinted(uint256 indexed tokenId, address indexed owner, string name, string trait);
    event PlayerUpdated(uint256 indexed tokenId, uint8 stamina, uint32 matches, uint32 goals, uint32 assists);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "MangaMonPlayer: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "MangaMonPlayer: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Returns the tokenId that owns a given player name, or 0 if not yet minted.
    function tokenIdOfName(string calldata playerName) external view returns (uint256) {
        return _nameToTokenId[_nameKey(playerName)];
    }

    // Returns true if the name has already been minted.
    function isNameTaken(string calldata playerName) external view returns (bool) {
        return _nameToTokenId[_nameKey(playerName)] != 0;
    }

    function _nameKey(string memory playerName) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_toLower(playerName)));
    }

    function _toLower(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x41 && b[i] <= 0x5A) {
                b[i] = bytes1(uint8(b[i]) + 32);
            }
        }
        return string(b);
    }

    // ERC-721 Core Functions
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "ERC721: address zero is not a valid owner");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
    }

    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner || _operatorApprovals[owner][msg.sender], "ERC721: approve caller is not token owner or approved for all");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "ERC721: invalid token ID");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "ERC721: approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: caller is not token owner or approved");
        require(ownerOf(tokenId) == from, "ERC721: transfer from incorrect owner");
        require(to != address(0), "ERC721: transfer to the zero address");

        // Clear approval
        delete _tokenApprovals[tokenId];

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata /*data*/) external {
        transferFrom(from, to, tokenId);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    // Minting Function — restricted to owner; each real-world name is a 1-of-1 forever.
    function mintPlayer(
        address to,
        string calldata playerName,
        string calldata trait,
        uint8 speed,
        uint8 passing,
        uint8 shooting,
        uint8 defense,
        uint8 stamina
    ) external onlyOwner returns (uint256) {
        bytes32 key = _nameKey(playerName);
        require(_nameToTokenId[key] == 0, "MangaMonPlayer: this agent name is already minted");

        _totalSupply += 1;
        uint256 newTokenId = _totalSupply;

        _nameToTokenId[key] = newTokenId;

        _balances[to] += 1;
        _owners[newTokenId] = to;

        _playerStats[newTokenId] = PlayerStats({
            playerName: playerName,
            personalityTrait: trait,
            speed: speed,
            passing: passing,
            shooting: shooting,
            defense: defense,
            stamina: stamina,
            matchesPlayed: 0,
            goalsScored: 0,
            assists: 0
        });

        emit Transfer(address(0), to, newTokenId);
        emit PlayerMinted(newTokenId, to, playerName, trait);
        return newTokenId;
    }

    // Dynamic Updates Post-Match
    function updatePlayerStats(
        uint256 tokenId,
        uint8 newStamina,
        uint32 goalsIncrement,
        uint32 assistsIncrement,
        uint32 matchesIncrement
    ) external {
        // In production, we'd restrict this to a certified Match Escrow / Game Engine wallet
        require(_owners[tokenId] != address(0), "ERC721: invalid token ID");
        
        PlayerStats storage stats = _playerStats[tokenId];
        stats.stamina = newStamina;
        stats.goalsScored += goalsIncrement;
        stats.assists += assistsIncrement;
        stats.matchesPlayed += matchesIncrement;

        emit PlayerUpdated(tokenId, newStamina, stats.matchesPlayed, stats.goalsScored, stats.assists);
    }

    // Read Stats Helper
    function getPlayerStats(uint256 tokenId) external view returns (
        string memory playerName,
        string memory personalityTrait,
        uint8 speed,
        uint8 passing,
        uint8 shooting,
        uint8 defense,
        uint8 stamina,
        uint32 matchesPlayed,
        uint32 goalsScored,
        uint32 assists
    ) {
        require(_owners[tokenId] != address(0), "ERC721: invalid token ID");
        PlayerStats memory stats = _playerStats[tokenId];
        return (
            stats.playerName,
            stats.personalityTrait,
            stats.speed,
            stats.passing,
            stats.shooting,
            stats.defense,
            stats.stamina,
            stats.matchesPlayed,
            stats.goalsScored,
            stats.assists
        );
    }

    // Dynamic On-Chain SVG NFT Render URI
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "ERC721: invalid token ID");
        PlayerStats memory stats = _playerStats[tokenId];

        string memory auraColor = "#00ffff"; // Default Calculative: Cyan
        string memory auraGlow = "rgba(0, 255, 255, 0.8)";
        
        bytes32 traitHash = keccak256(abi.encodePacked(stats.personalityTrait));
        if (traitHash == keccak256(abi.encodePacked("Arrogant"))) {
            auraColor = "#ff0055"; // Red
            auraGlow = "rgba(255, 0, 85, 0.8)";
        } else if (traitHash == keccak256(abi.encodePacked("Panic-Prone"))) {
            auraColor = "#778899"; // Grey
            auraGlow = "rgba(119, 136, 153, 0.8)";
        } else if (traitHash == keccak256(abi.encodePacked("Maverick"))) {
            auraColor = "#8A2BE2"; // Purple
            auraGlow = "rgba(138, 43, 226, 0.8)";
        } else if (traitHash == keccak256(abi.encodePacked("Team-First"))) {
            auraColor = "#1e90ff"; // Blue
            auraGlow = "rgba(30, 144, 255, 0.8)";
        }

        string memory svg = string(abi.encodePacked(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' width='100%' height='100%'>",
            "<defs>",
            "<radialGradient id='glow' cx='50%' cy='50%' r='50%'>",
            "<stop offset='0%' stop-color='", auraColor, "' stop-opacity='0.6'/>",
            "<stop offset='100%' stop-color='#0a0b10' stop-opacity='0'/>",
            "</radialGradient>",
            "</defs>",
            "<style>",
            "text { font-family: 'Outfit', 'Inter', sans-serif; fill: white; }",
            ".glow-bg { fill: url(#glow); }",
            ".title { font-size: 20px; font-weight: bold; fill: ", auraColor, "; letter-spacing: 2px; }",
            ".stat-label { font-size: 12px; fill: #8b949e; }",
            ".stat-val { font-size: 14px; font-weight: bold; fill: #ffffff; }",
            ".border-manga { stroke: #ffffff; stroke-width: 4; fill: none; }",
            ".name-card { font-size: 22px; font-weight: 800; fill: #ffffff; text-anchor: middle; }",
            ".trait-card { font-size: 14px; font-style: italic; fill: ", auraColor, "; text-anchor: middle; font-weight: 600; }",
            "</style>",
            "<rect width='400' height='400' fill='#0a0b10'/>",
            "<circle cx='200' cy='150' r='110' class='glow-bg'/>",
            "<circle cx='200' cy='150' r='45' fill='#0f111a' stroke='", auraColor, "' stroke-width='4'/>",
            "<circle cx='200' cy='150' r='15' fill='", auraColor, "'/>"
        ));

        string memory svgStats = string(abi.encodePacked(
            "<text x='200' y='280' class='name-card'>", stats.playerName, "</text>",
            "<text x='200' y='305' class='trait-card'>", stats.personalityTrait, "</text>",
            "<line x1='50' y1='320' x2='350' y2='320' stroke='#30363d' stroke-width='1'/>",
            "<text x='60' y='345' class='stat-label'>SPD</text><text x='60' y='365' class='stat-val'>", _toString(stats.speed), "</text>",
            "<text x='120' y='345' class='stat-label'>PAS</text><text x='120' y='365' class='stat-val'>", _toString(stats.passing), "</text>",
            "<text x='180' y='345' class='stat-label'>SHT</text><text x='180' y='365' class='stat-val'>", _toString(stats.shooting), "</text>",
            "<text x='240' y='345' class='stat-label'>DEF</text><text x='240' y='365' class='stat-val'>", _toString(stats.defense), "</text>",
            "<text x='300' y='345' class='stat-label'>STM</text><text x='300' y='365' class='stat-val'>", _toString(stats.stamina), "</text>",
            "<rect width='390' height='390' x='5' y='5' class='border-manga'/>",
            "</svg>"
        ));

        string memory finalSvg = string(abi.encodePacked(svg, svgStats));

        // Create base64 json metadata
        string memory json = string(abi.encodePacked(
            '{"name": "Manga-Mon #', _toString(tokenId), ': ', stats.playerName, '",',
            '"description": "Autonomous AI Football Agent with ', stats.personalityTrait, ' Persona.",',
            '"attributes": [',
            '{"trait_type": "Persona", "value": "', stats.personalityTrait, '"},',
            '{"trait_type": "Speed", "value": ', _toString(stats.speed), '},',
            '{"trait_type": "Passing", "value": ', _toString(stats.passing), '},',
            '{"trait_type": "Shooting", "value": ', _toString(stats.shooting), '},',
            '{"trait_type": "Defense", "value": ', _toString(stats.defense), '},',
            '{"trait_type": "Stamina", "value": ', _toString(stats.stamina), '},',
            '{"trait_type": "Matches Played", "value": ', _toString(stats.matchesPlayed), '},',
            '{"trait_type": "Goals Scored", "value": ', _toString(stats.goalsScored), '},',
            '{"trait_type": "Assists", "value": ', _toString(stats.assists), '}',
            '], "image": "data:image/svg+xml;base64,', _base64Encode(bytes(finalSvg)), '"}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", _base64Encode(bytes(json))));
    }

    // Helper functions for base64 and string conversion
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        if (data.length == 0) return "";
        
        uint256 encodedLength = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLength);
        
        bytes memory tableBytes = bytes(table);
        uint256 i = 0;
        uint256 j = 0;
        
        while (i < data.length) {
            uint256 a = uint8(data[i++]);
            uint256 b = i < data.length ? uint8(data[i++]) : 0;
            uint256 c = i < data.length ? uint8(data[i++]) : 0;
            
            result[j++] = tableBytes[a >> 2];
            result[j++] = tableBytes[((a & 0x03) << 4) | (b >> 4)];
            result[j++] = i - 1 < data.length ? tableBytes[((b & 0x0F) << 2) | (c >> 6)] : bytes1("=");
            result[j++] = i < data.length ? tableBytes[c & 0x3F] : bytes1("=");
        }
        
        return string(result);
    }
}
