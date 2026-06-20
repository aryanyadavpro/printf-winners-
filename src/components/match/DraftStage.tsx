'use client';

import React from 'react';
import { DraftCard, TIER_COLORS, TRAIT_COLORS } from '../../types/match';
import { Lock, CheckCircle, Zap } from 'lucide-react';

interface DraftStageProps {
  cardPool: DraftCard[];
  mySquad: DraftCard[];
  myPoints: number;
  lockedCardIds: Set<string>;
  timer: number;
  opponentAddress: string;
  onPickCard: (cardId: string) => void;
}

function CardTile({ card, locked, owned, canAfford, onPick }: {
  card: DraftCard;
  locked: boolean;
  owned: boolean;
  canAfford: boolean;
  onPick: () => void;
}) {
  const tierColor = TIER_COLORS[card.tier];
  const traitColor = TRAIT_COLORS[card.trait] || '#fff';
  const disabled = locked || owned || !canAfford;

  return (
    <div
      onClick={disabled ? undefined : onPick}
      style={{
        position: 'relative',
        backgroundColor: owned ? 'rgba(0,255,200,0.06)' : locked ? 'rgba(255,255,255,0.02)' : '#0f111a',
        border: `1.5px solid ${owned ? 'rgba(0,255,200,0.4)' : locked ? 'rgba(255,255,255,0.05)' : tierColor + '55'}`,
        borderRadius: '10px',
        padding: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.35 : 1,
        transition: 'transform 0.1s, box-shadow 0.1s',
        boxShadow: !disabled && !owned ? `0 0 10px ${tierColor}22` : 'none',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
    >
      {/* Tier badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <span style={{
          fontSize: '9px', fontWeight: 800, letterSpacing: '1px',
          color: tierColor, textTransform: 'uppercase',
        }}>{card.tier}</span>
        <span style={{
          fontSize: '13px', fontWeight: 800,
          color: canAfford && !locked && !owned ? 'var(--neon-cyan)' : '#5d637f',
        }}>{card.cost}pt</span>
      </div>

      {/* Name */}
      <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', lineHeight: 1.2 }}>{card.name}</div>
      <div style={{ fontSize: '10px', color: traitColor, fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
        {card.trait}
      </div>

      {/* Stats mini-grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', textAlign: 'center' }}>
        {[['S', card.speed], ['P', card.passing], ['H', card.shooting], ['D', card.defense], ['E', card.stamina]].map(([l, v]) => (
          <div key={l as string} style={{ backgroundColor: '#07090f', borderRadius: '4px', padding: '3px 0' }}>
            <div style={{ fontSize: '8px', color: '#5d637f' }}>{l}</div>
            <div style={{ fontSize: '11px', fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Overlay icons */}
      {locked && !owned && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '10px', backgroundColor: 'rgba(0,0,0,0.3)',
        }}>
          <Lock size={20} color="#ff3b30" />
        </div>
      )}
      {owned && (
        <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
          <CheckCircle size={16} color="#00ffcc" />
        </div>
      )}
    </div>
  );
}

export default function DraftStage({ cardPool, mySquad, myPoints, lockedCardIds, timer, opponentAddress, onPickCard }: DraftStageProps) {
  const mySquadIds = new Set(mySquad.map(c => c.id));
  const squadFull = mySquad.length >= 5;

  const timerColor = timer <= 10 ? '#ff3b30' : timer <= 20 ? '#ffaa00' : 'var(--neon-cyan)';

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px' }}>

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-manga)', fontSize: '28px', letterSpacing: '2px' }}>STAGE 1 — DRAFT</h2>
          <p style={{ fontSize: '12px', color: '#8b949e', marginTop: '2px' }}>
            vs <span style={{ fontFamily: 'monospace', color: '#fff' }}>{opponentAddress.slice(0, 6)}…{opponentAddress.slice(-4)}</span>
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '42px', fontWeight: 900, fontFamily: 'monospace', color: timerColor, lineHeight: 1 }}>
            {String(timer).padStart(2, '0')}
          </div>
          <div style={{ fontSize: '10px', color: '#5d637f' }}>seconds left</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--neon-cyan)' }}>{myPoints}<span style={{ fontSize: '14px', color: '#8b949e' }}>pts</span></div>
          <div style={{ fontSize: '12px', color: '#8b949e' }}>Squad: {mySquad.length}/5</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>

        {/* Card pool grid */}
        <div>
          <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '12px' }}>
            Pick 5 players — total cost ≤ 10 pts. Locked cards are taken by your opponent.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            {cardPool.map(card => (
              <CardTile
                key={card.id}
                card={card}
                locked={lockedCardIds.has(card.id) && !mySquadIds.has(card.id)}
                owned={mySquadIds.has(card.id)}
                canAfford={myPoints >= card.cost && !squadFull}
                onPick={() => onPickCard(card.id)}
              />
            ))}
          </div>
        </div>

        {/* My squad panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} style={{ color: 'var(--monad-purple)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Your Squad</h3>
          </div>

          {mySquad.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#5d637f', textAlign: 'center', padding: '20px 0' }}>
              No cards picked yet
            </p>
          ) : (
            mySquad.map(card => (
              <div key={card.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: '#07090f', padding: '10px 12px', borderRadius: '8px',
                borderLeft: `4px solid ${TIER_COLORS[card.tier]}`,
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{card.name}</div>
                  <div style={{ fontSize: '10px', color: TRAIT_COLORS[card.trait], textTransform: 'uppercase' }}>{card.trait}</div>
                </div>
                <span style={{ fontSize: '11px', color: '#5d637f' }}>{card.cost}pt</span>
              </div>
            ))
          )}

          {squadFull && (
            <div style={{
              textAlign: 'center', padding: '10px',
              backgroundColor: 'rgba(0,255,200,0.08)',
              border: '1px solid rgba(0,255,200,0.2)', borderRadius: '8px',
              fontSize: '13px', color: '#00ffcc', fontWeight: 700,
            }}>
              ✓ Squad Full — Waiting for timer
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
