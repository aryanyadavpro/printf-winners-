// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/MangaMonPlayer.sol";

contract DeployMangaMonPlayer is Script {
    function run() external {
        // Retrieve private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        MangaMonPlayer playerContract = new MangaMonPlayer();

        console.log("MangaMonPlayer deployed to:", address(playerContract));

        vm.stopBroadcast();
    }
}
// To deploy to Monad Testnet:
// forge script script/Deploy.s.sol:DeployMangaMonPlayer --rpc-url https://testnet-rpc.monad.xyz --broadcast
