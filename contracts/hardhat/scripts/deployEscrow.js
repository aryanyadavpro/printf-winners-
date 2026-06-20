const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    // Game server wallet — can be the same as deployer for now, swap to a backend wallet later
    const GAME_SERVER = deployer.address;
    const PLATFORM_FEE_BPS = 250; // 2.5%

    console.log("Deploying MatchEscrow...");
    const MatchEscrow = await hre.ethers.getContractFactory("MatchEscrow");
    const escrow = await MatchEscrow.deploy(GAME_SERVER, PLATFORM_FEE_BPS);
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    console.log("MatchEscrow deployed to:", escrowAddress);

    console.log("\n--- Copy this into your .env.local (frontend + server) ---");
    console.log(`NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddress}`);
    console.log(`ESCROW_ADDRESS=${escrowAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
