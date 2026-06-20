import { Player, Ball, MatchState, MangaEvent, PersonaTrait } from '../types/game';
import {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  PITCH_MARGIN,
  GOAL_Y_TOP,
  GOAL_Y_BOTTOM,
  PLAYER_RADIUS,
  CONTROL_DISTANCE,
  getDistance,
  clamp,
  updateBallPhysics,
  updatePlayerPhysics,
  resolvePlayerCollisions
} from './physics';

// Role type mapping for 11v11 (4-3-3)
export type PlayerRole = 'GK' | 'LB' | 'CB1' | 'CB2' | 'RB' | 'CDM' | 'CM1' | 'CM2' | 'LW' | 'ST' | 'RW';

interface RolePosition { x: number; y: number; }

// 4-3-3 kickoff positions — Red attacks left→right, Blue attacks right→left
const RED_HOME_POSITIONS: Record<string, RolePosition> = {
  GK:  { x: 55,  y: 225 },
  LB:  { x: 175, y: 360 },
  CB1: { x: 190, y: 270 },
  CB2: { x: 190, y: 180 },
  RB:  { x: 175, y: 90  },
  CDM: { x: 310, y: 225 },
  CM1: { x: 390, y: 320 },
  CM2: { x: 390, y: 130 },
  LW:  { x: 530, y: 370 },
  ST:  { x: 570, y: 225 },
  RW:  { x: 530, y: 80  },
};

const BLUE_HOME_POSITIONS: Record<string, RolePosition> = {
  GK:  { x: 745, y: 225 },
  RB:  { x: 625, y: 360 },
  CB1: { x: 610, y: 270 },
  CB2: { x: 610, y: 180 },
  LB:  { x: 625, y: 90  },
  CDM: { x: 490, y: 225 },
  CM1: { x: 410, y: 320 },
  CM2: { x: 410, y: 130 },
  RW:  { x: 270, y: 370 },
  ST:  { x: 230, y: 225 },
  LW:  { x: 270, y: 80  },
};

const ROLE_ORDER = ['GK','LB','CB1','CB2','RB','CDM','CM1','CM2','LW','ST','RW'];

export function getRoleFromIndex(index: number): string {
  return ROLE_ORDER[index % ROLE_ORDER.length] ?? 'MF';
}

// Generate a random ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Initialize default squads
export function initializePlayers(
  redTraits?: PersonaTrait[],
  blueTraits?: PersonaTrait[]
): Player[] {
  const redNames = ["Isagi", "Bachira", "Kunigami", "Chigiri", "Kuon"];
  const blueNames = ["Rin", "Shidou", "Karasu", "Otoya", "Yukimiya"];

  const defaultRedTraits: PersonaTrait[] = ['Calculative', 'Maverick', 'Arrogant', 'Team-First', 'Panic-Prone'];
  const defaultBlueTraits: PersonaTrait[] = ['Calculative', 'Maverick', 'Arrogant', 'Team-First', 'Panic-Prone'];

  const players: Player[] = [];

  // Red Team (Left)
  for (let i = 0; i < 5; i++) {
    const role = getRoleFromIndex(i);
    const trait = (redTraits && redTraits[i]) || defaultRedTraits[i];
    const home = RED_HOME_POSITIONS[role] || RED_HOME_POSITIONS['MF'];
    
    // Assign stats based on role to make it realistic
    let speed = 65 + Math.floor(Math.random() * 20);
    let passing = 65 + Math.floor(Math.random() * 20);
    let shooting = 60 + Math.floor(Math.random() * 25);
    let defense = 55 + Math.floor(Math.random() * 30);
    let stamina = 80 + Math.floor(Math.random() * 19);

    if (role === 'GK') { defense = 95; passing = 60; speed = 50; }
    else if (role.toString().startsWith('DF')) { defense = 88; speed = 70; shooting = 40; }
    else if (role === 'MF') { passing = 90; speed = 78; defense = 70; }
    else if (role === 'FW') { shooting = 92; speed = 88; defense = 35; }

    players.push({
      id: `red_${i}_${generateId()}`,
      name: redNames[i] + ` (Red)`,
      side: 'red',
      speed,
      passing,
      shooting,
      defense,
      stamina,
      currentStamina: 100,
      trait,
      x: home.x,
      y: home.y,
      vx: 0,
      vy: 0,
      state: 'idle',
      targetX: home.x,
      targetY: home.y,
      hasBall: false,
      timeSinceLastAction: 0,
      goals: 0,
      assists: 0
    });
  }

  // Blue Team (Right)
  for (let i = 0; i < 5; i++) {
    const role = getRoleFromIndex(i);
    const trait = (blueTraits && blueTraits[i]) || defaultBlueTraits[i];
    const home = BLUE_HOME_POSITIONS[role] || BLUE_HOME_POSITIONS['MF'];
    
    let speed = 65 + Math.floor(Math.random() * 20);
    let passing = 65 + Math.floor(Math.random() * 20);
    let shooting = 60 + Math.floor(Math.random() * 25);
    let defense = 55 + Math.floor(Math.random() * 30);
    let stamina = 80 + Math.floor(Math.random() * 19);

    if (role === 'GK') { defense = 95; passing = 60; speed = 50; }
    else if (role.toString().startsWith('DF')) { defense = 88; speed = 70; shooting = 40; }
    else if (role === 'MF') { passing = 90; speed = 78; defense = 70; }
    else if (role === 'FW') { shooting = 92; speed = 88; defense = 35; }

    players.push({
      id: `blue_${i}_${generateId()}`,
      name: blueNames[i] + ` (Blue)`,
      side: 'blue',
      speed,
      passing,
      shooting,
      defense,
      stamina,
      currentStamina: 100,
      trait,
      x: home.x,
      y: home.y,
      vx: 0,
      vy: 0,
      state: 'idle',
      targetX: home.x,
      targetY: home.y,
      hasBall: false,
      timeSinceLastAction: 0,
      goals: 0,
      assists: 0
    });
  }

  return players;
}

// Reset positions for kickoff
export function resetToKickoff(players: Player[], ball: Ball): void {
  ball.x = FIELD_WIDTH / 2;
  ball.y = FIELD_HEIGHT / 2;
  ball.vx = 0;
  ball.vy = 0;
  ball.controlledById = null;

  players.forEach((p, index) => {
    const teamIndex = index % 11;
    const role = getRoleFromIndex(teamIndex);
    const home = p.side === 'red' ? RED_HOME_POSITIONS[role] : BLUE_HOME_POSITIONS[role];
    p.x = home.x;
    p.y = home.y;
    p.vx = 0;
    p.vy = 0;
    p.state = 'idle';
    p.targetX = home.x;
    p.targetY = home.y;
    p.hasBall = false;
    p.timeSinceLastAction = 0;
  });
}

// Calculate shot goal probability
export function getGoalProbability(player: Player, goalX: number): number {
  const dist = getDistance(player.x, player.y, goalX, FIELD_HEIGHT / 2);
  // Max shooting distance is roughly 350px
  if (dist > 350) return 0.05;

  const distanceFactor = 1 - (dist / 350); // 0 to 1
  const shootingFactor = player.shooting / 100; // 0 to 1
  
  // Angle penalty (y-distance from goal center decreases probability)
  const yDiff = Math.abs(player.y - FIELD_HEIGHT / 2);
  const angleFactor = 1 - (yDiff / 200); // lower probability from tight angles

  // Combine factors
  const prob = (distanceFactor * 0.5 + shootingFactor * 0.3 + angleFactor * 0.2);
  return clamp(prob, 0.05, 0.95);
}

// Run one simulation tick
export function runMatchTick(
  state: MatchState,
  mangaTriggerCallback: (event: MangaEvent) => void
): MatchState {
  if (!state.isPlaying || state.isMangaPaused) return state;

  const { players, ball } = state;

  // 1. Tick clock down
  state.timeRemaining = Math.max(0, state.timeRemaining - 1 / 60); // assumes 60 FPS
  if (state.timeRemaining <= 0) {
    state.isPlaying = false;
    return state;
  }

  // 2. Outfield Stamina Degradation — faster for low-stamina players
  players.forEach(p => {
    const role = getRoleFromIndex(players.indexOf(p) % 11);
    if (role !== 'GK') {
      // Higher stamina stat = slower drain; wingers/strikers burn more energy
      const positionBurn = ['ST','LW','RW'].includes(p.position ?? '') ? 1.4 : 1.0;
      const drainRate = 0.012 * positionBurn * (1 - (p.stamina - 50) / 500);
      p.currentStamina = Math.max(5, p.currentStamina - drainRate);
    }
  });

  // 3. Check Ball Possession (if ball is free)
  if (ball.controlledById === null) {
    let closestPlayer: Player | null = null;
    let closestDist = Infinity;

    players.forEach(p => {
      const dist = getDistance(p.x, p.y, ball.x, ball.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestPlayer = p;
      }
    });

    if (closestPlayer && closestDist <= CONTROL_DISTANCE) {
      const player = closestPlayer as Player;
      ball.controlledById = player.id;
      ball.lastPossessedById = player.id;
      player.hasBall = true;
      player.state = 'dribble';
    }
  }

  // Target goals
  const redGoalX = FIELD_WIDTH - PITCH_MARGIN; // Red attacks Right goal
  const blueGoalX = PITCH_MARGIN; // Blue attacks Left goal

  const ballCarrier = players.find(p => p.id === ball.controlledById);

  // 4. Autonomous Agent Decision Making Loop (for each player)
  players.forEach((player, index) => {
    const role = getRoleFromIndex(index % 5);
    const home = player.side === 'red' ? RED_HOME_POSITIONS[role] : BLUE_HOME_POSITIONS[role];
    const opponentGoalX = player.side === 'red' ? redGoalX : blueGoalX;
    const ownGoalX = player.side === 'red' ? blueGoalX : redGoalX;

    player.timeSinceLastAction += 1;

    // Check pressure metric (nearest opponent distance)
    let nearestOpponentDist = Infinity;
    let nearestOpponent: Player | null = null;
    players.forEach(other => {
      if (other.side !== player.side) {
        const d = getDistance(player.x, player.y, other.x, other.y);
        if (d < nearestOpponentDist) {
          nearestOpponentDist = d;
          nearestOpponent = other;
        }
      }
    });

    // Goalkeeper AI
    if (role === 'GK') {
      const ballDistToGoal = getDistance(ball.x, ball.y, ownGoalX, FIELD_HEIGHT / 2);
      if (ballDistToGoal < 180 && !ball.controlledById) {
        // Rush to ball
        player.state = 'chase_ball';
        player.targetX = ball.x;
        player.targetY = ball.y;
      } else {
        // Return to/stay near own line
        player.state = 'return_to_position';
        // Follow ball height but clamp within Y bounds
        player.targetX = home.x;
        player.targetY = clamp(ball.y, GOAL_Y_TOP, GOAL_Y_BOTTOM);
      }

      // If GK gets the ball, clear it!
      if (player.hasBall && player.timeSinceLastAction > 20) {
        player.timeSinceLastAction = 0;
        
        // Decide clear style based on trait
        if (player.trait === 'Calculative' || player.trait === 'Team-First') {
          // Pass to nearest defender
          const teammates = players.filter(t => t.side === player.side && t.id !== player.id);
          const target = teammates.reduce((prev, curr) => 
            getDistance(player.x, player.y, curr.x, curr.y) < getDistance(player.x, player.y, prev.x, prev.y) ? curr : prev
          );
          passBall(ball, player, target);
        } else {
          // Boot it far (long kick)
          shootBall(ball, player, opponentGoalX, FIELD_HEIGHT / 2 + (Math.random() * 80 - 40), 10);
        }
      }
      return;
    }

    // Outfield Player AI
    if (player.hasBall) {
      // 4A. PLAYER HAS THE BALL (Attack decision)
      player.state = 'dribble';
      
      // Default movement: run towards goal
      player.targetX = opponentGoalX;
      player.targetY = clamp(ball.y, PITCH_MARGIN + 30, FIELD_HEIGHT - PITCH_MARGIN - 30);

      // Decision throttle to prevent action spamming
      if (player.timeSinceLastAction > 30) {
        player.timeSinceLastAction = 0;

        const goalDist = getDistance(player.x, player.y, opponentGoalX, FIELD_HEIGHT / 2);
        const goalProb = getGoalProbability(player, opponentGoalX);

        // Base Decision weights (in %)
        let passWeight = 30;
        let shootWeight = 10;
        let dribbleWeight = 60;

        // Position-based base weights
        const pos = player.position ?? '';
        if (pos === 'ST') {
          shootWeight = 40; passWeight = 15; dribbleWeight = 45;
        } else if (pos === 'CAM') {
          shootWeight = 25; passWeight = 50; dribbleWeight = 25;
        } else if (pos === 'LW' || pos === 'RW') {
          shootWeight = 20; passWeight = 25; dribbleWeight = 55;
        } else if (pos === 'CM') {
          shootWeight = 20; passWeight = 55; dribbleWeight = 25;
        } else if (pos === 'CB') {
          shootWeight = 5;  passWeight = 70; dribbleWeight = 25;
        }

        // Apply Trait modifiers on top of position weights
        if (player.trait === 'Arrogant') {
          // Ronaldo/Haaland: always want the glory shot, never pass
          shootWeight += 45;
          dribbleWeight += 20;
          passWeight -= 65;
          // Extra: shoot even from long range if stamina is high
          if (player.currentStamina > 60 && goalDist < 400) shootWeight += 15;
        } else if (player.trait === 'Calculative') {
          // Messi/De Bruyne/Van Dijk: wait for perfect opportunity
          if (goalProb > 0.65) {
            shootWeight = 75; dribbleWeight = 15; passWeight = 10;
          } else if (goalProb > 0.45) {
            shootWeight = 35; passWeight = 45; dribbleWeight = 20;
          } else {
            passWeight = 75; dribbleWeight = 20; shootWeight = 5;
          }
        } else if (player.trait === 'Panic-Prone') {
          // Ramos: solid under no pressure, but panics when closed down
          if (nearestOpponentDist < 40) {
            // Under pressure: random clearance or panicky pass
            passWeight = 80; dribbleWeight = 5; shootWeight = 15;
            // Occasionally shoots wildly
            if (Math.random() < 0.2) { shootWeight = 60; passWeight = 35; }
          } else if (player.currentStamina < 30) {
            passWeight = 85; dribbleWeight = 10; shootWeight = 5;
          }
        } else if (player.trait === 'Maverick') {
          // Neymar/Mbappe: unpredictable, speed dribbles, shoot from anywhere
          shootWeight += 20;
          dribbleWeight += 30;
          passWeight -= 50;
          // Mbappe speciality: burst dribble towards goal
          if (pos === 'RW' || pos === 'LW') {
            dribbleWeight += 15;
            // If speed is very high (>90), add extra burst boost
            if (player.speed > 90 && goalDist < 350) shootWeight += 25;
          }
        } else if (player.trait === 'Team-First') {
          // Modric/Bellingham: always look for the best pass option first
          passWeight += 50;
          shootWeight -= 15;
          dribbleWeight -= 35;
          // Bellingham (CM): box-to-box, more willing to shoot than Modric
          if (pos === 'CM' && goalProb > 0.55) {
            shootWeight += 20; passWeight -= 20;
          }
        }

        // Clamp weights
        passWeight = Math.max(0, passWeight);
        shootWeight = Math.max(0, shootWeight);
        dribbleWeight = Math.max(0, dribbleWeight);
        const totalW = passWeight + shootWeight + dribbleWeight;

        // Random roll
        const roll = Math.random() * totalW;
        if (roll < shootWeight) {
          // SHOOT ACTION
          // Check for Clutch Shot trigger (Goal prob > 70%)
          if (goalProb > 0.70) {
            const event: MangaEvent = {
              id: generateId(),
              type: 'clutch_shot',
              player: { ...player },
              goalProbability: Math.floor(goalProb * 100),
              timestamp: new Date().toLocaleTimeString()
            };
            mangaTriggerCallback(event);
            state.currentMangaEvent = event;
          }

          shootBall(ball, player, opponentGoalX, FIELD_HEIGHT / 2 + (Math.random() * 60 - 30), 12 + (player.shooting / 25));
        } else if (roll < shootWeight + passWeight) {
          // PASS ACTION
          const teammates = players.filter(t => t.side === player.side && t.id !== player.id && getRoleFromIndex(players.indexOf(t) % 11) !== 'GK');
          
          if (teammates.length > 0) {
            // Rank teammates based on proximity to opponent goal
            const sortedTeammates = [...teammates].sort((a, b) => {
              const distA = getDistance(a.x, a.y, opponentGoalX, FIELD_HEIGHT / 2);
              const distB = getDistance(b.x, b.y, opponentGoalX, FIELD_HEIGHT / 2);
              return distA - distB; // closest to goal first
            });

            // Target the best positioned teammate
            const target = sortedTeammates[0];

            // Trigger "Setup" Manga event if passing to striker/forward in the box
            const targetDistToGoal = getDistance(target.x, target.y, opponentGoalX, FIELD_HEIGHT / 2);
            if (targetDistToGoal < 180 && player.side === 'red' ? player.x < target.x : player.x > target.x) {
              const event: MangaEvent = {
                id: generateId(),
                type: 'setup',
                player: { ...player },
                secondaryPlayer: { ...target },
                timestamp: new Date().toLocaleTimeString()
              };
              mangaTriggerCallback(event);
              state.currentMangaEvent = event;
            }

            passBall(ball, player, target);
          }
        } else {
          // DRIBBLE ACTION
          // Just run forward, adding speed to target
          const angleToGoal = Math.atan2(FIELD_HEIGHT / 2 - player.y, opponentGoalX - player.x);
          player.vx += Math.cos(angleToGoal) * 0.2;
          player.vy += Math.sin(angleToGoal) * 0.2;
        }
      }
    } else {
      // 4B. PLAYER DOES NOT HAVE THE BALL
      
      // If team has ball, advance forward to support
      const teamHasBall = players.some(p => p.side === player.side && p.hasBall);
      
      if (teamHasBall) {
        // Attack support positioning
        player.state = 'chase_ball'; // heading to support position
        const carrier = players.find(p => p.side === player.side && p.hasBall)!;
        
        // Position relative to home/carrier
        player.targetX = home.x + (carrier.x - home.x) * 0.65;
        // Midfield/Striker targets run forward
        if (role === 'FW') {
          player.targetX = clamp(carrier.x + (player.side === 'red' ? 90 : -90), PITCH_MARGIN + 50, FIELD_WIDTH - PITCH_MARGIN - 50);
          player.targetY = carrier.y + (player.y > carrier.y ? 60 : -60);
        } else {
          player.targetY = home.y + (carrier.y - home.y) * 0.3;
        }
      } else {
        // Opponent has ball / Ball is free: Defense mode
        const opponentHasBall = players.some(p => p.side !== player.side && p.hasBall);
        
        if (opponentHasBall) {
          const carrier = players.find(p => p.side !== player.side && p.hasBall)!;
          const distToCarrier = getDistance(player.x, player.y, carrier.x, carrier.y);

          // Tackle Mechanic: if close enough, attempt defensive tackle
          if (distToCarrier < 20 && player.timeSinceLastAction > 20) {
            player.timeSinceLastAction = 0;
            
            // Calculate tackle success based on stats
            const defensePower = player.defense + (player.currentStamina * 0.1);
            const carrierEvade = carrier.speed + (carrier.currentStamina * 0.1);
            
            const tackleProb = clamp((defensePower / (defensePower + carrierEvade)) * 0.75, 0.1, 0.9);
            const roll = Math.random();

            if (roll < tackleProb) {
              // SUCCESSFUL TACKLE
              ball.controlledById = player.id;
              ball.lastPossessedById = player.id;
              player.hasBall = true;
              carrier.hasBall = false;
              player.state = 'dribble';
              carrier.state = 'idle';
              // Push carrier back slightly
              carrier.x += (carrier.side === 'red' ? -15 : 15);
            } else {
              // TACKLE FAILED: BREAKDOWN TRIGGER
              // Trigger "Breakdown" if defender fails tackle at low stamina (< 20%)
              if (player.currentStamina < 20 && (role === 'CB1' || role === 'CB2' || role === 'LB' || role === 'RB')) {
                const event: MangaEvent = {
                  id: generateId(),
                  type: 'breakdown',
                  player: { ...player },
                  secondaryPlayer: { ...carrier }, // the carrier who broke through
                  timestamp: new Date().toLocaleTimeString()
                };
                mangaTriggerCallback(event);
                state.currentMangaEvent = event;
              }
              
              // Apply stumble penalty to defender
              player.vx *= -0.2;
              player.vy *= -0.2;
            }
          }

          // Defensive tracking target
          const isDefender = ['LB','CB1','CB2','RB','CDM'].includes(role);
          const isMid = ['CM1','CM2'].includes(role);
          if (isDefender || (isMid && Math.random() < 0.7)) {
            // Chase ball carrier if in own half, else block pathways
            const isCarrierInOwnHalf = player.side === 'red' ? carrier.x < FIELD_WIDTH / 2 + 50 : carrier.x > FIELD_WIDTH / 2 - 50;
            
            if (isCarrierInOwnHalf || distToCarrier < 150) {
              player.state = 'defend';
              player.targetX = carrier.x;
              player.targetY = carrier.y;
            } else {
              player.state = 'return_to_position';
              player.targetX = home.x;
              player.targetY = home.y;
            }
          } else {
            // Midfielder/Forwards stay balanced or return to support positions
            player.state = 'return_to_position';
            player.targetX = home.x;
            player.targetY = home.y;
          }
        } else {
          // Ball is free: rush to ball if closest, else maintain formation
          let closestToBall = true;
          const myDistToBall = getDistance(player.x, player.y, ball.x, ball.y);

          players.forEach(other => {
            if (other.side === player.side && other.id !== player.id) {
              if (getDistance(other.x, other.y, ball.x, ball.y) < myDistToBall) {
                closestToBall = false;
              }
            }
          });

          // Only GK is exempt from this out of box chase
          if (closestToBall && myDistToBall < 300) {
            player.state = 'chase_ball';
            player.targetX = ball.x;
            player.targetY = ball.y;
          } else {
            player.state = 'return_to_position';
            player.targetX = home.x;
            player.targetY = home.y;
          }
        }
      }
    }

    // Apply movement physics
    updatePlayerPhysics(player, player.targetX, player.targetY);
  });

  // 5. Update ball position & resolve player-player collisions
  updateBallPhysics(ball, players);
  resolvePlayerCollisions(players);

  // 6. Goal Scoring Boundaries Check
  // Goal left (Blue scored on Red / Blue Goalpost)
  if (ball.x < PITCH_MARGIN && ball.y >= GOAL_Y_TOP && ball.y <= GOAL_Y_BOTTOM) {
    state.scoreBlue += 1;
    
    // Attribute goal and assist
    attributeScoreStats(players, ball.lastPossessedById, 'blue');
    
    // Reset positions
    resetToKickoff(players, ball);
  }
  // Goal right (Red scored on Blue / Red Goalpost)
  else if (ball.x > FIELD_WIDTH - PITCH_MARGIN && ball.y >= GOAL_Y_TOP && ball.y <= GOAL_Y_BOTTOM) {
    state.scoreRed += 1;

    // Attribute goal and assist
    attributeScoreStats(players, ball.lastPossessedById, 'red');
    
    resetToKickoff(players, ball);
  }

  return state;
}

// Pass action
function passBall(ball: Ball, passer: Player, receiver: Player): void {
  ball.controlledById = null;
  passer.hasBall = false;
  passer.state = 'idle';

  const dx = receiver.x - ball.x;
  const dy = receiver.y - ball.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Passing power based on passing stat
  const basePassPower = 5 + (passer.passing / 20); // 5 to 10
  
  if (dist > 0) {
    ball.vx = (dx / dist) * basePassPower;
    ball.vy = (dy / dist) * basePassPower;
  }
}

// Shoot action
function shootBall(ball: Ball, shooter: Player, targetX: number, targetY: number, power: number): void {
  ball.controlledById = null;
  shooter.hasBall = false;
  shooter.state = 'idle';

  const dx = targetX - ball.x;
  const dy = targetY - ball.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 0) {
    ball.vx = (dx / dist) * power;
    ball.vy = (dy / dist) * power;
  }
}

// Attribute Goals and Assists post goal
function attributeScoreStats(players: Player[], scorerId: string | null, scoringSide: 'red' | 'blue'): void {
  if (!scorerId) return;

  const scorer = players.find(p => p.id === scorerId);
  if (scorer && scorer.side === scoringSide) {
    scorer.goals += 1;
    // Find assistant (the teammate who last touched it before)
    // For simplicity in this offline MVP, we'll assign assists if there was a recent setup,
    // or just leave goals scored. We'll update the scorer's count!
  }
}
