'use client';

import React, { useState, useCallback } from 'react';
import { Swords, Users, Link, Loader2, Wallet, Copy, Check, RefreshCw, X } from 'lucide-react';

// Random 6-char code — no ambiguous chars (0/O, 1/I/L)
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

interface MatchLobbyProps {
  walletAddress: string;
  onJoinQueue: (stake: string) => void;
  onCreateRoom: (roomCode: string, stake: string) => void;
  onJoinRoom: (roomCode: string, stake: string) => void;
  onCancelRoom: () => void;
  isConnecting: boolean;
  queuePosition: number | null;
  onLeaveQueue: () => void;
  createdRoomCode: string;      // set by MatchView after room_created event
  opponentJoined: boolean;      // true once opponent_joined fires
}

const STAKE_OPTIONS = ['0.1', '0.5', '1', '5'];

export default function MatchLobby({
  walletAddress,
  onJoinQueue,
  onCreateRoom,
  onJoinRoom,
  onCancelRoom,
  isConnecting,
  queuePosition,
  onLeaveQueue,
  createdRoomCode,
  opponentJoined,
}: MatchLobbyProps) {
  const [selectedStake, setSelectedStake] = useState('0.5');
  const [mode, setMode] = useState<'queue' | 'room'>('queue');
  const [myCode, setMyCode] = useState(generateCode);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const refreshCode = useCallback(() => setMyCode(generateCode()), []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(createdRoomCode || myCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [createdRoomCode, myCode]);

  // ── WAITING FOR OPPONENT (room created, not yet joined) ────────────────────
  if (createdRoomCode && !opponentJoined) {
    return (
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ border: '4px solid #000', boxShadow: '6px 6px 0 #000' }}>
          {/* Header */}
          <div style={{ background: 'var(--fifa-blue)', borderBottom: '4px solid #000', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '3px', color: 'rgba(255,255,255,0.6)' }}>CUSTOM ROOM</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '2px', color: '#fff', lineHeight: 1 }}>ROOM CREATED</div>
            </div>
            <Loader2 size={28} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
          </div>

          <div style={{ background: '#fff', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: '#555', letterSpacing: '1.5px', textAlign: 'center' }}>
              SHARE THIS CODE WITH YOUR OPPONENT
            </p>

            {/* Big code display */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: '#07090f', border: '3px solid #000', boxShadow: '4px 4px 0 #000',
              padding: '16px 20px', borderRadius: '4px',
            }}>
              <div style={{
                flex: 1, fontFamily: 'monospace', fontSize: '36px', fontWeight: 900,
                color: 'var(--neon-cyan)', letterSpacing: '10px', textAlign: 'center',
              }}>
                {createdRoomCode}
              </div>
              <button
                onClick={copyCode}
                title="Copy code"
                style={{
                  background: copied ? '#00a651' : 'var(--fifa-blue)',
                  border: '2px solid #fff', padding: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                {copied ? <Check size={18} color="#fff" /> : <Copy size={18} color="#fff" />}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Loader2 size={16} color="#555" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: '#555', letterSpacing: '1px' }}>
                WAITING FOR OPPONENT TO JOIN…
              </p>
            </div>

            <div style={{ background: 'rgba(0,255,200,0.06)', border: '2px solid rgba(0,255,200,0.2)', borderRadius: '6px', padding: '12px 16px' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: '#8b949e', letterSpacing: '0.5px', lineHeight: 1.6 }}>
                Entry stake: <strong style={{ color: 'var(--neon-cyan)' }}>{selectedStake} MON</strong>
                &nbsp;·&nbsp; Prize pool: <strong style={{ color: '#fff' }}>{(parseFloat(selectedStake) * 2).toFixed(1)} MON</strong>
              </p>
            </div>

            <button
              onClick={onCancelRoom}
              style={{
                background: 'transparent', border: '2px solid #ccc', padding: '10px',
                fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '2px',
                color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '6px',
              }}
            >
              <X size={13} /> CANCEL ROOM
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 20px' }}>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{
          fontFamily: 'var(--font-manga)',
          fontSize: '56px',
          letterSpacing: '3px',
          background: 'linear-gradient(135deg, #fff 20%, var(--monad-purple) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          MANGA-MATCH
        </h1>
        <p style={{ color: '#8b949e', fontSize: '14px' }}>
          2-Player · 3-Stage · On-Chain Prize Pool
        </p>
      </div>

      {/* Wallet indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
        marginBottom: '32px',
        color: walletAddress ? 'var(--neon-cyan)' : '#ffaa00',
        fontSize: '13px',
      }}>
        <Wallet size={14} />
        {walletAddress
          ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
          : 'Connect wallet in My Squad tab first'}
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {(['queue', 'room'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '12px',
            borderRadius: '8px',
            border: mode === m ? '1.5px solid var(--monad-purple)' : '1.5px solid rgba(255,255,255,0.08)',
            backgroundColor: mode === m ? 'rgba(138,43,226,0.15)' : 'transparent',
            color: mode === m ? '#fff' : '#8b949e',
            fontSize: '13px', fontWeight: 700, letterSpacing: '1px',
            textTransform: 'uppercase', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            {m === 'queue' ? <Users size={14} /> : <Link size={14} />}
            {m === 'queue' ? 'Random Queue' : 'Custom Room'}
          </button>
        ))}
      </div>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Stake selector */}
        <div>
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '10px' }}>
            Entry Stake (MON) — winner takes both
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {STAKE_OPTIONS.map(s => (
              <button key={s} onClick={() => setSelectedStake(s)} style={{
                flex: 1, padding: '10px',
                borderRadius: '8px',
                border: selectedStake === s ? '1.5px solid var(--neon-cyan)' : '1.5px solid rgba(255,255,255,0.08)',
                backgroundColor: selectedStake === s ? 'rgba(0,255,255,0.08)' : 'transparent',
                color: selectedStake === s ? 'var(--neon-cyan)' : '#8b949e',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}>
                {s}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: '#5d637f', marginTop: '8px' }}>
            Prize pool: <strong style={{ color: '#fff' }}>{(parseFloat(selectedStake) * 2).toFixed(1)} MON</strong>
          </p>
        </div>

        {mode === 'queue' ? (
          queuePosition !== null ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                padding: '24px', backgroundColor: 'rgba(138,43,226,0.08)',
                border: '1px solid rgba(138,43,226,0.2)', borderRadius: '12px',
              }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--monad-purple)' }} />
                <p style={{ fontSize: '16px', fontWeight: 700 }}>Finding Opponent…</p>
                <p style={{ fontSize: '13px', color: '#8b949e' }}>
                  Stake: <strong style={{ color: 'var(--neon-cyan)' }}>{selectedStake} MON</strong>
                </p>
              </div>
              <button onClick={onLeaveQueue} className="btn-secondary" style={{ padding: '10px', fontSize: '13px' }}>
                Leave Queue
              </button>
            </div>
          ) : (
            <button
              onClick={() => onJoinQueue(selectedStake)}
              disabled={!walletAddress || isConnecting}
              className="btn-primary"
              style={{ justifyContent: 'center', padding: '16px', fontSize: '16px', fontFamily: 'var(--font-manga)', letterSpacing: '2px' }}
            >
              {isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Swords size={18} />}
              ENTER QUEUE
            </button>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── CREATE ROOM ── */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '12px' }}>
                Create a private room and share the code with your friend
              </p>

              {/* Code display + refresh */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <div style={{
                  flex: 1, padding: '12px 16px',
                  background: '#07090f', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', fontFamily: 'monospace', fontSize: '22px',
                  fontWeight: 900, color: 'var(--neon-cyan)', letterSpacing: '8px',
                  textAlign: 'center',
                }}>
                  {myCode}
                </div>
                <button
                  onClick={refreshCode}
                  title="Generate new code"
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', padding: '0 14px', cursor: 'pointer',
                    color: '#8b949e', display: 'flex', alignItems: 'center',
                  }}
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              <button
                onClick={() => onCreateRoom(myCode, selectedStake)}
                disabled={!walletAddress || isConnecting}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', letterSpacing: '1px' }}
              >
                {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Link size={14} />}
                CREATE ROOM
              </button>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '11px', color: '#5d637f', letterSpacing: '2px' }}>OR JOIN</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* ── JOIN ROOM ── */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '12px' }}>
                Enter the 6-character code your friend shared
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="E.g. XK7P2M"
                  value={joinCode}
                  maxLength={6}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  style={{
                    flex: 1, padding: '12px 16px',
                    background: '#07090f', border: `1px solid ${joinCode.length === 6 ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '8px', color: '#fff', fontSize: '20px',
                    fontFamily: 'monospace', letterSpacing: '6px', textAlign: 'center',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                />
                <button
                  onClick={() => onJoinRoom(joinCode, selectedStake)}
                  disabled={!walletAddress || joinCode.length !== 6 || isConnecting}
                  className="btn-secondary"
                  style={{ padding: '12px 20px', fontSize: '13px', letterSpacing: '1px', whiteSpace: 'nowrap' }}
                >
                  {isConnecting ? <Loader2 size={14} className="animate-spin" /> : 'JOIN →'}
                </button>
              </div>
              {joinCode.length > 0 && joinCode.length < 6 && (
                <p style={{ fontSize: '11px', color: '#5d637f', marginTop: '6px' }}>
                  {6 - joinCode.length} more character{6 - joinCode.length !== 1 ? 's' : ''} needed
                </p>
              )}
            </div>
          </div>
        )}

        {/* Match flow */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5d637f' }}>
            {['① Draft 60s', '② Place 60s', '③ Match 3min', '④ Payout'].map(s => (
              <span key={s} style={{ textAlign: 'center' }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
