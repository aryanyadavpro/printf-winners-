// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../src/MangaMonPlayer.sol";

contract MangaMonPlayerTest is Test {
    MangaMonPlayer public nft;
    address public owner = address(0x123);
    address public player1 = address(0x456);

    function setUp() public {
        nft = new MangaMonPlayer();
    }

    function testMintPlayer() public {
        vm.prank(owner);
        uint256 tokenId = nft.mintPlayer(
            player1,
            "Isagi Yoichi",
            "Calculative",
            85, // speed
            90, // passing
            88, // shooting
            70, // defense
            95  // stamina
        );

        assertEq(tokenId, 1);
        assertEq(nft.balanceOf(player1), 1);
        assertEq(nft.ownerOf(1), player1);

        (
            string memory name,
            string memory trait,
            uint8 speed,
            uint8 passing,
            uint8 shooting,
            uint8 defense,
            uint8 stamina,
            uint32 matches,
            uint32 goals,
            uint32 assists
        ) = nft.getPlayerStats(1);

        assertEq(name, "Isagi Yoichi");
        assertEq(trait, "Calculative");
        assertEq(speed, 85);
        assertEq(passing, 90);
        assertEq(shooting, 88);
        assertEq(defense, 70);
        assertEq(stamina, 95);
        assertEq(matches, 0);
        assertEq(goals, 0);
        assertEq(assists, 0);
    }

    function testUpdatePlayerStats() public {
        vm.prank(owner);
        uint256 tokenId = nft.mintPlayer(player1, "Bachira Meguru", "Maverick", 92, 85, 82, 60, 90);

        nft.updatePlayerStats(tokenId, 75, 2, 1, 1); // stamina = 75, goals += 2, assists += 1, matches += 1

        (
            ,,
            ,,,,
            uint8 stamina,
            uint32 matches,
            uint32 goals,
            uint32 assists
        ) = nft.getPlayerStats(tokenId);

        assertEq(stamina, 75);
        assertEq(matches, 1);
        assertEq(goals, 2);
        assertEq(assists, 1);
    }

    function testTokenURI() public {
        vm.prank(owner);
        uint256 tokenId = nft.mintPlayer(player1, "Barou Shoei", "Arrogant", 88, 70, 95, 65, 99);

        string memory uri = nft.tokenURI(tokenId);
        assertTrue(bytes(uri).length > 0);
        // Verify it returns base64 data URI format
        assertEq(keccak256(abi.encodePacked(slice(uri, 0, 29))), keccak256(abi.encodePacked("data:application/json;base64,")));
    }

    // Helper to slice strings for assertion checks
    function slice(string memory str, uint256 startIndex, uint256 endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }
}
