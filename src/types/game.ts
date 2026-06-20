export type PersonaTrait = 'Arrogant' | 'Calculative' | 'Panic-Prone' | 'Maverick' | 'Team-First';

export interface Player {
  id: string;
  tokenId?: number; // Dynamic NFT Token ID if connected
  name: string;
  side: 'red' | 'blue';
  // Quantitative Stats
  speed: number;
  passing: number;
  shooting: number;
  defense: number;
  stamina: number; // Max/Initial Stamina (1-99)
  currentStamina: number; // Current Stamina during game
  
  trait: PersonaTrait;
  position?: string;
  image?: string;

  // Position & Physics Vectors
  x: number;
  y: number;
  vx: number;
  vy: number;

  // AI/State parameters
  state: 'idle' | 'chase_ball' | 'dribble' | 'defend' | 'return_to_position';
  targetX: number;
  targetY: number;
  hasBall: boolean;
  timeSinceLastAction: number; // ticks/ticks limit to avoid spamming actions

  // Stats gathered during current match
  goals: number;
  assists: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  controlledById: string | null;
  lastPossessedById: string | null;
}

export interface MangaEvent {
  id: string;
  type: 'clutch_shot' | 'breakdown' | 'setup';
  player: Player;
  dialogue?: string;
  goalProbability?: number;
  secondaryPlayer?: Player; // e.g. target of setup pass, or shooter for breakdown
  timestamp: string;
}

export interface MatchState {
  scoreRed: number;
  scoreBlue: number;
  timeRemaining: number; // Seconds (e.g. starts at 180s for 3-minute game)
  isPlaying: boolean;
  isMangaPaused: boolean;
  currentMangaEvent: MangaEvent | null;
  players: Player[];
  ball: Ball;
}
