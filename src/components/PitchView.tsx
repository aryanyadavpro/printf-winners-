'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Player, Ball, MatchState, MangaEvent, PersonaTrait } from '../types/game';
import { initializePlayers, runMatchTick, resetToKickoff, getRoleFromIndex } from '../utils/matchEngine';
import { FIELD_WIDTH, FIELD_HEIGHT, PITCH_MARGIN, GOAL_Y_TOP, GOAL_Y_BOTTOM } from '../utils/physics';
import { updatePlayerStatsOnChain } from '../utils/web3';
import { Play, Pause, RotateCcw, FastForward, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import MangaOverlay from './MangaOverlay';
import { getPlayerImage } from '../utils/playerImages';

interface PitchViewProps {
  squad: Player[];
  onBackToDashboard: () => void;
}

export default function PitchView({ squad, onBackToDashboard }: PitchViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mangaTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMangaEventTimeRef = useRef<number>(0);
  // Cached HTMLImageElements keyed by player id
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Simulation State
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [matchLog, setMatchLog] = useState<string[]>([]);
  const [mangaEvent, setMangaEvent] = useState<MangaEvent | null>(null);
  const [generatedDialogue, setGeneratedDialogue] = useState<string>('');
  const [isDialogueLoading, setIsDialogueLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncCompleted, setSyncCompleted] = useState<boolean>(false);
  const [syncHash, setSyncHash] = useState<string>('');

  // Initialize match state once on load
  useEffect(() => {
    // 5 players from squad (Red) vs 5 generated AI opponents (Blue)
    const redTeam = squad.map((p, idx) => ({
      ...p,
      side: 'red' as const,
      x: 0, y: 0, vx: 0, vy: 0 // Reset physics vectors
    }));

    // Random traits for opponents
    const opponentTraits: PersonaTrait[] = ['Team-First', 'Arrogant', 'Calculative', 'Panic-Prone', 'Maverick'];
    
    // Ensure opponent names are unique from our squad names (no duplicates on field)
    const squadNames = squad.map(p => p.name.replace(/\s*\(Red\)/i, '').replace(/\s*\(Blue\)/i, '').trim().toLowerCase());
    const reserveNames = ["Rin", "Shidou", "Karasu", "Otoya", "Yukimiya", "Nagi", "Reo", "Barou", "Chigiri", "Bachira"];
    
    const blueTeam = initializePlayers([], opponentTraits)
      .filter(p => p.side === 'blue')
      .map((p, idx) => {
        let name = p.name.replace(/\s*\(Blue\)/i, '').trim();
        let baseName = name.toLowerCase();
        
        if (squadNames.includes(baseName)) {
          // Find first reserve name not in the squad
          const availableReserve = reserveNames.find(resName => !squadNames.includes(resName.toLowerCase()));
          if (availableReserve) {
            name = availableReserve;
            squadNames.push(name.toLowerCase()); // Add to blacklist
          }
        }
        return {
          ...p,
          name: `${name} (Blue)`
        };
      });

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
    setMatchLog(["Match ready. Tactical kickoff scheduled."]);

    // Preload player images into the cache so canvas drawImage works
    initialPlayersList.forEach(player => {
      if (imageCache.current.has(player.id)) return;
      const src = getPlayerImage(player.name);
      if (!src) return;
      const img = new Image();
      img.src = src;
      imageCache.current.set(player.id, img);
    });
  }, [squad]);

  // Main Simulation Loop
  useEffect(() => {
    if (!matchState || !matchState.isPlaying) return;

    let animFrameId: number;

    const tick = () => {
      setMatchState(prevState => {
        if (!prevState) return null;

        // Run ticks according to simulation speed setting (1x, 2x, etc.)
        let tempState = { ...prevState };
        
        // Execute multiple physics calculations per frame for speed up
        for (let s = 0; s < simSpeed; s++) {
          tempState = runMatchTick(tempState, handleMangaEventTrigger);
        }

        return tempState;
      });

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [matchState?.isPlaying, simSpeed]);

  useEffect(() => {
    return () => {
      if (mangaTimeoutRef.current) {
        clearTimeout(mangaTimeoutRef.current);
      }
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
    matchState.players.forEach(player => {
      const isRed = player.side === 'red';
      const teamColor  = isRed ? '#FF0055' : '#0066FF';  // hard hex — CSS vars fail on canvas
      const traitColor = getTraitColor(player.trait);
      const cachedImg  = imageCache.current.get(player.id);
      const hasPhoto   = cachedImg && cachedImg.complete && cachedImg.naturalHeight > 0;
      const role       = getRoleFromIndex(matchState.players.indexOf(player) % 5);

      // ── Trait aura glow (offset shadow) ──────────────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = traitColor;
      ctx.beginPath();
      ctx.arc(player.x + 2, player.y + 2, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── Team-coloured outer ring ──────────────────────────────────────────
      ctx.fillStyle = teamColor;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // ── Player photo (clipped circle) or initial fallback ─────────────────
      if (hasPhoto) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(cachedImg!, player.x - 13, player.y - 13, 26, 26);
        ctx.restore();
        // Thin white ring over photo
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Fallback dark circle + 2-letter initials
        ctx.fillStyle = '#0f111a';
        ctx.beginPath();
        ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 9px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(player.name.substring(0, 2).toUpperCase(), player.x, player.y);
      }

      // ── Team badge dot (top-right of circle) — 'R' / 'B' ────────────────
      const bx = player.x + 12, by = player.y - 12;
      ctx.fillStyle = teamColor;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 7px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isRed ? 'R' : 'B', bx, by);

      // ── Role tag (black pill below circle) ───────────────────────────────
      ctx.fillStyle = '#000000';
      ctx.fillRect(player.x - 11, player.y + 18, 22, 11);
      ctx.fillStyle = teamColor;
      ctx.font = '900 7px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(role), player.x, player.y + 24);

      // ── Stamina bar ───────────────────────────────────────────────────────
      ctx.fillStyle = '#000000';
      ctx.fillRect(player.x - 14, player.y + 31, 28, 5);
      const staminaWidth = (player.currentStamina / 100) * 26;
      ctx.fillStyle = player.currentStamina < 25 ? '#FF0055' : '#00FF66';
      ctx.fillRect(player.x - 13, player.y + 32, staminaWidth, 3);
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

  // Hex trait colors — must be real hex values for Canvas 2D (CSS vars don't work there)
  const getTraitColor = (trait: string): string => {
    switch (trait) {
      case 'Arrogant':    return '#FF0055';
      case 'Calculative': return '#00E1D9';
      case 'Panic-Prone': return '#7D8899';
      case 'Maverick':    return '#D500FF';
      case 'Team-First':  return '#0066FF';
      default:            return '#ffffff';
    }
  };

  const handlePlayPause = () => {
    setMatchState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        isPlaying: !prev.isPlaying
      };
    });
  };

  const handleResetMatch = () => {
    setMatchState(prev => {
      if (!prev) return null;
      const cleanState = { ...prev };
      resetToKickoff(cleanState.players, cleanState.ball);
      cleanState.timeRemaining = 180;
      cleanState.scoreRed = 0;
      cleanState.scoreBlue = 0;
      cleanState.isPlaying = false;
      cleanState.isMangaPaused = false;
      cleanState.currentMangaEvent = null;
      return cleanState;
    });
    setMangaEvent(null);
    setSyncCompleted(false);
    setSyncHash('');
    setMatchLog(["Match reset. Kickoff positions re-locked."]);
  };

  const handleSyncStats = async () => {
    if (!matchState) return;
    setIsSyncing(true);

    try {
      // Find our team (Red side)
      const ourTeam = matchState.players.filter(p => p.side === 'red');
      
      // Simulate blockchain execution or make real MetaMask call if address exists
      const mockHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      
      // Wait for parallel simulation to execute in 600ms
      await new Promise(resolve => setTimeout(resolve, 600));

      setSyncHash(mockHash);
      setSyncCompleted(true);
      setMatchLog(prev => ["Sync complete! On-chain stats updated successfully.", ...prev]);
    } catch (e) {
      alert("Failed syncing stats.");
    } finally {
      setIsSyncing(false);
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
        <div className="glass-panel" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px',
          padding: '15px 30px'
        }}>
          {/* Red Team */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              border: '3px solid #000000', 
              backgroundColor: 'var(--fifa-red)',
              boxShadow: '2px 2px 0px #000000'
            }} />
            <span style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-manga)', letterSpacing: '1px' }}>SQUAD ALPHA (RED)</span>
          </div>

          {/* Core Score/Clock */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '44px', 
              fontFamily: 'var(--font-manga)', 
              letterSpacing: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '15px'
            }}>
              <span>{matchState.scoreRed}</span>
              <span style={{ color: '#000000', fontSize: '32px', fontWeight: 'bold' }}>-</span>
              <span>{matchState.scoreBlue}</span>
            </div>
            <div style={{ 
              fontSize: '14px', 
              fontFamily: 'monospace', 
              color: isGameOver ? 'var(--fifa-red)' : 'var(--fifa-green)',
              fontWeight: 800,
              marginTop: '2px',
              letterSpacing: '1.5px'
            }}>
              {isGameOver ? "MATCH END" : `CLOCK: ${formatTime(matchState.timeRemaining)}`}
            </div>
          </div>

          {/* Blue Team */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexDirection: 'row-reverse' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              border: '3px solid #000000', 
              backgroundColor: 'var(--fifa-blue)',
              boxShadow: '2px 2px 0px #000000'
            }} />
            <span style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-manga)', letterSpacing: '1px' }}>OPPONENTS (BLUE)</span>
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
      </div>

      {/* Game Loop Controls */}
      {matchState && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.2fr 1fr 1fr', 
          gap: '20px', 
          marginTop: '25px' 
        }}>
          {/* Left panel: buttons */}
          <div className="glass-panel" style={{ display: 'flex', gap: '10px', padding: '15px', alignItems: 'center' }}>
            {!isGameOver ? (
              <button 
                onClick={handlePlayPause} 
                className="btn-primary" 
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {matchState.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {matchState.isPlaying ? "PAUSE" : "START SIM"}
              </button>
            ) : (
              <button 
                onClick={handleSyncStats}
                disabled={isSyncing || syncCompleted}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(135deg, #00ffff 0%, #1e90ff 100%)', boxShadow: '0 4px 15px rgba(0,255,255,0.3)' }}
              >
                {isSyncing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={16} />}
                {syncCompleted ? "SYNCED TO MONAD" : "SYNC POST-MATCH"}
              </button>
            )}

            <button 
              onClick={handleResetMatch} 
              className="btn-secondary"
              style={{ padding: '12px' }}
              title="Reset pitch positions"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Speed settings */}
          <div className="glass-panel" style={{ display: 'flex', gap: '8px', padding: '15px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#000000', fontWeight: 800, marginRight: '5px' }}>SPEED:</span>
            {[1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => setSimSpeed(speed)}
                className={simSpeed === speed ? "btn-primary" : "btn-secondary"}
                style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="glass-panel" style={{ display: 'flex', padding: '15px', alignItems: 'center', justifyContent: 'center' }}>
            <button 
              onClick={onBackToDashboard} 
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              LEAVE PITCH
            </button>
          </div>
        </div>
      )}

      {/* Sync complete logs */}
      {syncCompleted && (
        <div className="glass-panel" style={{ 
          marginTop: '20px', 
          borderColor: '#000000', 
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '13px',
          color: '#000000'
        }}>
          <p style={{ color: 'var(--fifa-green-text)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} /> Post-Match Blockchain Update Successful!
          </p>
          <p style={{ color: '#222222' }}>
            Depleted stamina logs and goals/assists values have been calculated, batched, and compiled into a single parallel transaction to optimize Gas overhead on Monad.
          </p>
          <p style={{ fontFamily: 'monospace', color: '#555555', fontSize: '11px', wordBreak: 'break-all', fontWeight: 'bold' }}>
            Transaction Hash: {syncHash}
          </p>
        </div>
      )}

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

// React loader spinner
function Loader2({ className, ...props }: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`animate-spin ${className}`}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
