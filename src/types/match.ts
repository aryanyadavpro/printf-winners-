export type CardTier = 'Legendary' | 'Epic' | 'Rare' | 'Common';
export type PersonaTrait = 'Arrogant' | 'Calculative' | 'Panic-Prone' | 'Maverick' | 'Team-First';

export interface DraftCard {
  id: string;
  name: string;
  tier: CardTier;
  cost: number;
  speed: number;
  passing: number;
  shooting: number;
  defense: number;
  stamina: number;
  trait: PersonaTrait;
}

// slot index (0-4) => card
export type Formation = Record<number, DraftCard>;

export type MatchStage = 0 | 1 | 2 | 3 | 4;
// 0 = lobby/queue, 1 = draft, 2 = placement, 3 = match, 4 = result

export interface MatchState {
  matchId: string;
  stage: MatchStage;
  opponentAddress: string;
  cardPool: DraftCard[];
  mySquad: DraftCard[];
  myPoints: number;
  myFormation: Formation;
  lockedCardIds: Set<string>;
  timer: number;
  result: MatchResult | null;
}

export interface MatchResult {
  winner: string; // wallet address
  scores: { address: string; total: number }[];
}

// Formation slot layout — positions on the pitch half (0-1 range, scaled to canvas)
export const FORMATION_SLOTS: { x: number; y: number; label: string }[] = [
  { x: 0.5,  y: 0.85, label: 'GK' },
  { x: 0.2,  y: 0.65, label: 'DL' },
  { x: 0.8,  y: 0.65, label: 'DR' },
  { x: 0.5,  y: 0.45, label: 'MF' },
  { x: 0.5,  y: 0.20, label: 'FW' },
];

export const TIER_COLORS: Record<CardTier, string> = {
  Legendary: '#FFD700',
  Epic:      '#8A2BE2',
  Rare:      '#00BFFF',
  Common:    '#8b949e',
};

export const TRAIT_COLORS: Record<string, string> = {
  Arrogant:    'var(--color-arrogant)',
  Calculative: 'var(--neon-cyan)',
  'Panic-Prone': 'var(--color-panic)',
  Maverick:    'var(--color-maverick)',
  'Team-First':'var(--color-team)',
};
