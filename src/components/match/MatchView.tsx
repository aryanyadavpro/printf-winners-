'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { BrowserProvider, parseEther, ethers } from 'ethers';
import { DraftCard, Formation, MatchResult, MatchStage } from '../../types/match';
import MatchLobby from './MatchLobby';
import DraftStage from './DraftStage';
import PlacementStage from './PlacementStage';
import MatchResult_UI from './MatchResult';
import PitchView from '../PitchView';
import { Player, PersonaTrait } from '../../types/game';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS || '';

const ESCROW_ABI = [
  "function createMatch(bytes32 matchId) external payable",
  "function joinMatch(bytes32 matchId) external payable",
];

interface MatchViewProps {
  walletAddress: string;
  provider: BrowserProvider | null;
}

function cardToPlayer(card: DraftCard, side: 'red' | 'blue', x: number, y: number): Player {
  return {
    id: `${side}_${card.id}`,
    tokenId: 0,
    name: card.name,
    side,
    speed: card.speed,
    passing: card.passing,
    shooting: card.shooting,
    defense: card.defense,
    stamina: card.stamina,
    currentStamina: 100,
    trait: card.trait as PersonaTrait,
    x, y, vx: 0, vy: 0,
    state: 'idle', targetX: x, targetY: y,
    hasBall: false, timeSinceLastAction: 0, goals: 0, assists: 0,
  };
}

export default function MatchView({ walletAddress, provider }: MatchViewProps) {
  const socketRef = useRef<Socket | null>(null);
  const [stage, setStage] = useState<MatchStage>(0);
  const [matchId, setMatchId] = useState('');
  const [opponentAddress, setOpponentAddress] = useState('');
  const [cardPool, setCardPool] = useState<DraftCard[]>([]);
  const [mySquad, setMySquad] = useState<DraftCard[]>([]);
  const [myPoints, setMyPoints] = useState(10);
  const [myFormation, setMyFormation] = useState<Formation>({});
  const [formationSubmitted, setFormationSubmitted] = useState(false);
  const [timer, setTimer] = useState(60);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [matchSquads, setMatchSquads] = useState<{ red: Player[]; blue: Player[] } | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [stake, setStake] = useState('0.5');
  const [statusMsg, setStatusMsg] = useState('');

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SERVER_URL, { autoConnect: false });
    socketRef.current = socket;

    socket.on('connect', () => console.log('Socket connected:', socket.id));

    socket.on('queued', ({ position }: { position: number }) => {
      setQueuePosition(position);
      setIsConnecting(false);
    });

    socket.on('queue_left', () => setQueuePosition(null));

    socket.on('room_created', ({ matchId: mid, cardPool: pool }: any) => {
      setMatchId(mid);
      setCardPool(pool);
      setStatusMsg('Room created — share code with opponent');
      setIsConnecting(false);
    });

    socket.on('opponent_joined', ({ opponent }: { opponent: string }) => {
      setOpponentAddress(opponent);
      setStatusMsg('Opponent joined! Starting draft…');
    });

    socket.on('room_joined', ({ matchId: mid, opponent, cardPool: pool }: any) => {
      setMatchId(mid);
      setOpponentAddress(opponent);
      setCardPool(pool);
      setIsConnecting(false);
    });

    socket.on('match_found', ({ matchId: mid, opponent, cardPool: pool }: any) => {
      setMatchId(mid);
      setOpponentAddress(opponent);
      setCardPool(pool);
      setQueuePosition(null);
      setStatusMsg('Opponent found!');
    });

    socket.on('stage_change', ({ stage: s, squads, isHost: host }: any) => {
      setStage(s as MatchStage);
      setTimer(s === 1 ? 60 : s === 2 ? 60 : 180);
      setFormationSubmitted(false);
      if (s === 3 && squads) {
        setIsHost(!!host);
        // Build Player arrays from squads for PitchView
        const addresses = Object.keys(squads);
        const myAddr = walletAddress.toLowerCase();
        const mySquadData = squads[addresses.find((a: string) => a.toLowerCase() === myAddr) || addresses[0]];
        const oppSquadData = squads[addresses.find((a: string) => a.toLowerCase() !== myAddr) || addresses[1]];

        const redPlayers = (mySquadData?.squad || []).map((c: DraftCard, i: number) =>
          cardToPlayer(c, 'red', 100 + i * 80, 400 + (mySquadData.formation?.[i]?.y || 0) * 200)
        );
        const bluePlayers = (oppSquadData?.squad || []).map((c: DraftCard, i: number) =>
          cardToPlayer(c, 'blue', 100 + i * 80, 100 + (oppSquadData.formation?.[i]?.y || 0) * 100)
        );
        setMatchSquads({ red: redPlayers, blue: bluePlayers });
      }
    });

    socket.on('timer_tick', ({ remaining }: { stage: number; remaining: number }) => {
      setTimer(remaining);
    });

    socket.on('pick_confirmed', ({ card, remainingPoints }: any) => {
      setMySquad(prev => [...prev, card]);
      setMyPoints(remainingPoints);
    });

    socket.on('unpick_confirmed', ({ cardId, remainingPoints }: any) => {
      // Sync points authoritatively from server (squad already updated optimistically)
      setMySquad(prev => prev.filter(c => c.id !== cardId));
      setMyPoints(remainingPoints);
    });

    socket.on('pick_rejected', ({ reason }: { cardId: string; reason: string }) => {
      setStatusMsg(`Pick rejected: ${reason.replace(/_/g, ' ')}`);
    });

    socket.on('formation_confirmed', () => setFormationSubmitted(true));

    socket.on('match_result', (res: MatchResult) => {
      setResult(res);
      setStage(4);
    });

    socket.on('opponent_disconnected_slashed', ({ address }: { address: string }) => {
      setStatusMsg(`Opponent (${address.slice(0, 6)}…) disconnected — their stake is being slashed to you.`);
      setStage(4);
      setResult({ winner: walletAddress, scores: [{ address: walletAddress, total: 9999 }, { address, total: 0 }] });
    });

    socket.on('opponent_disconnected', ({ address }: { address: string }) => {
      setStatusMsg(`Opponent disconnected — match continues autonomously.`);
    });

    socket.on('error', ({ msg }: { msg: string }) => {
      alert(msg);
      setIsConnecting(false);
    });

    socket.connect();
    return () => { socket.disconnect(); };
  }, [walletAddress]);

  // ── On-chain deposit helper ─────────────────────────────────────────────────
  async function depositToEscrow(mid: string, stakeEth: string, isCreator: boolean) {
    if (!provider || !ESCROW_ADDRESS) return;
    try {
      const signer = await provider.getSigner();
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
      const matchIdBytes = ethers.id(mid);
      const value = parseEther(stakeEth);
      if (isCreator) {
        const tx = await escrow.createMatch(matchIdBytes, { value });
        await tx.wait();
      } else {
        const tx = await escrow.joinMatch(matchIdBytes, { value });
        await tx.wait();
      }
    } catch (e: any) {
      console.error('Escrow deposit failed:', e.message);
    }
  }

  // ── Lobby handlers ──────────────────────────────────────────────────────────
  const handleJoinQueue = useCallback((s: string) => {
    setStake(s);
    setIsConnecting(true);
    socketRef.current?.emit('join_queue', { address: walletAddress, stake: s });
  }, [walletAddress]);

  const handleCreateRoom = useCallback(async (code: string, s: string) => {
    setStake(s);
    setIsConnecting(true);
    const mid = `room_${code}_${Date.now()}`;
    await depositToEscrow(mid, s, true);
    socketRef.current?.emit('create_room', { matchId: mid, address: walletAddress, stake: s });
  }, [walletAddress, provider]);

  const handleJoinRoom = useCallback(async (code: string) => {
    setIsConnecting(true);
    // Find matchId by room code prefix — simplified: user types full matchId
    const mid = code;
    await depositToEscrow(mid, stake, false);
    socketRef.current?.emit('join_room', { matchId: mid, address: walletAddress });
  }, [walletAddress, stake, provider]);

  const handleLeaveQueue = useCallback(() => {
    socketRef.current?.emit('leave_queue');
    setQueuePosition(null);
    setIsConnecting(false);
  }, []);

  // ── Stage handlers ──────────────────────────────────────────────────────────
  const handlePickCard = useCallback((cardId: string) => {
    socketRef.current?.emit('pick_card', { matchId, cardId });
  }, [matchId]);

  const handleUnpickCard = useCallback((cardId: string) => {
    setMySquad(prev => {
      const card = prev.find(c => c.id === cardId);
      if (card) setMyPoints(pts => pts + card.cost);
      return prev.filter(c => c.id !== cardId);
    });
    socketRef.current?.emit('unpick_card', { matchId, cardId });
  }, [matchId]);


  const handleSubmitFormation = useCallback((formation: Formation) => {
    setMyFormation(formation);
    socketRef.current?.emit('submit_formation', { matchId, formation });
  }, [matchId]);

  const handlePlayAgain = useCallback(() => {
    setStage(0);
    setMatchId('');
    setOpponentAddress('');
    setCardPool([]);
    setMySquad([]);
    setMyPoints(10);
    setMyFormation({});
    setFormationSubmitted(false);
    setResult(null);
    setMatchSquads(null);
    setIsHost(false);
    setQueuePosition(null);
    setStatusMsg('');
  }, []);

  // Stable reference — only recomputed when matchSquads changes, not on every timer tick
  const combinedSquad = useMemo(
    () => matchSquads ? [...matchSquads.red, ...matchSquads.blue] : [],
    [matchSquads]
  );

  return (
    <div>
      {statusMsg && (
        <div style={{
          textAlign: 'center', padding: '10px 20px',
          fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '2px',
          color: '#000', background: 'var(--fifa-gold-light)',
          borderBottom: '4px solid #000', boxShadow: '0 4px 0 #000',
        }}>
          ⚡ {statusMsg.toUpperCase()}
        </div>
      )}

      {stage === 0 && (
        <MatchLobby
          walletAddress={walletAddress}
          onJoinQueue={handleJoinQueue}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isConnecting={isConnecting}
          queuePosition={queuePosition}
          onLeaveQueue={handleLeaveQueue}
        />
      )}

      {stage === 1 && (
        <DraftStage
          cardPool={cardPool}
          mySquad={mySquad}
          myPoints={myPoints}
          lockedCardIds={new Set()}
          timer={timer}
          opponentAddress={opponentAddress}
          onPickCard={handlePickCard}
          onUnpickCard={handleUnpickCard}
        />
      )}

      {stage === 2 && (
        <PlacementStage
          mySquad={mySquad}
          timer={timer}
          onSubmitFormation={handleSubmitFormation}
          submitted={formationSubmitted}
        />
      )}

      {stage === 3 && matchSquads && (
        <PitchView
          squad={combinedSquad}
          myAddress={walletAddress}
          opponentAddress={opponentAddress}
          onBackToDashboard={handlePlayAgain}
          isHost={isHost}
          matchId={matchId}
          socket={socketRef.current}
        />
      )}

      {stage === 4 && result && (
        <MatchResult_UI
          result={result}
          myAddress={walletAddress}
          stake={stake}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
