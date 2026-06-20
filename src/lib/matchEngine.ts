// ── Card pool (single source of truth — mirrors server/index.js) ─────────────
import { DraftCard } from '../types/match';

export const CARD_POOL: DraftCard[] = [
  { id:'c1',  name:'El Magnifico',   tier:'Legendary', cost:6, speed:92, passing:95, shooting:94, defense:45, stamina:85, trait:'Arrogant'    },
  { id:'c2',  name:'The Surgeon',    tier:'Legendary', cost:6, speed:78, passing:97, shooting:88, defense:62, stamina:80, trait:'Calculative'  },
  { id:'c3',  name:'Chaos Engine',   tier:'Epic',      cost:4, speed:95, passing:68, shooting:90, defense:38, stamina:88, trait:'Maverick'     },
  { id:'c4',  name:'Iron Wall',      tier:'Epic',      cost:4, speed:65, passing:72, shooting:55, defense:96, stamina:90, trait:'Team-First'   },
  { id:'c5',  name:'Phantom Runner', tier:'Epic',      cost:4, speed:97, passing:75, shooting:82, defense:42, stamina:92, trait:'Maverick'     },
  { id:'c6',  name:'The Anchor',     tier:'Rare',      cost:3, speed:68, passing:80, shooting:60, defense:88, stamina:85, trait:'Team-First'   },
  { id:'c7',  name:'Quick Thinker',  tier:'Rare',      cost:3, speed:80, passing:85, shooting:75, defense:70, stamina:80, trait:'Calculative'  },
  { id:'c8',  name:'Wild Card',      tier:'Rare',      cost:3, speed:85, passing:65, shooting:80, defense:55, stamina:75, trait:'Maverick'     },
  { id:'c9',  name:'Steady Hand',    tier:'Common',    cost:2, speed:70, passing:72, shooting:68, defense:68, stamina:78, trait:'Team-First'   },
  { id:'c10', name:'Grit Runner',    tier:'Common',    cost:2, speed:75, passing:65, shooting:70, defense:65, stamina:82, trait:'Panic-Prone'  },
  { id:'c11', name:'Workhorse',      tier:'Common',    cost:2, speed:68, passing:70, shooting:65, defense:72, stamina:88, trait:'Team-First'   },
  { id:'c12', name:'Scrapper',       tier:'Common',    cost:1, speed:62, passing:58, shooting:60, defense:60, stamina:72, trait:'Panic-Prone'  },
  { id:'c13', name:'Rookie',         tier:'Common',    cost:1, speed:65, passing:60, shooting:58, defense:55, stamina:70, trait:'Panic-Prone'  },
  { id:'c14', name:'Eager Lad',      tier:'Common',    cost:1, speed:68, passing:62, shooting:62, defense:58, stamina:74, trait:'Team-First'   },
];

export function calcSquadScore(squad: DraftCard[]): number {
  return squad.reduce((acc, c) => acc + c.speed + c.passing + c.shooting + c.defense + c.stamina, 0);
}

export function resolveWinner(
  p1addr: string, p1squad: DraftCard[],
  p2addr: string, p2squad: DraftCard[],
): { winner: string; scores: { address: string; total: number }[] } {
  const s1 = calcSquadScore(p1squad);
  const s2 = calcSquadScore(p2squad);
  const scores = [
    { address: p1addr, total: s1 },
    { address: p2addr, total: s2 },
  ].sort((a, b) => b.total - a.total);
  return { winner: scores[0].address, scores };
}
