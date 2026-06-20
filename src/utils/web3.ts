import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { Player, PersonaTrait } from '../types/game';

// Standard ABI for MangaMonPlayer ERC-721 contract
export const CONTRACT_ABI = [
  "function mintPlayer(address to, string name, string trait, uint8 speed, uint8 passing, uint8 shooting, uint8 defense, uint8 stamina) external returns (uint256)",
  "function updatePlayerStats(uint256 tokenId, uint8 newStamina, uint32 goalsIncrement, uint32 assistsIncrement, uint32 matchesIncrement) external",
  "function getPlayerStats(uint256 tokenId) external view returns (string playerName, string personalityTrait, uint8 speed, uint8 passing, uint8 shooting, uint8 defense, uint8 stamina, uint32 matchesPlayed, uint32 goalsScored, uint32 assists)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function totalSupply() external view returns (uint256)",
  "function tokenURI(uint256 tokenId) public view returns (string)",
  "function isNameTaken(string playerName) external view returns (bool)",
  "function tokenIdOfName(string playerName) external view returns (uint256)"
];

// Check if a player name has already been minted as a 1-of-1 on chain.
export async function checkNameTaken(
  provider: BrowserProvider,
  contractAddress: string,
  playerName: string
): Promise<{ taken: boolean; tokenId?: number }> {
  try {
    const contract = new Contract(contractAddress, CONTRACT_ABI, provider);
    const taken: boolean = await contract.isNameTaken(playerName);
    if (taken) {
      const tid: bigint = await contract.tokenIdOfName(playerName);
      return { taken: true, tokenId: Number(tid) };
    }
    return { taken: false };
  } catch {
    // If contract isn't deployed (sandbox), treat as not taken
    return { taken: false };
  }
}

// Helper to check if metamask is injected
export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && (window as any).ethereum !== undefined;
}

// Connect MetaMask wallet
export async function connectMetaMask(): Promise<{ address: string; provider: BrowserProvider }> {
  if (!isMetaMaskAvailable()) {
    throw new Error("MetaMask is not installed. Please download it to continue.");
  }

  const ethereum = (window as any).ethereum;
  // Request account access
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  const address = accounts[0];
  const provider = new BrowserProvider(ethereum);

  return { address, provider };
}

// Mint dynamic player NFT on Monad Testnet
export async function mintPlayerNFT(
  provider: BrowserProvider,
  contractAddress: string,
  playerName: string,
  trait: PersonaTrait,
  speed: number,
  passing: number,
  shooting: number,
  defense: number,
  stamina: number
): Promise<{ txHash: string; tokenId: number }> {
  const signer = await provider.getSigner();
  const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

  const recipient = await signer.getAddress();
  const tx = await contract.mintPlayer(
    recipient,
    playerName,
    trait,
    speed,
    passing,
    shooting,
    defense,
    stamina
  );

  const receipt = await tx.wait();
  
  // Parse event to find tokenId (Transfer log: from 0x0 is mint)
  // Or just fetch total supply as a fallback
  let tokenId = 1;
  try {
    const supply = await contract.totalSupply();
    tokenId = Number(supply);
  } catch (e) {
    tokenId = Math.floor(Math.random() * 1000) + 1;
  }

  return {
    txHash: receipt.hash,
    tokenId
  };
}

// Update stats on chain after a simulation match
export async function updatePlayerStatsOnChain(
  provider: BrowserProvider,
  contractAddress: string,
  tokenId: number,
  newStamina: number,
  goals: number,
  assists: number,
  matches: number
): Promise<string> {
  const signer = await provider.getSigner();
  const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

  const tx = await contract.updatePlayerStats(
    tokenId,
    newStamina,
    goals,
    assists,
    matches
  );

  const receipt = await tx.wait();
  return receipt.hash;
}

// ─── Marketplace ABI & Helpers ────────────────────────────────────────────────

export const MARKETPLACE_ABI = [
  "function listAgent(uint256 tokenId, uint256 price) external",
  "function buyAgent(uint256 tokenId) external payable",
  "function delistAgent(uint256 tokenId) external",
  "function getActiveListings() external view returns (uint256[] tokenIds, address[] sellers, uint256[] prices)",
  "function listings(uint256 tokenId) external view returns (address seller, uint256 price, bool active)",
  "event Listed(uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price)",
  "event Delisted(uint256 indexed tokenId, address indexed seller)"
];

export interface MarketplaceListing {
  tokenId: number;
  seller: string;
  price: bigint; // in wei
}

// Approve marketplace contract to transfer a specific token, then list it.
export async function listAgentForSale(
  provider: BrowserProvider,
  nftContractAddress: string,
  marketplaceAddress: string,
  tokenId: number,
  priceInWei: bigint
): Promise<string> {
  const signer = await provider.getSigner();

  // First: approve marketplace to move this token
  const nftContract = new Contract(nftContractAddress, [
    "function approve(address to, uint256 tokenId) external",
    "function getApproved(uint256 tokenId) external view returns (address)"
  ], signer);

  const approved = await nftContract.getApproved(tokenId);
  if (approved.toLowerCase() !== marketplaceAddress.toLowerCase()) {
    const approveTx = await nftContract.approve(marketplaceAddress, tokenId);
    await approveTx.wait();
  }

  // Then: list on marketplace
  const marketplace = new Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
  const tx = await marketplace.listAgent(tokenId, priceInWei);
  const receipt = await tx.wait();
  return receipt.hash;
}

// Buy a listed agent by sending the exact price.
export async function buyAgentFromMarketplace(
  provider: BrowserProvider,
  marketplaceAddress: string,
  tokenId: number,
  priceInWei: bigint
): Promise<string> {
  const signer = await provider.getSigner();
  const marketplace = new Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
  const tx = await marketplace.buyAgent(tokenId, { value: priceInWei });
  const receipt = await tx.wait();
  return receipt.hash;
}

// Remove your own listing.
export async function delistAgent(
  provider: BrowserProvider,
  marketplaceAddress: string,
  tokenId: number
): Promise<string> {
  const signer = await provider.getSigner();
  const marketplace = new Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
  const tx = await marketplace.delistAgent(tokenId);
  const receipt = await tx.wait();
  return receipt.hash;
}

// Fetch all active listings from the contract.
export async function fetchActiveListings(
  provider: BrowserProvider,
  marketplaceAddress: string
): Promise<MarketplaceListing[]> {
  try {
    const marketplace = new Contract(marketplaceAddress, MARKETPLACE_ABI, provider);
    const [tokenIds, sellers, prices] = await marketplace.getActiveListings();
    if (!tokenIds || (tokenIds as bigint[]).length === 0) return [];
    return (tokenIds as bigint[]).map((tid, i) => ({
      tokenId: Number(tid),
      seller: sellers[i] as string,
      price: prices[i] as bigint
    }));
  } catch {
    return [];
  }
}

// ─── Local mock storage for sandbox testing ───────────────────────────────────

// Local mock storage for sandbox testing
const MOCK_STORAGE_KEY = 'mangamon_mock_players';

export function getMockPlayers(): Player[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(MOCK_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function saveMockPlayer(player: Player): void {
  if (typeof window === 'undefined') return;
  const players = getMockPlayers();
  players.push(player);
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(players));
}

export function clearMockPlayers(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MOCK_STORAGE_KEY);
}
