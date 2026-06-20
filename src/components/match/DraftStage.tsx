'use client';

import React, { useState } from 'react';
import { DraftCard } from '../../types/match';
import { Lock, X, Zap, Swords, Loader2 } from 'lucide-react';

const TIER_META: Record<string, { color: string; bg: string; label: string }> = {
  Legendary: { color: '#9c6e00', bg: '#FFF8E0', label: 'LEGENDARY' },
  Epic:      { color: '#6d28d9', bg: '#EDE9FE', label: 'EPIC'      },
  Rare:      { color: '#0033A0', bg: '#E5EBFF', label: 'RARE'      },
  Common:    { color: '#374151', bg: '#F3F4F6', label: 'COMMON'    },
};

const TRAIT_META: Record<string, { color: string; bg: string }> = {
  'Arrogant':    { color: '#E8001D', bg: '#FFE5E8' },
  'Calculative': { color: '#0033A0', bg: '#E5EBFF' },
  'Panic-Prone': { color: '#555e70', bg: '#eef0f3' },
  'Maverick':    { color: '#9c6e00', bg: '#FFF8E0' },
  'Team-First':  { color: '#00A651', bg: '#E5F7ED' },
};

interface DraftStageProps {
  cardPool: DraftCard[];
  mySquad: DraftCard[];
  myPoints: number;
  lockedCardIds: Set<string>;
  timer: number;
  opponentAddress: string;
  onPickCard: (cardId: string) => void;
  onUnpickCard?: (cardId: string) => void;
  onConfirmSquad?: () => void;
}

function CardTile({ card, state, canAfford, onPick, onUnpick }: {
  card: DraftCard;
  state: 'available' | 'owned' | 'locked';
  canAfford: boolean;
  onPick: () => void;
  onUnpick: () => void;
}) {
  const tier  = TIER_META[card.tier]  ?? TIER_META.Common;
  const trait = TRAIT_META[card.trait] ?? { color: '#000', bg: '#f5f5f5' };

  const isOwned   = state === 'owned';
  const isLocked  = state === 'locked';
  const clickable = isOwned || (!isLocked && canAfford);

  const handleClick = () => {
    if (isOwned)  { onUnpick(); return; }
    if (clickable) onPick();
  };

  return (
    <div
      onClick={clickable ? handleClick : undefined}
      style={{
        position: 'relative',
        border: isOwned
          ? '4px solid #00A651'
          : isLocked
          ? '3px solid #ccc'
          : `3px solid #000`,
        background: isOwned ? '#E5F7ED' : isLocked ? '#F3F4F6' : '#fff',
        boxShadow: isOwned
          ? '5px 5px 0 #00A651'
          : isLocked
          ? 'none'
          : canAfford
          ? '5px 5px 0 #000'
          : '3px 3px 0 #ccc',
        cursor: isLocked ? 'not-allowed' : clickable ? 'pointer' : 'default',
        opacity: isLocked ? 0.45 : !canAfford && !isOwned ? 0.6 : 1,
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        if (!clickable || isLocked) return;
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translate(-2px,-2px)';
        el.style.boxShadow = isOwned ? '7px 7px 0 #00A651' : '7px 7px 0 #000';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = '';
        el.style.boxShadow = isOwned
          ? '5px 5px 0 #00A651'
          : isLocked ? 'none'
          : canAfford ? '5px 5px 0 #000' : '3px 3px 0 #ccc';
      }}
    >
      {/* Tier stripe */}
      <div style={{ background: tier.bg, borderBottom: '3px solid #000', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '1.5px', color: tier.color }}>{tier.label}</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '14px',
          color: canAfford && !isOwned && !isLocked ? 'var(--fifa-blue)' : '#999',
        }}>{card.cost}PT</span>
      </div>

      {/* Player photo */}
      <div style={{ position: 'relative', height: '90px', overflow: 'hidden', borderBottom: '3px solid #000', background: '#f0f0f0' }}>
        <img
          src={card.image}
          alt={card.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px' }}>
        {/* Name */}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '0.5px', lineHeight: 1.1, marginBottom: '2px', color: '#000' }}>
          {card.name}
        </div>
        {/* Role */}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', color: '#777', letterSpacing: '1px', marginBottom: '6px' }}>
          {(card as any).role?.toUpperCase()}
        </div>

        {/* Trait pill */}
        <div style={{
          display: 'inline-block', border: '2px solid #000',
          background: trait.bg, color: trait.color,
          fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '1.5px',
          padding: '1px 6px', marginBottom: '8px',
        }}>
          {card.trait.toUpperCase()}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', textAlign: 'center' }}>
          {([['S', card.speed], ['P', card.passing], ['H', card.shooting], ['D', card.defense], ['E', card.stamina]] as [string, number][]).map(([l, v]) => (
            <div key={l} style={{ background: isOwned ? 'rgba(0,166,81,0.12)' : 'var(--bg-alt)', border: '2px solid #000', padding: '3px 0' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '8px', letterSpacing: '1px', color: '#777' }}>{l}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: '#000' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Locked overlay */}
      {isLocked && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--fifa-red)', border: '3px solid #000', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={13} strokeWidth={3} color="#fff" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '1.5px', color: '#fff' }}>TAKEN</span>
          </div>
        </div>
      )}

      {/* Owned — unselect X badge */}
      {isOwned && (
        <div style={{
          position: 'absolute', top: '-10px', right: '-10px',
          background: 'var(--fifa-red)', border: '3px solid #000', boxShadow: '3px 3px 0 #000',
          width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 2,
        }}
          onClick={e => { e.stopPropagation(); onUnpick(); }}
        >
          <X size={13} strokeWidth={4} color="#fff" />
        </div>
      )}
    </div>
  );
}

export default function DraftStage({
  cardPool, mySquad, myPoints, lockedCardIds,
  timer, opponentAddress, onPickCard, onUnpickCard, onConfirmSquad,
}: DraftStageProps) {
  const [confirmed, setConfirmed] = useState(false);
  const mySquadIds = new Set(mySquad.map(c => c.id));
  const squadFull  = mySquad.length >= 5;

  const timerColor = timer <= 10 ? 'var(--fifa-red)' : timer <= 20 ? '#C89520' : '#00A651';
  const timerBg    = timer <= 10 ? '#FFE5E8' : timer <= 20 ? '#FFF8E0' : '#E5F7ED';

  const pointsSpent = mySquad.reduce((a, c) => a + c.cost, 0);

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '28px 20px' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', border: '4px solid #000', boxShadow: 'var(--shadow-md)', marginBottom: '24px' }}>
        {/* Stage label */}
        <div style={{ background: 'var(--fifa-blue)', padding: '14px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '4px solid #000' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '3px', color: 'rgba(255,255,255,0.6)' }}>STAGE</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '2px', color: '#fff', lineHeight: 1 }}>01 — DRAFT</div>
        </div>

        {/* Opponent */}
        <div style={{ flex: 1, background: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', borderRight: '4px solid #000' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', color: '#555' }}>VS</div>
          <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 800, color: '#000', wordBreak: 'break-all' }}>
            {opponentAddress ? `${opponentAddress.slice(0, 8)}…${opponentAddress.slice(-6)}` : 'Waiting for opponent…'}
          </div>
        </div>

        {/* Timer */}
        <div style={{ background: timerBg, padding: '14px 24px', textAlign: 'center', borderRight: '4px solid #000', minWidth: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'background 0.3s' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '42px', color: timerColor, lineHeight: 1, transition: 'color 0.3s' }}>
            {String(timer).padStart(2, '0')}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '2px', color: timerColor, opacity: 0.7 }}>SEC</div>
        </div>

        {/* Points */}
        <div style={{ background: '#fff', padding: '14px 24px', textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '120px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', color: '#555' }}>BUDGET</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: myPoints <= 2 ? 'var(--fifa-red)' : 'var(--fifa-blue)', lineHeight: 1, transition: 'color 0.2s' }}>
            {myPoints}<span style={{ fontSize: '14px', color: '#999' }}>PT</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: '#999', letterSpacing: '1px' }}>
            {mySquad.length}/5 PICKED
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>

        {/* ── CARD POOL ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <p style={{ fontFamily: 'var(--font-primary)', fontSize: '13px', fontWeight: 700, color: '#555' }}>
              Pick 5 players · budget ≤ 10 pts · click a picked card to <strong>unselect</strong>
            </p>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              {[['#00A651', 'YOUR PICK'], ['var(--fifa-red)', 'TAKEN']].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '10px', height: '10px', background: c, border: '2px solid #000' }} />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '1px', color: '#555' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '12px' }}>
            {cardPool.map(card => {
              const isOwned  = mySquadIds.has(card.id);
              const isLocked = lockedCardIds.has(card.id) && !isOwned;
              const cardState: 'owned' | 'locked' | 'available' = isOwned ? 'owned' : isLocked ? 'locked' : 'available';

              return (
                <CardTile
                  key={card.id}
                  card={card}
                  state={cardState}
                  canAfford={myPoints >= card.cost && !squadFull && !isOwned}
                  onPick={() => onPickCard(card.id)}
                  onUnpick={() => onUnpickCard?.(card.id)}
                />
              );
            })}
          </div>
        </div>

        {/* ── MY SQUAD PANEL ── */}
        <div style={{ position: 'sticky', top: '16px', display: 'flex', flexDirection: 'column', gap: '0', border: '4px solid #000', boxShadow: 'var(--shadow-md)' }}>
          {/* Header */}
          <div style={{ background: 'var(--fifa-blue)', borderBottom: '4px solid #000', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'var(--fifa-gold-light)', border: '2px solid #000', padding: '4px', display: 'flex' }}>
              <Zap size={14} strokeWidth={3} color="#000" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '2px', color: '#fff' }}>YOUR SQUAD</span>
          </div>

          {/* Budget bar */}
          <div style={{ background: '#fff', borderBottom: '3px solid #000', padding: '10px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '1.5px', color: '#555' }}>POINTS SPENT</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: '#000' }}>{pointsSpent} / 10</span>
            </div>
            <div style={{ height: '8px', background: '#e5e7eb', border: '2px solid #000' }}>
              <div style={{
                height: '100%',
                width: `${(pointsSpent / 10) * 100}%`,
                background: pointsSpent >= 9 ? 'var(--fifa-red)' : 'var(--fifa-blue)',
                transition: 'width 0.2s ease, background 0.2s ease',
              }} />
            </div>
          </div>

          {/* Slots */}
          <div style={{ background: '#fff' }}>
            {[0,1,2,3,4].map(i => {
              const card = mySquad[i];
              const tier = card ? (TIER_META[card.tier] ?? TIER_META.Common) : null;
              const trait = card ? (TRAIT_META[card.trait] ?? { color: '#000', bg: '#f5f5f5' }) : null;

              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0',
                  borderBottom: i < 4 ? '3px solid #000' : undefined,
                  minHeight: '56px',
                }}>
                  {/* Slot number / player photo */}
                  <div style={{
                    width: '44px', flexShrink: 0,
                    borderRight: '3px solid #000', alignSelf: 'stretch',
                    overflow: 'hidden', position: 'relative',
                    background: card ? 'var(--fifa-blue)' : 'var(--bg-alt)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {card ? (
                      <img src={card.image} alt={card.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', position: 'absolute', inset: 0 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: '#ccc' }}>{i + 1}</span>
                    )}
                  </div>

                  {card ? (
                    <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '0.5px', color: '#000' }}>{card.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: '#555' }}>{card.cost}PT</span>
                          {/* Unselect button */}
                          <button
                            onClick={() => onUnpickCard?.(card.id)}
                            style={{
                              background: 'var(--fifa-red)', border: '2px solid #000', padding: '2px 5px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center',
                              boxShadow: '2px 2px 0 #000',
                            }}
                            title="Remove from squad"
                          >
                            <X size={11} strokeWidth={4} color="#fff" />
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ background: tier!.bg, border: `2px solid ${tier!.color}`, padding: '0px 5px', fontFamily: 'var(--font-display)', fontSize: '8px', letterSpacing: '1px', color: tier!.color }}>{tier!.label}</div>
                        <div style={{ background: trait!.bg, border: `2px solid ${trait!.color}`, padding: '0px 5px', fontFamily: 'var(--font-display)', fontSize: '8px', letterSpacing: '1px', color: trait!.color }}>{card.trait.toUpperCase()}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '1.5px', color: '#ccc' }}>EMPTY SLOT</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Status footer */}
          <div style={{
            borderTop: '4px solid #000', padding: '14px 16px',
            background: confirmed ? '#E5F7ED' : squadFull ? '#fff' : 'var(--bg-alt)',
            transition: 'background 0.2s',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            {squadFull && !confirmed && (
              <button
                onClick={() => {
                  setConfirmed(true);
                  onConfirmSquad?.();
                }}
                style={{
                  width: '100%', padding: '14px 0',
                  fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '3px',
                  background: 'var(--fifa-blue)', color: '#fff',
                  border: '3px solid #000', boxShadow: '4px 4px 0 #000',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '10px',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '6px 6px 0 #000';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 #000';
                }}
              >
                <Swords size={18} strokeWidth={2.5} />
                START MATCH
              </button>
            )}

            {confirmed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'var(--font-display)', fontSize: '13px',
                  letterSpacing: '2px', color: '#00A651',
                }}>
                  ✓ SQUAD LOCKED IN
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'var(--font-display)', fontSize: '10px',
                  letterSpacing: '1.5px', color: '#888',
                }}>
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  WAITING FOR OPPONENT…
                </div>
              </div>
            )}

            {!squadFull && (
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '12px',
                letterSpacing: '1.5px', color: '#888', textAlign: 'center',
              }}>
                PICK {5 - mySquad.length} MORE PLAYER{5 - mySquad.length !== 1 ? 'S' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
