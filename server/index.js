// Load .env.local for local dev; on Railway env vars are injected directly
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback to .env if .env.local missing
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ethers } = require('ethers');
const crypto = require('crypto');

const app = express();
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (origin.endsWith('.vercel.app') || origin.startsWith('http://localhost')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  next();
});
const httpServer = http.createServer(app);
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Always allow vercel.app and localhost origins
      if (
        origin.endsWith('.vercel.app') ||
        origin.startsWith('http://localhost') ||
        ALLOWED_ORIGINS.some(o => origin === o)
      ) {
        return callback(null, true);
      }
      console.warn('CORS blocked origin:', origin);
      callback(null, true); // permissive for now — tighten after launch
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 4000;

// ── Escrow contract setup ─────────────────────────────────────────────────────
const ESCROW_ABI = [
  "function advanceStage(bytes32 matchId, uint8 newStage) external",
  "function slashPlayer(bytes32 matchId, address disconnectedPlayer) external",
  "function resolveMatch(bytes32 matchId, address winner) external",
];

function getEscrowContract() {
  if (!process.env.ESCROW_ADDRESS || !process.env.PRIVATE_KEY || !process.env.MONAD_RPC_URL) return null;
  const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.ESCROW_ADDRESS, ESCROW_ABI, signer);
}

// ── Card pool (shared by all matches) ────────────────────────────────────────
const CARD_POOL = [
  { id: 'c1',  name: 'El Magnifico',   tier: 'Legendary', cost: 6, speed: 92, passing: 95, shooting: 94, defense: 45, stamina: 85, trait: 'Arrogant' },
  { id: 'c2',  name: 'The Surgeon',    tier: 'Legendary', cost: 6, speed: 78, passing: 97, shooting: 88, defense: 62, stamina: 80, trait: 'Calculative' },
  { id: 'c3',  name: 'Chaos Engine',   tier: 'Epic',      cost: 4, speed: 95, passing: 68, shooting: 90, defense: 38, stamina: 88, trait: 'Maverick' },
  { id: 'c4',  name: 'Iron Wall',      tier: 'Epic',      cost: 4, speed: 65, passing: 72, shooting: 55, defense: 96, stamina: 90, trait: 'Team-First' },
  { id: 'c5',  name: 'Phantom Runner', tier: 'Epic',      cost: 4, speed: 97, passing: 75, shooting: 82, defense: 42, stamina: 92, trait: 'Maverick' },
  { id: 'c6',  name: 'The Anchor',     tier: 'Rare',      cost: 3, speed: 68, passing: 80, shooting: 60, defense: 88, stamina: 85, trait: 'Team-First' },
  { id: 'c7',  name: 'Quick Thinker',  tier: 'Rare',      cost: 3, speed: 80, passing: 85, shooting: 75, defense: 70, stamina: 80, trait: 'Calculative' },
  { id: 'c8',  name: 'Wild Card',      tier: 'Rare',      cost: 3, speed: 85, passing: 65, shooting: 80, defense: 55, stamina: 75, trait: 'Maverick' },
  { id: 'c9',  name: 'Steady Hand',    tier: 'Common',    cost: 2, speed: 70, passing: 72, shooting: 68, defense: 68, stamina: 78, trait: 'Team-First' },
  { id: 'c10', name: 'Grit Runner',    tier: 'Common',    cost: 2, speed: 75, passing: 65, shooting: 70, defense: 65, stamina: 82, trait: 'Panic-Prone' },
  { id: 'c11', name: 'Workhorse',      tier: 'Common',    cost: 2, speed: 68, passing: 70, shooting: 65, defense: 72, stamina: 88, trait: 'Team-First' },
  { id: 'c12', name: 'Scrapper',       tier: 'Common',    cost: 1, speed: 62, passing: 58, shooting: 60, defense: 60, stamina: 72, trait: 'Panic-Prone' },
  { id: 'c13', name: 'Rookie',         tier: 'Common',    cost: 1, speed: 65, passing: 60, shooting: 58, defense: 55, stamina: 70, trait: 'Panic-Prone' },
  { id: 'c14', name: 'Eager Lad',      tier: 'Common',    cost: 1, speed: 68, passing: 62, shooting: 62, defense: 58, stamina: 74, trait: 'Team-First' },
];

// ── In-memory match rooms ─────────────────────────────────────────────────────
// matchId => room state
const rooms = new Map();

function createRoom(matchId, player1SocketId, player1Address, stake) {
  return {
    matchId,
    stake,
    stage: 0, // 0=lobby, 1=draft, 2=placement, 3=match, 4=result
    players: {
      [player1SocketId]: { address: player1Address, ready: false, squad: [], formation: {}, points: 10 },
    },
    timers: {},
    matchResult: null,
  };
}

// ── Queue for random matchmaking ─────────────────────────────────────────────
const queue = []; // { socketId, address, stake }

// ── Helpers ───────────────────────────────────────────────────────────────────
function getRoom(matchId) { return rooms.get(matchId); }

function getRoomForSocket(socketId) {
  for (const [, room] of rooms) {
    if (room.players[socketId]) return room;
  }
  return null;
}

function playerList(room) {
  return Object.entries(room.players).map(([sid, p]) => ({ socketId: sid, address: p.address }));
}

function broadcastRoom(room, event, data) {
  Object.keys(room.players).forEach(sid => {
    io.to(sid).emit(event, data);
  });
}

function startDraftTimer(room) {
  const DRAFT_SECONDS = 60;
  let remaining = DRAFT_SECONDS;
  room.timers.draft = setInterval(() => {
    remaining--;
    broadcastRoom(room, 'timer_tick', { stage: 1, remaining });
    if (remaining <= 0) {
      clearInterval(room.timers.draft);
      advanceToPlacement(room);
    }
  }, 1000);
}

function startPlacementTimer(room) {
  const PLACEMENT_SECONDS = 60;
  let remaining = PLACEMENT_SECONDS;
  room.timers.placement = setInterval(() => {
    remaining--;
    broadcastRoom(room, 'timer_tick', { stage: 2, remaining });
    if (remaining <= 0) {
      clearInterval(room.timers.placement);
      advanceToMatch(room);
    }
  }, 1000);
}

function advanceToPlacement(room) {
  room.stage = 2;
  broadcastRoom(room, 'stage_change', { stage: 2 });
  startPlacementTimer(room);
  tryAdvanceStageOnChain(room, 2);
}

function advanceToMatch(room) {
  room.stage = 3;
  broadcastRoom(room, 'stage_change', {
    stage: 3,
    squads: Object.fromEntries(
      Object.entries(room.players).map(([sid, p]) => [p.address, { squad: p.squad, formation: p.formation }])
    )
  });
  startMatchTimer(room);
  tryAdvanceStageOnChain(room, 3);
}

function startMatchTimer(room) {
  const MATCH_SECONDS = 180; // 3 minutes
  let remaining = MATCH_SECONDS;
  room.timers.match = setInterval(() => {
    remaining--;
    broadcastRoom(room, 'timer_tick', { stage: 3, remaining });
    if (remaining <= 0) {
      clearInterval(room.timers.match);
      resolveMatchResult(room);
    }
  }, 1000);
}

function resolveMatchResult(room) {
  // Deterministic winner: sum of squad total stats
  const scores = Object.entries(room.players).map(([sid, p]) => {
    const total = p.squad.reduce((acc, card) => acc + card.speed + card.passing + card.shooting + card.defense + card.stamina, 0);
    return { sid, address: p.address, total };
  });
  scores.sort((a, b) => b.total - a.total);
  const winner = scores[0];

  room.stage = 4;
  room.matchResult = { winner: winner.address, scores };
  broadcastRoom(room, 'match_result', room.matchResult);
  tryResolveOnChain(room, winner.address);
}

async function tryAdvanceStageOnChain(room, stage) {
  try {
    const escrow = getEscrowContract();
    if (!escrow) return;
    const matchIdBytes = ethers.id(room.matchId);
    await escrow.advanceStage(matchIdBytes, stage);
  } catch (e) {
    console.error('advanceStage on-chain failed:', e.message);
  }
}

async function tryResolveOnChain(room, winnerAddress) {
  try {
    const escrow = getEscrowContract();
    if (!escrow) return;
    const matchIdBytes = ethers.id(room.matchId);
    await escrow.resolveMatch(matchIdBytes, winnerAddress);
    console.log(`Match ${room.matchId} resolved on-chain. Winner: ${winnerAddress}`);
  } catch (e) {
    console.error('resolveMatch on-chain failed:', e.message);
  }
}

async function trySlashOnChain(room, disconnectedAddress) {
  try {
    const escrow = getEscrowContract();
    if (!escrow) return;
    const matchIdBytes = ethers.id(room.matchId);
    await escrow.slashPlayer(matchIdBytes, disconnectedAddress);
    console.log(`Slashed ${disconnectedAddress} in match ${room.matchId}`);
  } catch (e) {
    console.error('slashPlayer on-chain failed:', e.message);
  }
}

// ── Socket.io event handlers ──────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // ── Matchmaking queue ──────────────────────────────────────────────────────
  socket.on('join_queue', ({ address, stake }) => {
    // Remove if already in queue
    const existing = queue.findIndex(q => q.address === address);
    if (existing !== -1) queue.splice(existing, 1);

    const opponent = queue.find(q => q.stake === stake);
    if (opponent) {
      queue.splice(queue.indexOf(opponent), 1);
      const matchId = crypto.randomUUID();
      const room = createRoom(matchId, opponent.socketId, opponent.address, stake);
      room.players[socket.id] = { address, ready: false, squad: [], formation: {}, points: 10 };
      rooms.set(matchId, room);

      io.to(opponent.socketId).emit('match_found', { matchId, opponent: address, cardPool: CARD_POOL });
      socket.emit('match_found', { matchId, opponent: opponent.address, cardPool: CARD_POOL });

      // Start draft after 2s buffer
      setTimeout(() => {
        room.stage = 1;
        broadcastRoom(room, 'stage_change', { stage: 1 });
        startDraftTimer(room);
      }, 2000);
    } else {
      queue.push({ socketId: socket.id, address, stake });
      socket.emit('queued', { position: queue.length });
    }
  });

  socket.on('leave_queue', () => {
    const idx = queue.findIndex(q => q.socketId === socket.id);
    if (idx !== -1) queue.splice(idx, 1);
    socket.emit('queue_left');
  });

  // ── Custom room (invite) ───────────────────────────────────────────────────
  socket.on('create_room', ({ matchId, address, stake }) => {
    if (rooms.has(matchId)) { socket.emit('error', { msg: 'Room already exists' }); return; }
    const room = createRoom(matchId, socket.id, address, stake);
    rooms.set(matchId, room);
    socket.emit('room_created', { matchId, cardPool: CARD_POOL });
  });

  socket.on('join_room', ({ matchId, address }) => {
    const room = getRoom(matchId);
    if (!room) { socket.emit('error', { msg: 'Room not found' }); return; }
    if (Object.keys(room.players).length >= 2) { socket.emit('error', { msg: 'Room is full' }); return; }

    room.players[socket.id] = { address, ready: false, squad: [], formation: {}, points: 10 };
    const [p1sid] = Object.keys(room.players);
    const p1 = room.players[p1sid];

    socket.emit('room_joined', { matchId, opponent: p1.address, cardPool: CARD_POOL });
    io.to(p1sid).emit('opponent_joined', { opponent: address });

    setTimeout(() => {
      room.stage = 1;
      broadcastRoom(room, 'stage_change', { stage: 1 });
      startDraftTimer(room);
    }, 2000);
  });

  // ── Draft stage: pick a card ───────────────────────────────────────────────
  socket.on('pick_card', ({ matchId, cardId }) => {
    const room = getRoom(matchId);
    if (!room || room.stage !== 1) return;
    const player = room.players[socket.id];
    if (!player) return;

    const card = CARD_POOL.find(c => c.id === cardId);
    if (!card) return;
    if (player.squad.some(c => c.id === cardId)) { socket.emit('pick_rejected', { cardId, reason: 'already_picked' }); return; }
    if (player.points < card.cost) { socket.emit('pick_rejected', { cardId, reason: 'insufficient_points' }); return; }
    if (player.squad.length >= 5) { socket.emit('pick_rejected', { cardId, reason: 'squad_full' }); return; }

    player.squad.push(card);
    player.points -= card.cost;

    socket.emit('pick_confirmed', { card, remainingPoints: player.points, squadSize: player.squad.length });

    // If both players have 5 cards, advance immediately
    const allDone = Object.values(room.players).every(p => p.squad.length === 5);
    if (allDone) {
      clearInterval(room.timers.draft);
      advanceToPlacement(room);
    }
  });

  // ── Draft stage: unpick a card ────────────────────────────────────────────
  socket.on('unpick_card', ({ matchId, cardId }) => {
    const room = getRoom(matchId);
    if (!room || room.stage !== 1) return;
    const player = room.players[socket.id];
    if (!player) return;

    const idx = player.squad.findIndex(c => c.id === cardId);
    if (idx === -1) return;

    const [card] = player.squad.splice(idx, 1);
    player.points += card.cost;

    socket.emit('unpick_confirmed', { cardId, remainingPoints: player.points, squadSize: player.squad.length });
  });

  // ── Placement stage: submit formation ────────────────────────────────────
  socket.on('submit_formation', ({ matchId, formation }) => {
    const room = getRoom(matchId);
    if (!room || room.stage !== 2) return;
    const player = room.players[socket.id];
    if (!player) return;

    player.formation = formation;
    player.ready = true;
    socket.emit('formation_confirmed');

    const allReady = Object.values(room.players).every(p => p.ready);
    if (allReady) {
      clearInterval(room.timers.placement);
      Object.values(room.players).forEach(p => p.ready = false);
      advanceToMatch(room);
    }
  });

  // ── Disconnect handling ───────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove from queue if waiting
    const qi = queue.findIndex(q => q.socketId === socket.id);
    if (qi !== -1) queue.splice(qi, 1);

    const room = getRoomForSocket(socket.id);
    if (!room) return;

    const disconnectedPlayer = room.players[socket.id];
    if (!disconnectedPlayer) return;

    // During Stage 3 (match): let simulation finish, don't slash
    if (room.stage === 3) {
      broadcastRoom(room, 'opponent_disconnected', { address: disconnectedPlayer.address });
      return;
    }

    // During Stage 1 or 2: slash the disconnected player
    if (room.stage === 1 || room.stage === 2) {
      Object.keys(room.players).forEach(sid => {
        if (sid !== socket.id) {
          io.to(sid).emit('opponent_disconnected_slashed', { address: disconnectedPlayer.address });
        }
      });
      // Clear all timers
      Object.values(room.timers).forEach(t => clearInterval(t));
      trySlashOnChain(room, disconnectedPlayer.address);
      rooms.delete(room.matchId);
    }

    delete room.players[socket.id];
  });

  // ── Health check ──────────────────────────────────────────────────────────
  socket.on('ping_server', () => socket.emit('pong_server', { time: Date.now() }));
});

app.get('/health', (_, res) => res.json({ status: 'ok', rooms: rooms.size, queue: queue.length }));

httpServer.listen(PORT, () => console.log(`Manga-Match server running on port ${PORT}`));
