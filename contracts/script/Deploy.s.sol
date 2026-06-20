// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/MangaMonPlayer.sol";
import "../src/MangaMonMarketplace.sol";

contract DeployMangaMon is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the NFT contract
        MangaMonPlayer playerContract = new MangaMonPlayer();
        console.log("MangaMonPlayer deployed to:    ", address(playerContract));

        // 2. Deploy the Marketplace, pointing it at the NFT contract
        MangaMonMarketplace marketplace = new MangaMonMarketplace(address(playerContract));
        console.log("MangaMonMarketplace deployed to:", address(marketplace));

        vm.stopBroadcast();
    }
}
