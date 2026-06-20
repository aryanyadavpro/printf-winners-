'use client';

import React from 'react';
import { MatchResult as MatchResultType } from '../../types/match';
import { Trophy, RefreshCw, ExternalLink } from 'lucide-react';

interface MatchResultProps {
  result: MatchResultType;
  myAddress: string;
  stake: string;
  onPlayAgain: () => void;
}

export default function MatchResult({ result, myAddress, stake, onPlayAgain }: MatchResultProps) {
  const isWinner = result.winner.toLowerCase() === myAddress.toLowerCase();
  const payout = (parseFloat(stake) * 2 * 0.975).toFixed(3);

  return (
    <div style={{
      maxWidth: '520px', margin: '0 auto', padding: '60px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px',
      textAlign: 'center',
    }}>

      {/* Result banner */}
      <div style={{
        width: '100%', padding: '32px',
        borderRadius: '16px',
        background: isWinner
          ? 'linear-gradient(135deg, rgba(0,255,200,0.08), rgba(138,43,226,0.12))'
          : 'linear-gradient(135deg, rgba(255,59,48,0.08), rgba(255,0,85,0.05))',
        border: `2px solid ${isWinner ? 'rgba(0,255,200,0.3)' : 'rgba(255,59,48,0.3)'}`,
      }}>
        <Trophy size={48} style={{ color: isWinner ? '#FFD700' : '#5d637f', marginBottom: '16px' }} />

        <h1 style={{
          fontFamily: 'var(--font-manga)',
          fontSize: '52px',
          letterSpacing: '3px',
          color: isWinner ? 'var(--neon-cyan)' : '#ff3b30',
          textShadow: isWinner ? '0 0 20px rgba(0,255,200,0.5)' : '0 0 20px rgba(255,59,48,0.4)',
          marginBottom: '8px',
        }}>
          {isWinner ? 'VICTORY' : 'DEFEAT'}
        </h1>

        {isWinner && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '13px', color: '#8b949e' }}>Prize Pool Transferred</div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--neon-cyan)', marginTop: '4px' }}>
              +{payout} MON
            </div>
            <div style={{ fontSize: '12px', color: '#5d637f', marginTop: '4px' }}>
              sent to your wallet via Monad smart contract
            </div>
          </div>
        )}

        {!isWinner && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#8b949e' }}>
            Better luck next time. Your opponent claimed {payout} MON.
          </div>
        )}
      </div>

      {/* Score breakdown */}
      <div className="glass-panel" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Squad Power Scores
        </h3>
        {result.scores.map((s, i) => {
          const isMe = s.address.toLowerCase() === myAddress.toLowerCase();
          return (
            <div key={s.address} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: '8px',
              backgroundColor: isMe ? 'rgba(0,255,200,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isMe ? 'rgba(0,255,200,0.15)' : 'rgba(255,255,255,0.04)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px' }}>{i === 0 ? '🥇' : '🥈'}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', color: isMe ? 'var(--neon-cyan)' : '#fff' }}>
                  {s.address.slice(0, 6)}…{s.address.slice(-4)}
                  {isMe && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#5d637f' }}>(you)</span>}
                </span>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 800, color: i === 0 ? '#FFD700' : '#8b949e' }}>
                {s.total.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Winner address */}
      <div style={{ fontSize: '12px', color: '#5d637f' }}>
        Winner: <span style={{ fontFamily: 'monospace', color: '#8b949e' }}>{result.winner}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
        <button onClick={onPlayAgain} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '15px', fontFamily: 'var(--font-manga)', letterSpacing: '2px' }}>
          <RefreshCw size={16} /> PLAY AGAIN
        </button>
        <a
          href={`https://testnet.monadexplorer.com/address/${result.winner}`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 18px', fontSize: '13px', textDecoration: 'none' }}
        >
          <ExternalLink size={14} /> Explorer
        </a>
      </div>
    </div>
  );
}
