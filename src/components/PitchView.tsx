'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Player, Ball, MatchState, MangaEvent, PersonaTrait } from '../types/game';
import { runMatchTick, resetToKickoff } from '../utils/matchEngine';
import { FIELD_WIDTH, FIELD_HEIGHT, PITCH_MARGIN, GOAL_Y_TOP, GOAL_Y_BOTTOM } from '../utils/physics';
import { updatePlayerStatsOnChain } from '../utils/web3';
import MangaOverlay from './MangaOverlay';

interface PitchViewProps {
  squad: Player[];
  myAddress?: string;
  opponentAddress?: string;
  onBackToDashboard: () => void;
  isHost?: boolean;
  matchId?: string;
  socket?: Socket | null;
}

export default function PitchView({ squad, myAddress, opponentAddress, onBackToDashboard, isHost = false, matchId, socket }: PitchViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mangaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMangaEventTimeRef = useRef<number>(0);

  // Simulation State
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [matchLog, setMatchLog] = useState<string[]>([]);
  const [mangaEvent, setMangaEvent] = useState<MangaEvent | null>(null);
  const [generatedDialogue, setGeneratedDialogue] = useState<string>('');
  const [isDialogueLoading, setIsDialogueLoading] = useState<boolean>(false);

  const initializedRef = useRef(false);
  const hostEmitIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const SLOT_ROLES = ['GK', 'LB', 'RB', 'CDM', 'ST'];

  // Initialize match state once — use the actual drafted players from both sides
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // squad already has side:'red' (my players) and side:'blue' (opponent's players)
    const redTeam = squad
      .filter(p => p.side === 'red')
      .map(p => ({ ...p, x: 0, y: 0, vx: 0, vy: 0 }));

    const blueTeam = squad
      .filter(p => p.side === 'blue')
      .map(p => ({ ...p, x: 0, y: 0, vx: 0, vy: 0 }));

    const initialBall: Ball = {
      x: FIELD_WIDTH / 2,
      y: FIELD_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: 7,
      controlledById: null,
      lastPossessedById: null
    };

    const initialPlayersList = [...redTeam, ...blueTeam];

    const initialState: MatchState = {
      scoreRed: 0,
      scoreBlue: 0,
      timeRemaining: 180, // 3 minutes
      isPlaying: false,
      isMangaPaused: false,
      currentMangaEvent: null,
      players: initialPlayersList,
      ball: initialBall
    };

    resetToKickoff(initialState.players, initialState.ball);
    setMatchState(initialState);
    setMatchLog(["Match ready. Kickoff in 3…"]);
    setCountdown(3);
  }, [squad]);

  // 3-2-1 auto-start countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setMatchState(prev => prev ? { ...prev, isPlaying: true } : null);
      setCountdown(null);
      return;
    }
    const t = setTimeout(() => setCountdown(prev => (prev ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Host: broadcast authoritative score/time to server every second
  useEffect(() => {
    if (!isHost || !socket || !matchId || !matchState?.isPlaying) return;
    hostEmitIntervalRef.current = setInterval(() => {
      setMatchState(prev => {
        if (prev) {
          socket.emit('match_state_update', {
            matchId,
            scoreRed: prev.scoreRed,
            scoreBlue: prev.scoreBlue,
            timeRemaining: prev.timeRemaining,
          });
        }
        return prev;
      });
    }, 1000);
    return () => {
      if (hostEmitIntervalRef.current) clearInterval(hostEmitIntervalRef.current);
    };
  }, [isHost, socket, matchId, matchState?.isPlaying]);

  // Non-host: sync score/time from server
  useEffect(() => {
    if (isHost || !socket) return;
    const handler = ({ scoreRed, scoreBlue, timeRemaining }: { scoreRed: number; scoreBlue: number; timeRemaining: number }) => {
      setMatchState(prev => prev ? { ...prev, scoreRed, scoreBlue, timeRemaining } : null);
    };
    socket.on('match_state_sync', handler);
    return () => { socket.off('match_state_sync', handler); };
  }, [isHost, socket]);

  // Main Simulation Loop
  useEffect(() => {
    if (!matchState || !matchState.isPlaying) return;

    let animFrameId: number;

    const tick = () => {
      setMatchState(prevState => {
        if (!prevState) return null;

        // Run ticks according to simulation speed setting (1x, 2x, etc.)
        let tempState = { ...prevState };
        
        tempState = runMatchTick(tempState, handleMangaEventTrigger);

        return tempState;
      });

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [matchState?.isPlaying]);

  useEffect(() => {
    return () => {
      if (mangaTimeoutRef.current) clearTimeout(mangaTimeoutRef.current);
      if (hostEmitIntervalRef.current) clearInterval(hostEmitIntervalRef.current);
    };
  }, []);

  // Handle Event Triggers from the match engine
  const handleMangaEventTrigger = async (event: MangaEvent) => {
    // Log the event
    let logMsg = "";
    if (event.type === 'clutch_shot') {
      logMsg = `[Clutch Shot] Striker ${event.player.name} fires a shot with ${event.goalProbability}% goal probability!`;
    } else if (event.type === 'setup') {
      logMsg = `[Setup] Midfielder ${event.player.name} slides a key pass to ${event.secondaryPlayer?.name}!`;
    } else if (event.type === 'breakdown') {
      logMsg = `[Breakdown] Defender ${event.player.name} fails tackle at low stamina, letting ${event.secondaryPlayer?.name} break through!`;
    }

    setMatchLog(prev => [logMsg, ...prev].slice(0, 30));

    // Cooldown check (2.5 seconds between flashes to prevent visual clutter)
    const now = Date.now();
    if (now - lastMangaEventTimeRef.current < 2500) {
      return;
    }
    lastMangaEventTimeRef.current = now;

    // Clear previous timeout if any
    if (mangaTimeoutRef.current) {
      clearTimeout(mangaTimeoutRef.current);
    }

    setMangaEvent(event);
    setIsDialogueLoading(true);
    setGeneratedDialogue('');

    // Call the Gemini API to get actual LLM-generated dialogue
    try {
      const res = await fetch('/api/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: event.player.name,
          personaTrait: event.player.trait,
          eventType: event.type,
          currentScore: `${matchState?.scoreRed ?? 0}-${matchState?.scoreBlue ?? 0}`,
          matchTime: matchState?.timeRemaining ?? 180
        })
      });
      const data = await res.json();
      setGeneratedDialogue(data.dialogue || "Out of my way!");
    } catch (e) {
      setGeneratedDialogue("This is my moment!");
    } finally {
      setIsDialogueLoading(false);
      
      // Auto-dismiss the dialogue bubble and corner banner after 3.5 seconds
      mangaTimeoutRef.current = setTimeout(() => {
        handleCloseManga();
      }, 3500);
    }
  };

  // Close manga overlay and resume game
  const handleCloseManga = () => {
    setMangaEvent(null);
    setGeneratedDialogue('');
    setMatchState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        isMangaPaused: false,
        currentMangaEvent: null
      };
    });
  };

  // Render Pitch on Canvas
  useEffect(() => {
    if (!matchState) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // 1. Draw Field Boundary Background (Vibrant Grass Green)
    ctx.fillStyle = '#107c41'; // FIFA Grass Green
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Draw checkerboard grass pattern
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 45;
    for (let x = 0; x < FIELD_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < FIELD_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD_WIDTH, y);
      ctx.stroke();
    }

    // Draw field borders (Thick White lines)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(PITCH_MARGIN, PITCH_MARGIN, FIELD_WIDTH - PITCH_MARGIN * 2, FIELD_HEIGHT - PITCH_MARGIN * 2);

    // Center Line
    ctx.beginPath();
    ctx.moveTo(FIELD_WIDTH / 2, PITCH_MARGIN);
    ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT - PITCH_MARGIN);
    ctx.stroke();

    // Center Circle
    ctx.beginPath();
    ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Center Spot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Penalty Boxes
    // Left Box
    ctx.strokeRect(PITCH_MARGIN, FIELD_HEIGHT / 2 - 100, 110, 200);
    // Right Box
    ctx.strokeRect(FIELD_WIDTH - PITCH_MARGIN - 110, FIELD_HEIGHT / 2 - 100, 110, 200);

    // Goals (Draw heavy black/white brutalist gates)
    ctx.lineWidth = 5;
    // Left Goal
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(PITCH_MARGIN - 15, GOAL_Y_TOP, 15, GOAL_Y_BOTTOM - GOAL_Y_TOP);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(PITCH_MARGIN - 15, GOAL_Y_TOP, 1, GOAL_Y_BOTTOM - GOAL_Y_TOP);
    // Right Goal
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(FIELD_WIDTH - PITCH_MARGIN, GOAL_Y_TOP, 15, GOAL_Y_BOTTOM - GOAL_Y_TOP);

    // 2. Draw Players
    const redPlayers  = matchState.players.filter(p => p.side === 'red');
    const bluePlayers = matchState.players.filter(p => p.side === 'blue');

    matchState.players.forEach(player => {
      const isRed      = player.side === 'red';
      const teamList   = isRed ? redPlayers : bluePlayers;
      const teamIdx    = teamList.indexOf(player);
      const role       = SLOT_ROLES[teamIdx] ?? '?';
      const circleColor = isRed ? '#E8001D' : '#0033A0';
      const shadowColor = isRed ? '#8B0000' : '#001A5E';

      // Drop shadow
      ctx.fillStyle = shadowColor;
      ctx.beginPath();
      ctx.arc(player.x + 2, player.y + 2, 18, 0, Math.PI * 2);
      ctx.fill();

      // Main circle
      ctx.fillStyle = circleColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ball possession indicator
      if (player.hasBall) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Player name (first word, up to 4 chars)
      const shortName = player.name.split(' ')[0].substring(0, 4).toUpperCase();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(shortName, player.x, player.y - 3);

      // Role label
      ctx.font = 'bold 8px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(role, player.x, player.y + 7);

      // Name tag below circle
      ctx.fillStyle = isRed ? '#E8001D' : '#0033A0';
      ctx.fillRect(player.x - 20, player.y + 22, 40, 13);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(player.x - 20, player.y + 22, 40, 13);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px Arial, sans-serif';
      ctx.fillText(player.name.split(' ').map((w: string) => w[0]).join('').substring(0, 4), player.x, player.y + 29);

      // Stamina bar
      const barW = 36;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(player.x - barW / 2, player.y + 38, barW, 4);
      const staminaColor = player.currentStamina < 25 ? '#ff3b30' : player.currentStamina < 60 ? '#ffaa00' : '#34c759';
      ctx.fillStyle = staminaColor;
      ctx.fillRect(player.x - barW / 2, player.y + 38, (player.currentStamina / 100) * barW, 4);
    });

    // 3. Draw Ball
    const ball = matchState.ball;
    
    // Draw ball with black outline
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Small black panels on ball (visual detailing)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

  }, [matchState]);

  // Read trait custom colors
  const getTraitColor = (trait: string) => {
    switch (trait) {
      case 'Arrogant': return 'var(--color-arrogant)';
      case 'Calculative': return 'var(--neon-cyan)';
      case 'Panic-Prone': return 'var(--color-panic)';
      case 'Maverick': return 'var(--color-maverick)';
      case 'Team-First': return 'var(--color-team)';
      default: return '#ffffff';
    }
  };

  // Format Clock display
  const formatTime = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isGameOver = matchState ? matchState.timeRemaining <= 0 : false;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
      
      {/* Scoreboard Panel */}
      {matchState && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center', gap: '0',
          border: '4px solid #000', boxShadow: '6px 6px 0 #000', marginBottom: '20px',
        }}>
          {/* Red Team — YOU */}
          <div style={{
            background: '#E8001D', padding: '14px 20px',
            borderRight: '4px solid #000', display: 'flex', flexDirection: 'column', gap: '2px',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.7)' }}>
              YOU ▸ RED TEAM
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: '#fff', letterSpacing: '1px' }}>
              {myAddress ? `${myAddress.slice(0, 6)}…${myAddress.slice(-4)}` : 'Player 1'}
            </div>
          </div>

          {/* Score + Clock */}
          <div style={{ background: '#fff', padding: '10px 28px', textAlign: 'center', borderRight: '4px solid #000' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '48px', letterSpacing: '6px', lineHeight: 1,
              display: 'flex', alignItems: 'center', gap: '10px', color: '#000',
            }}>
              <span style={{ color: '#E8001D' }}>{matchState.scoreRed}</span>
              <span style={{ fontSize: '28px' }}>–</span>
              <span style={{ color: '#0033A0' }}>{matchState.scoreBlue}</span>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px',
              color: isGameOver ? '#E8001D' : '#00a651', marginTop: '4px',
            }}>
              {isGameOver ? '● MATCH END' : `⏱ ${formatTime(matchState.timeRemaining)}`}
            </div>
          </div>

          {/* Blue Team — OPPONENT */}
          <div style={{
            background: '#0033A0', padding: '14px 20px',
            display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.7)' }}>
              OPPONENT ▸ BLUE TEAM
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: '#fff', letterSpacing: '1px' }}>
              {opponentAddress ? `${opponentAddress.slice(0, 6)}…${opponentAddress.slice(-4)}` : 'Player 2'}
            </div>
          </div>
        </div>
      )}

      {/* Simulator canvas and shake wrapper */}
      <div 
        className={mangaEvent?.type === 'clutch_shot' ? 'screen-shake' : ''}
        style={{ 
          position: 'relative', 
          borderRadius: '16px', 
          overflow: 'hidden', 
          border: '3px solid #1f253d',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          backgroundColor: '#06080e',
          aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}`
        }}
      >
        <canvas 
          ref={canvasRef} 
          width={FIELD_WIDTH} 
          height={FIELD_HEIGHT} 
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* In-Game Floating Speech Bubble */}
        {mangaEvent && (() => {
          const activePlayer = matchState?.players.find(p => p.id === mangaEvent.player.id);
          if (!activePlayer) return null;

          const traitColor = getTraitColor(activePlayer.trait);

          return (
            <div 
              style={{
                position: 'absolute',
                left: `${(activePlayer.x / FIELD_WIDTH) * 100}%`,
                top: `${(activePlayer.y / FIELD_HEIGHT) * 100}%`,
                transform: 'translate(-50%, calc(-100% - 25px))',
                zIndex: 90,
                pointerEvents: 'none',
                transition: 'left 0.08s linear, top 0.08s linear'
              }}
            >
              <div 
                className="ingame-speech-bubble"
                style={{ 
                  boxShadow: `4px 4px 0px ${traitColor}`,
                  border: `3px solid #000000`
                }}
              >
                {isDialogueLoading ? (
                  <span style={{ fontSize: '11px', color: '#555', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                    THINKING...
                  </span>
                ) : (
                  <span>&ldquo;{generatedDialogue}&rdquo;</span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Manga breakout overlay injection */}
        {mangaEvent && (
          <MangaOverlay
            event={mangaEvent}
            dialogue={generatedDialogue}
            isLoading={isDialogueLoading}
            onClose={handleCloseManga}
          />
        )}

        {/* 3-2-1 Countdown overlay */}
        {countdown !== null && countdown > 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 100,
          }}>
            <div style={{
              fontFamily: 'var(--font-manga)',
              fontSize: '160px',
              color: '#fff',
              lineHeight: 1,
              textShadow: '6px 6px 0 #000, -2px -2px 0 #000',
              animation: 'countdownPop 0.9s ease-out',
            }}>
              {countdown}
            </div>
            <div style={{
              fontFamily: 'var(--font-manga)',
              fontSize: '20px',
              letterSpacing: '6px',
              color: 'var(--fifa-gold-light)',
              textShadow: '2px 2px 0 #000',
              marginTop: '12px',
            }}>
              GET READY
            </div>
          </div>
        )}
      </div>

      {/* Live Commentary logs */}
      <div className="glass-panel" style={{ marginTop: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000', borderBottom: '3px solid #000000', paddingBottom: '8px', marginBottom: '10px' }}>
          LIVE COMMENTARY & MANGA FEEDS
        </h4>
        <div style={{ 
          height: '140px', 
          overflowY: 'auto', 
          fontFamily: 'monospace', 
          fontSize: '12px', 
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          color: '#000000',
          fontWeight: 'bold'
        }}>
          {matchLog.map((log, index) => (
            <div key={index} style={{ borderLeft: '3px solid #000000', paddingLeft: '8px' }}>
              {log}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

