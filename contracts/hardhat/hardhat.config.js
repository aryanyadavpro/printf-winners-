require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: '.env.local' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: { enabled: true, runs: 200 },
            viaIR: true,
        },
    },
    networks: {
        monadTestnet: {
            url: process.env.MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz/",
            chainId: 10143,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
    },
};
