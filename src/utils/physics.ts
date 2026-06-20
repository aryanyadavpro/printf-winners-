import { Player, Ball } from '../types/game';

// Field Dimensions
export const FIELD_WIDTH = 800;
export const FIELD_HEIGHT = 450;
export const PITCH_MARGIN = 25;

// Goalpost Dimensions (y range)
export const GOAL_Y_TOP = 175;
export const GOAL_Y_BOTTOM = 275;

// Physics parameters
export const BALL_FRICTION = 0.985;
export const PLAYER_FRICTION = 0.92;
export const MAX_PLAYER_SPEED = 4.2;
export const MIN_STAMINA_SPEED_FACTOR = 0.55;

export const PLAYER_RADIUS = 15;
export const BALL_RADIUS = 8;
export const CONTROL_DISTANCE = 22; // How close a player must be to take control of the ball

// Core Distance math
export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Clamp values
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Update ball movement
export function updateBallPhysics(ball: Ball, players: Player[]): void {
  if (ball.controlledById) {
    const carrier = players.find(p => p.id === ball.controlledById);
    if (carrier) {
      // Ball is locked slightly in front of the carrier's movement direction
      const angle = Math.atan2(carrier.vy || 1, carrier.vx || 1);
      ball.x = carrier.x + Math.cos(angle) * 16;
      ball.y = carrier.y + Math.sin(angle) * 16;
      ball.vx = carrier.vx;
      ball.vy = carrier.vy;
    }
    return;
  }

  // Apply friction
  ball.vx *= BALL_FRICTION;
  ball.vy *= BALL_FRICTION;

  // Update positions
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Stop completely if slow
  if (Math.abs(ball.vx) < 0.05) ball.vx = 0;
  if (Math.abs(ball.vy) < 0.05) ball.vy = 0;

  // Boundaries & Collisions (bounce off walls)
  const leftBound = PITCH_MARGIN;
  const rightBound = FIELD_WIDTH - PITCH_MARGIN;
  const topBound = PITCH_MARGIN;
  const bottomBound = FIELD_HEIGHT - PITCH_MARGIN;

  // Goals checks: if within Y boundaries, it shouldn't bounce but rather enter the goal area.
  const inGoalY = ball.y >= GOAL_Y_TOP && ball.y <= GOAL_Y_BOTTOM;

  if (ball.x - ball.radius < leftBound) {
    if (inGoalY) {
      // Goal scored (handled by match engine), do not bounce.
    } else {
      ball.x = leftBound + ball.radius;
      ball.vx = -ball.vx * 0.6; // bounce energy loss
    }
  } else if (ball.x + ball.radius > rightBound) {
    if (inGoalY) {
      // Goal scored (handled by match engine), do not bounce.
    } else {
      ball.x = rightBound - ball.radius;
      ball.vx = -ball.vx * 0.6;
    }
  }

  if (ball.y - ball.radius < topBound) {
    ball.y = topBound + ball.radius;
    ball.vy = -ball.vy * 0.6;
  } else if (ball.y + ball.radius > bottomBound) {
    ball.y = bottomBound - ball.radius;
    ball.vy = -ball.vy * 0.6;
  }
}

// Update player physics (movement, steering towards target)
export function updatePlayerPhysics(player: Player, targetX: number, targetY: number): void {
  // Stamina decays player speed
  const staminaRatio = player.currentStamina / 100;
  const staminaFactor = MIN_STAMINA_SPEED_FACTOR + (1 - MIN_STAMINA_SPEED_FACTOR) * staminaRatio;
  
  // Speed stat scaling (1-99 maps to speed range 1.8 to 4.2)
  const baseMaxSpeed = 1.8 + (player.speed / 100) * (MAX_PLAYER_SPEED - 1.8);
  const currentMaxSpeed = baseMaxSpeed * staminaFactor;

  // Steering force calculation
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  let desiredVx = 0;
  let desiredVy = 0;

  if (distance > 5) {
    desiredVx = (dx / distance) * currentMaxSpeed;
    desiredVy = (dy / distance) * currentMaxSpeed;
  }

  // Linear interpolation towards desired speed
  player.vx += (desiredVx - player.vx) * 0.08;
  player.vy += (desiredVy - player.vy) * 0.08;

  // Update positions
  player.x += player.vx;
  player.y += player.vy;

  // Clamp player inside boundaries (cannot walk into goals)
  player.x = clamp(player.x, PITCH_MARGIN + PLAYER_RADIUS, FIELD_WIDTH - PITCH_MARGIN - PLAYER_RADIUS);
  player.y = clamp(player.y, PITCH_MARGIN + PLAYER_RADIUS, FIELD_HEIGHT - PITCH_MARGIN - PLAYER_RADIUS);
}

// Collision resolution between players to prevent overlapping
export function resolvePlayerCollisions(players: Player[]): void {
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];

      const dist = getDistance(p1.x, p1.y, p2.x, p2.y);
      const minDist = PLAYER_RADIUS * 2;

      if (dist < minDist) {
        // Overlap detected: push apart
        const overlap = minDist - dist;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        
        // Direction vector
        const angle = dist > 0 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;

        const forceX = Math.cos(angle) * (overlap / 2);
        const forceY = Math.sin(angle) * (overlap / 2);

        p1.x -= forceX;
        p1.y -= forceY;
        p2.x += forceX;
        p2.y += forceY;

        // Bounce speeds
        const tempVx = p1.vx;
        const tempVy = p1.vy;
        p1.vx = p2.vx * 0.5;
        p1.vy = p2.vy * 0.5;
        p2.vx = tempVx * 0.5;
        p2.vy = tempVy * 0.5;
      }
    }
  }
}
