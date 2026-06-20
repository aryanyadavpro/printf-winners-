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
  "function tokenURI(uint256 tokenId) public view returns (string)"
];

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
