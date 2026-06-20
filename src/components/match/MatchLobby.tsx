'use client';

import React, { useState } from 'react';
import { Swords, Users, Link, Loader2, Wallet } from 'lucide-react';

interface MatchLobbyProps {
  walletAddress: string;
  onJoinQueue: (stake: string) => void;
  onCreateRoom: (roomCode: string, stake: string) => void;
  onJoinRoom: (roomCode: string) => void;
  isConnecting: boolean;
  queuePosition: number | null;
  onLeaveQueue: () => void;
}

const STAKE_OPTIONS = ['0.1', '0.5', '1', '5'];

export default function MatchLobby({
  walletAddress,
  onJoinQueue,
  onCreateRoom,
  onJoinRoom,
  isConnecting,
  queuePosition,
  onLeaveQueue,
}: MatchLobbyProps) {
  const [selectedStake, setSelectedStake] = useState('0.5');
  const [mode, setMode] = useState<'queue' | 'room'>('queue');
  const [roomCode, setRoomCode] = useState('');
  const [customRoom, setCustomRoom] = useState('');

  const generatedCode = walletAddress ? walletAddress.slice(2, 8).toUpperCase() : 'ROOM01';

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 20px' }}>

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
        marginBottom: '32px', color: walletAddress ? 'var(--neon-cyan)' : '#ffaa00',
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
            Prize pool: <strong style={{ color: '#fff' }}>{(parseFloat(selectedStake) * 2).toFixed(1)} MON</strong> · Platform fee: 2.5% · You receive: <strong style={{ color: 'var(--neon-cyan)' }}>{(parseFloat(selectedStake) * 2 * 0.975).toFixed(3)} MON</strong>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Create room */}
            <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '10px' }}>Create a room and share the code</p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{
                  flex: 1, padding: '10px 14px',
                  backgroundColor: '#07090f', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', fontFamily: 'monospace', fontSize: '18px',
                  fontWeight: 800, color: 'var(--neon-cyan)', letterSpacing: '4px',
                }}>
                  {generatedCode}
                </div>
                <button
                  onClick={() => onCreateRoom(generatedCode, selectedStake)}
                  disabled={!walletAddress || isConnecting}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                >
                  {isConnecting ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
                </button>
              </div>
            </div>

            {/* Join room */}
            <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '10px' }}>Join a friend's room with their code</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter room code..."
                  value={customRoom}
                  onChange={e => setCustomRoom(e.target.value.toUpperCase())}
                  style={{
                    flex: 1, padding: '10px 14px',
                    backgroundColor: '#07090f', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px', color: '#fff', fontSize: '16px',
                    fontFamily: 'monospace', letterSpacing: '3px',
                  }}
                />
                <button
                  onClick={() => onJoinRoom(customRoom)}
                  disabled={!walletAddress || !customRoom || isConnecting}
                  className="btn-secondary"
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Match flow summary */}
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
