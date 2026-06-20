const hre = require("hardhat");

async function main() {
    console.log("Deploying MangaMonPlayer...");
    const MangaMonPlayer = await hre.ethers.getContractFactory("MangaMonPlayer");
    const playerContract = await MangaMonPlayer.deploy();
    await playerContract.waitForDeployment();
    const playerAddress = await playerContract.getAddress();
    console.log("MangaMonPlayer deployed to:    ", playerAddress);

    console.log("Deploying MangaMonMarketplace...");
    const MangaMonMarketplace = await hre.ethers.getContractFactory("MangaMonMarketplace");
    const marketplace = await MangaMonMarketplace.deploy(playerAddress);
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("MangaMonMarketplace deployed to:", marketplaceAddress);

    console.log("\n--- Copy these into src/app/page.tsx ---");
    console.log(`const NFT_CONTRACT_ADDRESS = '${playerAddress}';`);
    console.log(`const MARKETPLACE_CONTRACT_ADDRESS = '${marketplaceAddress}';`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
