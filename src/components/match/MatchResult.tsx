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
  const payout   = (parseFloat(stake || '0') * 2 * 0.975).toFixed(3);

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── RESULT HERO ── */}
      <div style={{
        background: isWinner ? 'var(--fifa-blue)' : '#111',
        border: '4px solid #000',
        boxShadow: 'var(--shadow-xl)',
        padding: '40px 32px',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* bg dots */}
        <div style={{ position:'absolute', inset:0, opacity:0.07, backgroundImage:'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize:'24px 24px', pointerEvents:'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* FIFA badge */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom:'16px' }}>
            <div style={{ background:'var(--fifa-gold-light)', border:'3px solid #000', boxShadow:'3px 3px 0 #000', padding:'2px 10px', fontFamily:'var(--font-display)', fontSize:'12px', letterSpacing:'3px', color:'#000', transform:'rotate(-1deg)' }}>FIFA</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ background: isWinner ? 'var(--fifa-gold-light)' : '#333', border: '4px solid #000', boxShadow: '6px 6px 0 #000', padding: '16px' }}>
              <Trophy size={40} strokeWidth={2.5} color={isWinner ? '#000' : '#777'} />
            </div>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(52px,10vw,80px)',
            letterSpacing: '4px',
            color: isWinner ? 'var(--fifa-gold-light)' : 'var(--fifa-red)',
            WebkitTextStroke: '2px #000',
            lineHeight: 1,
            marginBottom: '20px',
          }}>
            {isWinner ? 'VICTORY' : 'DEFEAT'}
          </h1>

          {isWinner ? (
            <div style={{ background: 'rgba(255,255,255,0.12)', border: '3px solid rgba(255,255,255,0.3)', padding: '16px 24px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '2px', color: 'rgba(255,255,255,0.7)' }}>PRIZE POOL TRANSFERRED</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '42px', color: 'var(--fifa-gold-light)', lineHeight: 1, marginTop: '4px' }}>
                +{payout} <span style={{ fontSize: '18px' }}>MON</span>
              </div>
              <div style={{ fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginTop: '6px' }}>
                settled on-chain via Monad smart contract
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-primary)', fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              Better luck next time.<br />Your opponent claimed <strong style={{ color: '#fff' }}>{payout} MON</strong>.
            </div>
          )}
        </div>
      </div>

      {/* ── SCORE BREAKDOWN ── */}
      <div style={{ border: '4px solid #000', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ background: 'var(--fifa-blue)', borderBottom: '4px solid #000', padding: '12px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '2px', color: '#fff' }}>SQUAD POWER SCORES</div>
        </div>

        {result.scores.map((s, i) => {
          const isMe = s.address.toLowerCase() === myAddress.toLowerCase();
          return (
            <div key={s.address} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px',
              background: isMe ? '#E5F7ED' : '#fff',
              borderBottom: i < result.scores.length - 1 ? '3px solid #000' : undefined,
              borderLeft: `8px solid ${i === 0 ? 'var(--fifa-gold)' : '#ccc'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '22px',
                  color: i === 0 ? 'var(--fifa-gold)' : '#999',
                }}>
                  {i === 0 ? '🥇' : '🥈'}
                </div>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 800, color: '#000' }}>
                    {s.address.slice(0, 6)}…{s.address.slice(-4)}
                  </div>
                  {isMe && (
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '2px', color: '#00A651', marginTop: '2px' }}>YOU</div>
                  )}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: i === 0 ? 'var(--fifa-blue)' : '#999', lineHeight: 1 }}>
                {s.total.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ACTIONS ── */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button onClick={onPlayAgain} className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '16px', fontSize: '20px', letterSpacing: '3px' }}>
          <RefreshCw size={18} strokeWidth={3} /> PLAY AGAIN
        </button>
        <a
          href={`https://testnet.monadexplorer.com/address/${result.winner}`}
          target="_blank" rel="noreferrer"
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '16px 20px', fontSize: '14px', textDecoration: 'none' }}
        >
          <ExternalLink size={14} strokeWidth={3} /> Explorer
        </a>
      </div>
    </div>
  );
}
