'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserProvider, parseEther, ethers } from 'ethers';
import { supabase } from '../../lib/supabase';
import { CARD_POOL, resolveWinner } from '../../lib/matchEngine';
import { DraftCard, Formation, MatchResult, MatchStage } from '../../types/match';
import { Player, PersonaTrait } from '../../types/game';
import MatchLobby     from './MatchLobby';
import DraftStage     from './DraftStage';
import PlacementStage from './PlacementStage';
import MatchResult_UI from './MatchResult';
import PitchView      from '../PitchView';

const ESCROW_ABI = [
  'function createMatch(bytes32 matchId) external payable',
  'function joinMatch(bytes32 matchId) external payable',
  'function resolveMatch(bytes32 matchId, address winner) external',
];

function cardToPlayer(card: DraftCard, side: 'red' | 'blue', x: number, y: number): Player {
  return {
    id: `${side}_${card.id}`, tokenId: 0, name: card.name, side,
    speed: card.speed, passing: card.passing, shooting: card.shooting,
    defense: card.defense, stamina: card.stamina, currentStamina: 100,
    trait: card.trait as PersonaTrait,
    x, y, vx: 0, vy: 0, state: 'idle', targetX: x, targetY: y,
    hasBall: false, timeSinceLastAction: 0, goals: 0, assists: 0,
  };
}

interface MatchViewProps {
  walletAddress: string;
  provider: BrowserProvider | null;
}

export default function MatchView({ walletAddress, provider }: MatchViewProps) {
  const [stage, setStage]                   = useState<MatchStage>(0);
  const [matchId, setMatchId]               = useState('');
  const [opponentAddr, setOpponentAddr]     = useState('');
  const [mySquad, setMySquad]               = useState<DraftCard[]>([]);
  const [myPoints, setMyPoints]             = useState(10);
  const [lockedCardIds, setLockedCardIds]   = useState<Set<string>>(new Set());
  const [formationSubmitted, setFormationSubmitted] = useState(false);
  const [timer, setTimer]                   = useState(60);
  const [result, setResult]                 = useState<MatchResult | null>(null);
  const [matchSquads, setMatchSquads]       = useState<{ red: Player[]; blue: Player[] } | null>(null);
  const [isConnecting, setIsConnecting]     = useState(false);
  const [queuePosition, setQueuePosition]   = useState<number | null>(null);
  const [stake, setStake]                   = useState('0.5');
  const [statusMsg, setStatusMsg]           = useState('');

  // Refs — always current, safe to use inside Supabase callbacks
  const matchIdRef  = useRef('');
  const myAddrRef   = useRef(walletAddress);
  const stageRef    = useRef<MatchStage>(0);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  // keep latest squad/points in ref so async callbacks always see fresh value
  const mySquadRef  = useRef<DraftCard[]>([]);
  const myPointsRef = useRef(10);
  const isP1Ref     = useRef(false);

  useEffect(() => { myAddrRef.current = walletAddress; }, [walletAddress]);
  useEffect(() => { mySquadRef.current = mySquad; }, [mySquad]);
  useEffect(() => { myPointsRef.current = myPoints; }, [myPoints]);

  // ── timer ────────────────────────────────────────────────────────────────
  const startTimer = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(seconds);
    let rem = seconds;
    timerRef.current = setInterval(() => {
      rem--;
      setTimer(rem);
      if (rem <= 0) { clearInterval(timerRef.current!); timerRef.current = null; }
    }, 1000);
  }, []);

  // ── cleanup ──────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (queuePollRef.current) { clearInterval(queuePollRef.current); queuePollRef.current = null; }
    channelsRef.current.forEach(c => supabase.removeChannel(c));
    channelsRef.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // ── advance stage — only player1 does this to avoid race ────────────────
  const advanceStage = useCallback(async (mid: string, newStage: number, extra: object = {}) => {
    if (!isP1Ref.current) return; // only p1 advances stage
    await supabase
      .from('match_rooms')
      .update({ stage: newStage, stage_started_at: new Date().toISOString(), ...extra })
      .eq('id', mid)
      .lt('stage', newStage); // idempotent: only advance forward
  }, []);

  // ── handle room row updates (drives stage machine for both players) ──────
  const handleRoomUpdate = useCallback((room: any) => {
    // Update opponent address if we just got it
    if (room.player1_addr && room.player2_addr) {
      const opp = isP1Ref.current ? room.player2_addr : room.player1_addr;
      setOpponentAddr(opp);
    }

    const newStage = room.stage as MatchStage;
    if (newStage === stageRef.current) return; // no change
    stageRef.current = newStage;
    setStage(newStage);

    if (newStage === 1) {
      startTimer(60);
      setStatusMsg('');
    }
    if (newStage === 2) {
      startTimer(60);
      setFormationSubmitted(false);
      setStatusMsg('');
    }
    if (newStage === 3) {
      startTimer(180);
      const p1squad: DraftCard[] = room.player1_squad || [];
      const p2squad: DraftCard[] = room.player2_squad || [];
      const mySquadData  = isP1Ref.current ? p1squad : p2squad;
      const oppSquadData = isP1Ref.current ? p2squad : p1squad;
      setMatchSquads({
        red:  mySquadData.map( (c: DraftCard, i: number) => cardToPlayer(c, 'red',  150 + i * 160, 480)),
        blue: oppSquadData.map((c: DraftCard, i: number) => cardToPlayer(c, 'blue', 150 + i * 160, 120)),
      });
    }
    if (newStage === 4 && room.winner_addr) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setResult({ winner: room.winner_addr, scores: room.scores || [] });
    }
  }, [startTimer]);

  // ── subscribe to match room + events ─────────────────────────────────────
  const subscribeToMatch = useCallback((mid: string) => {
    // Room updates — drive stage for both players
    const roomCh = supabase
      .channel(`room:${mid}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'match_rooms',
        filter: `id=eq.${mid}`,
      }, ({ new: room }: any) => handleRoomUpdate(room))
      .subscribe();

    // Events — opponent's picks/unpicks
    const eventCh = supabase
      .channel(`events:${mid}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'match_events',
        filter: `match_id=eq.${mid}`,
      }, ({ new: row }: any) => {
        if (row.sender === myAddrRef.current) return;
        if (row.type === 'pick_card') {
          setLockedCardIds(prev => new Set([...prev, row.payload.cardId]));
        }
        if (row.type === 'unpick_card') {
          setLockedCardIds(prev => { const n = new Set(prev); n.delete(row.payload.cardId); return n; });
        }
      })
      .subscribe();

    channelsRef.current.push(roomCh, eventCh);
  }, [handleRoomUpdate]);

  // ── escrow deposit ────────────────────────────────────────────────────────
  async function depositEscrow(mid: string, stakeEth: string, isCreator: boolean) {
    const escrowAddr = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
    if (!provider || !escrowAddr) return;
    try {
      const signer   = await provider.getSigner();
      const escrow   = new ethers.Contract(escrowAddr, ESCROW_ABI, signer);
      const midBytes = ethers.id(mid);
      const value    = parseEther(stakeEth);
      const tx = isCreator
        ? await escrow.createMatch(midBytes, { value })
        : await escrow.joinMatch(midBytes, { value });
      await tx.wait();
    } catch (e: any) { console.error('Escrow failed:', e.message); }
  }

  // ── enter match room (shared logic) ──────────────────────────────────────
  const enterRoom = useCallback((mid: string, isP1: boolean, opp: string, s: string) => {
    matchIdRef.current = mid;
    isP1Ref.current    = isP1;
    setMatchId(mid);
    setOpponentAddr(opp);
    setStake(s);
    setIsConnecting(false);
    setQueuePosition(null);
    subscribeToMatch(mid);
  }, [subscribeToMatch]);

  // ── QUEUE ─────────────────────────────────────────────────────────────────
  const queuePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopQueuePoll = useCallback(() => {
    if (queuePollRef.current) { clearInterval(queuePollRef.current); queuePollRef.current = null; }
  }, []);

  const handleJoinQueue = useCallback(async (s: string) => {
    setStake(s);
    setIsConnecting(true);
    const addr = myAddrRef.current;

    // Clean stale entry, insert fresh
    await supabase.from('match_queue').delete().eq('addr', addr);
    await supabase.from('match_queue').insert({ addr, stake: s });

    setIsConnecting(false);
    setQueuePosition(1);
    setStatusMsg('Searching for opponent…');
    console.log('[Queue] Joined queue as', addr, 'stake', s);

    queuePollRef.current = setInterval(async () => {
      const myAddr = myAddrRef.current;

      // 1. Check if someone already created a room for us
      const { data: rooms } = await supabase
        .from('match_rooms')
        .select('*')
        .or(`player1_addr.eq.${myAddr},player2_addr.eq.${myAddr}`)
        .gte('stage', 1)
        .limit(1);

      if (rooms && rooms.length > 0) {
        const room = rooms[0];
        console.log('[Queue] Found existing room', room.id);
        stopQueuePoll();
        const isP1 = room.player1_addr === myAddr;
        enterRoom(room.id, isP1, isP1 ? room.player2_addr : room.player1_addr, room.stake);
        setStatusMsg('Opponent found! Draft starting…');
        return;
      }

      // 2. Look for an opponent waiting in queue
      const { data: waiting } = await supabase
        .from('match_queue')
        .select('*')
        .eq('stake', s)
        .neq('addr', myAddr)
        .order('created_at', { ascending: true })
        .limit(1);

      console.log('[Queue] Polling — waiting opponents:', waiting?.length ?? 0);
      if (!waiting || waiting.length === 0) return;

      const opponent = waiting[0];
      console.log('[Queue] Found opponent', opponent.addr, '— creating room');

      // Create room first (if it fails, opponent beat us to it — next poll will find the room)
      const mid = crypto.randomUUID();
      const { error: insertErr } = await supabase.from('match_rooms').insert({
        id: mid, stake: s, stage: 1,
        player1_addr: myAddr,
        player2_addr: opponent.addr,
        stage_started_at: new Date().toISOString(),
      });

      if (insertErr) {
        console.log('[Queue] Room insert failed (race) — will retry', insertErr.message);
        return;
      }

      // Room created — clean up both queue entries
      await supabase.from('match_queue').delete().in('addr', [myAddr, opponent.addr]);
      stopQueuePoll();

      isP1Ref.current = true;
      enterRoom(mid, true, opponent.addr, s);
      setStatusMsg('Opponent found! Draft starting…');
    }, 2000);
  }, [enterRoom, stopQueuePoll]);

  const handleLeaveQueue = useCallback(async () => {
    stopQueuePoll();
    await supabase.from('match_queue').delete().eq('addr', myAddrRef.current);
    setQueuePosition(null);
    setIsConnecting(false);
    setStatusMsg('');
  }, [stopQueuePoll]);

  // ── CUSTOM ROOM ───────────────────────────────────────────────────────────
  const handleCreateRoom = useCallback(async (code: string, s: string) => {
    setIsConnecting(true);
    const mid  = `room_${code}`;
    const addr = myAddrRef.current;

    // Check not already exists
    const { data: existing } = await supabase.from('match_rooms').select('id').eq('id', mid).single();
    if (existing) { alert('Room code already in use — try a different one'); setIsConnecting(false); return; }

    await depositEscrow(mid, s, true);
    await supabase.from('match_rooms').insert({ id: mid, stake: s, stage: 0, player1_addr: addr });

    isP1Ref.current = true;
    matchIdRef.current = mid;
    setMatchId(mid);
    setStake(s);
    setIsConnecting(false);
    setStatusMsg('Room created — share the code with your opponent');
    subscribeToMatch(mid);
    // Stage will advance when opponent joins and handleRoomUpdate fires
  }, [subscribeToMatch]);

  const handleJoinRoom = useCallback(async (code: string) => {
    setIsConnecting(true);
    const mid  = code.startsWith('room_') ? code : `room_${code}`;
    const addr = myAddrRef.current;

    const { data: room } = await supabase.from('match_rooms').select('*').eq('id', mid).single();
    if (!room)             { alert('Room not found');  setIsConnecting(false); return; }
    if (room.player2_addr) { alert('Room is full');    setIsConnecting(false); return; }

    await depositEscrow(mid, room.stake, false);

    // Set player2 and advance to draft in one update so p1 gets one event
    await supabase.from('match_rooms')
      .update({ player2_addr: addr, stage: 1, stage_started_at: new Date().toISOString() })
      .eq('id', mid);

    isP1Ref.current = false;
    enterRoom(mid, false, room.player1_addr, room.stake);
    setStatusMsg('Joined! Draft starting…');
    // p1 will receive the UPDATE and advance their stage via handleRoomUpdate
  }, [enterRoom]);

  // ── DRAFT ─────────────────────────────────────────────────────────────────
  const handlePickCard = useCallback(async (cardId: string) => {
    const card = CARD_POOL.find(c => c.id === cardId);
    if (!card) return;

    const squad  = mySquadRef.current;
    const points = myPointsRef.current;
    if (points < card.cost || squad.length >= 5 || lockedCardIds.has(cardId)) return;

    const newSquad  = [...squad, card];
    const newPoints = points - card.cost;

    // Optimistic update
    setMySquad(newSquad);
    setMyPoints(newPoints);
    setLockedCardIds(prev => new Set([...prev, cardId]));

    const mid = matchIdRef.current;
    const squadField    = isP1Ref.current ? 'player1_squad'  : 'player2_squad';
    const pointsField   = isP1Ref.current ? 'player1_points' : 'player2_points';

    await supabase.from('match_rooms')
      .update({ [squadField]: newSquad, [pointsField]: newPoints })
      .eq('id', mid);

    // Broadcast to opponent
    await supabase.from('match_events').insert({
      match_id: mid, type: 'pick_card',
      payload: { cardId }, sender: myAddrRef.current,
    });

    // p1 checks if both squads are full and advances
    if (newSquad.length === 5 && isP1Ref.current) {
      const { data: updated } = await supabase.from('match_rooms').select('player1_squad, player2_squad').eq('id', mid).single();
      if (updated?.player1_squad?.length === 5 && updated?.player2_squad?.length === 5) {
        await supabase.from('match_rooms')
          .update({ stage: 2, stage_started_at: new Date().toISOString() })
          .eq('id', mid).eq('stage', 1);
      }
    }
  }, [lockedCardIds]);

  const handleUnpickCard = useCallback(async (cardId: string) => {
    const squad = mySquadRef.current;
    const card  = squad.find(c => c.id === cardId);
    if (!card) return;

    const newSquad  = squad.filter(c => c.id !== cardId);
    const newPoints = myPointsRef.current + card.cost;

    setMySquad(newSquad);
    setMyPoints(newPoints);
    setLockedCardIds(prev => { const n = new Set(prev); n.delete(cardId); return n; });

    const mid = matchIdRef.current;
    const squadField  = isP1Ref.current ? 'player1_squad'  : 'player2_squad';
    const pointsField = isP1Ref.current ? 'player1_points' : 'player2_points';

    await supabase.from('match_rooms')
      .update({ [squadField]: newSquad, [pointsField]: newPoints })
      .eq('id', mid);

    await supabase.from('match_events').insert({
      match_id: mid, type: 'unpick_card',
      payload: { cardId }, sender: myAddrRef.current,
    });
  }, []);

  // ── PLACEMENT ─────────────────────────────────────────────────────────────
  const handleSubmitFormation = useCallback(async (formation: Formation) => {
    setFormationSubmitted(true);
    const mid = matchIdRef.current;
    const formField  = isP1Ref.current ? 'player1_formation' : 'player2_formation';
    const readyField = isP1Ref.current ? 'player1_ready'     : 'player2_ready';

    await supabase.from('match_rooms')
      .update({ [formField]: formation, [readyField]: true })
      .eq('id', mid);

    // p1 checks if both ready
    if (isP1Ref.current) {
      const { data: updated } = await supabase.from('match_rooms')
        .select('player1_ready, player2_ready').eq('id', mid).single();
      if (updated?.player1_ready && updated?.player2_ready) {
        await supabase.from('match_rooms')
          .update({ stage: 3, stage_started_at: new Date().toISOString(), player1_ready: false, player2_ready: false })
          .eq('id', mid).eq('stage', 2);
      }
    }
  }, []);

  // ── MATCH END ─────────────────────────────────────────────────────────────
  const handleMatchEnd = useCallback(async () => {
    if (!isP1Ref.current) return; // only p1 resolves
    const mid = matchIdRef.current;
    const { data: room } = await supabase.from('match_rooms').select('*').eq('id', mid).single();
    if (!room || room.stage === 4) return;

    const res = resolveWinner(
      room.player1_addr, room.player1_squad || [],
      room.player2_addr, room.player2_squad || [],
    );
    await supabase.from('match_rooms')
      .update({ stage: 4, winner_addr: res.winner, scores: res.scores })
      .eq('id', mid).eq('stage', 3);

    // p2 will get this via handleRoomUpdate
    setResult(res);
    setStage(4);
  }, []);

  // ── PLAY AGAIN ────────────────────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    stopQueuePoll();
    cleanup();
    setStage(0); setMatchId(''); setOpponentAddr('');
    setMySquad([]); setMyPoints(10); setLockedCardIds(new Set());
    setFormationSubmitted(false); setResult(null); setMatchSquads(null);
    setQueuePosition(null); setStatusMsg('');
    matchIdRef.current = ''; stageRef.current = 0;
    mySquadRef.current = []; myPointsRef.current = 10; isP1Ref.current = false;
  }, [cleanup]);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      {statusMsg && (
        <div style={{
          textAlign: 'center', padding: '10px 20px',
          fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '2px',
          color: '#000', background: 'var(--fifa-gold-light)',
          borderBottom: '4px solid #000',
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
          cardPool={CARD_POOL}
          mySquad={mySquad}
          myPoints={myPoints}
          lockedCardIds={lockedCardIds}
          timer={timer}
          opponentAddress={opponentAddr}
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
          squad={[...matchSquads.red, ...matchSquads.blue]}
          onBackToDashboard={handleMatchEnd}
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
