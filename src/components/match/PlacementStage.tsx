'use client';

import React, { useState } from 'react';
import { DraftCard, Formation, TIER_COLORS, TRAIT_COLORS } from '../../types/match';
import { CheckCircle, Lock } from 'lucide-react';

// 4-3-3 formation slots on the half-pitch (y=0 = center line, y=1 = own goal)
const HALF_SLOTS: { x: number; y: number; label: string }[] = [
  { x: 0.50, y: 0.09, label: 'ST'  },
  { x: 0.15, y: 0.21, label: 'LW'  },
  { x: 0.85, y: 0.21, label: 'RW'  },
  { x: 0.28, y: 0.38, label: 'CM1' },
  { x: 0.50, y: 0.40, label: 'CDM' },
  { x: 0.72, y: 0.38, label: 'CM2' },
  { x: 0.12, y: 0.60, label: 'LB'  },
  { x: 0.36, y: 0.66, label: 'CB1' },
  { x: 0.64, y: 0.66, label: 'CB2' },
  { x: 0.88, y: 0.60, label: 'RB'  },
  { x: 0.50, y: 0.88, label: 'GK'  },
];

interface PlacementStageProps {
  mySquad: DraftCard[];
  timer: number;
  onSubmitFormation: (formation: Formation) => void;
  submitted: boolean;
}

export default function PlacementStage({ mySquad, timer, onSubmitFormation, submitted }: PlacementStageProps) {
  const [formation, setFormation] = useState<Formation>({});
  const [selected, setSelected] = useState<DraftCard | null>(null);

  const placedIds = new Set(Object.values(formation).map(c => c.id));
  const unplaced = mySquad.filter(c => !placedIds.has(c.id));
  const allPlaced = Object.keys(formation).length === mySquad.length && mySquad.length === 11;

  const timerColor = timer <= 10 ? '#e8001d' : timer <= 20 ? '#ffaa00' : '#00a651';
  const timerBg   = timer <= 10 ? '#FFE5E8' : timer <= 20 ? '#FFF8E0' : '#E5F7ED';

  const handleCardClick = (card: DraftCard) => {
    if (submitted) return;
    setSelected(prev => prev?.id === card.id ? null : card);
  };

  const handleSlotClick = (slotIndex: number) => {
    if (submitted) return;
    if (formation[slotIndex]) {
      // Clicking an occupied slot removes the card
      setFormation(prev => {
        const next = { ...prev };
        delete next[slotIndex];
        return next;
      });
    } else if (selected) {
      setFormation(prev => ({ ...prev, [slotIndex]: selected }));
      setSelected(null);
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '24px 20px', fontFamily: 'var(--font-primary)' }}>

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'stretch', gap: '0',
        border: '4px solid #000', boxShadow: '6px 6px 0 #000', marginBottom: '24px',
      }}>
        <div style={{
          background: 'var(--fifa-blue)', padding: '14px 28px',
          borderRight: '4px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.6)' }}>STAGE</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '2px', color: '#fff', lineHeight: 1 }}>02 — PLACEMENT</div>
        </div>
        <div style={{ flex: 1, background: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', borderRight: '4px solid #000' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: '#555', letterSpacing: '1px' }}>
            {selected
              ? `CLICK A SLOT TO PLACE  "${selected.name.toUpperCase()}"`
              : 'SELECT A PLAYER FROM THE LIST, THEN CLICK A SLOT ON THE PITCH'}
          </p>
        </div>
        <div style={{
          background: timerBg, padding: '14px 24px', textAlign: 'center', minWidth: '100px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'background 0.3s',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '42px', color: timerColor, lineHeight: 1, transition: 'color 0.3s' }}>
            {String(timer).padStart(2, '0')}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '2px', color: timerColor, opacity: 0.7 }}>SEC</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '20px', alignItems: 'start' }}>

        {/* ── HALF PITCH ── */}
        <div style={{
          position: 'relative',
          border: '4px solid #000',
          boxShadow: '6px 6px 0 #000',
          overflow: 'hidden',
          aspectRatio: '3 / 4',
          background: '#2d8a3e',
        }}>

          {/* Grass stripe pattern */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute', left: 0, right: 0,
              top: `${i * 12.5}%`, height: '12.5%',
              background: i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'transparent',
            }} />
          ))}

          {/* SVG pitch markings */}
          <svg
            viewBox="0 0 300 400"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            {/* Outer boundary */}
            <rect x="16" y="16" width="268" height="368" />

            {/* Center line — top edge (where opponents are) */}
            <line x1="16" y1="16" x2="284" y2="16" strokeWidth="3" stroke="#fff" />

            {/* Center circle arc (bottom half only, peeking into our half at top) */}
            <path d="M 85,16 A 65,65 0 0,0 215,16" />

            {/* Penalty box — bottom of half (around our goal) */}
            <rect x="68" y="278" width="164" height="106" />

            {/* 6-yard box */}
            <rect x="106" y="340" width="88" height="44" />

            {/* Penalty spot */}
            <circle cx="150" cy="316" r="3.5" fill="#fff" stroke="none" />

            {/* Penalty arc (above penalty box) */}
            <path d="M 102,278 A 52,52 0 0,1 198,278" />

            {/* Corner arcs — top */}
            <path d="M 16,30 A 14,14 0 0,0 30,16" />
            <path d="M 284,30 A 14,14 0 0,1 270,16" />

            {/* Corner arcs — bottom */}
            <path d="M 16,370 A 14,14 0 0,1 30,384" />
            <path d="M 284,370 A 14,14 0 0,0 270,384" />

            {/* Goal net at bottom (our goal) */}
            <rect x="88" y="382" width="124" height="16" strokeWidth="2" stroke="rgba(255,255,255,0.6)" />
            {[0,1,2,3,4,5].map(i => (
              <line key={i}
                x1={88 + i * 24.8} y1="384"
                x2={88 + i * 24.8} y2="398"
                strokeWidth="1" stroke="rgba(255,255,255,0.4)"
              />
            ))}
            <line x1="88" y1="391" x2="212" y2="391" strokeWidth="1" stroke="rgba(255,255,255,0.4)" />
          </svg>

          {/* YOUR HALF label */}
          <div style={{
            position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '3px',
            color: 'rgba(255,255,255,0.4)', userSelect: 'none',
          }}>YOUR HALF</div>

          {/* Formation slots */}
          {HALF_SLOTS.map((slot, i) => {
            const card = formation[i];
            const isEmpty = !card;
            const isSelected = card && selected === null; // highlight effect placeholder
            const tierColor = card ? TIER_COLORS[card.tier] : '#fff';
            const canDrop = isEmpty && selected !== null;

            return (
              <div
                key={i}
                onClick={() => handleSlotClick(i)}
                style={{
                  position: 'absolute',
                  left: `${slot.x * 100}%`,
                  top: `${slot.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  border: canDrop
                    ? '3px dashed #fff'
                    : card
                    ? `3px solid ${tierColor}`
                    : '2px dashed rgba(255,255,255,0.35)',
                  backgroundColor: canDrop
                    ? 'rgba(255,255,255,0.18)'
                    : card
                    ? 'rgba(0,0,0,0.55)'
                    : 'rgba(0,0,0,0.28)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: (canDrop || card) ? 'pointer' : 'default',
                  boxShadow: card ? `0 0 12px ${tierColor}88` : canDrop ? '0 0 14px rgba(255,255,255,0.5)' : 'none',
                  transition: 'all 0.15s',
                  zIndex: 2,
                  userSelect: 'none',
                }}
              >
                {card ? (
                  <>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: TRAIT_COLORS[card.trait] || '#fff',
                      border: '2px solid #000', marginBottom: '2px',
                    }} />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '8px', color: '#fff', textAlign: 'center', lineHeight: 1.1, letterSpacing: '0.5px' }}>
                      {card.name.split(' ')[0].toUpperCase()}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '7px', color: tierColor, opacity: 0.9, letterSpacing: '0.5px' }}>
                      {slot.label}
                    </div>
                  </>
                ) : (
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: canDrop ? '#fff' : 'rgba(255,255,255,0.45)', fontWeight: 700 }}>
                    {slot.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── PLAYER SIDEBAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '4px solid #000', boxShadow: '6px 6px 0 #000' }}>

          {/* Header */}
          <div style={{ background: 'var(--fifa-blue)', borderBottom: '4px solid #000', padding: '12px 16px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '2px', color: '#fff' }}>
              YOUR SQUAD
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', letterSpacing: '1px' }}>
              {5 - unplaced.length}/5 PLACED
            </div>
          </div>

          {/* Card list */}
          {mySquad.map(card => {
            const isPlaced = placedIds.has(card.id);
            const isActive = selected?.id === card.id;
            const tierColor = TIER_COLORS[card.tier];

            return (
              <div
                key={card.id}
                onClick={() => !isPlaced && handleCardClick(card)}
                style={{
                  display: 'flex', gap: '0',
                  borderBottom: '3px solid #000',
                  background: isActive ? 'var(--fifa-gold-light)' : isPlaced ? '#f0f0f0' : '#fff',
                  cursor: isPlaced ? 'default' : 'pointer',
                  opacity: isPlaced ? 0.55 : 1,
                  transition: 'background 0.1s',
                  borderLeft: `5px solid ${isActive ? '#9c6e00' : isPlaced ? '#ccc' : tierColor}`,
                }}
              >
                {/* Player photo */}
                <div style={{ width: '52px', height: '60px', flexShrink: 0, overflow: 'hidden', borderRight: '2px solid #000', background: '#eee' }}>
                  <img
                    src={card.image}
                    alt={card.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>

                {/* Info */}
                <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: '#000', letterSpacing: '0.5px' }}>
                      {card.name}
                    </div>
                    {isPlaced && <span style={{ fontFamily: 'var(--font-display)', fontSize: '8px', color: '#00a651', letterSpacing: '1px' }}>✓ ON PITCH</span>}
                    {isActive && <span style={{ fontFamily: 'var(--font-display)', fontSize: '8px', color: '#9c6e00', letterSpacing: '1px' }}>SELECTED ▸</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', color: '#888', letterSpacing: '0.5px' }}>
                    {(card as any).role} · {card.cost}PT
                  </div>
                </div>
              </div>
            );
          })}

          {/* Lock Formation button */}
          <div style={{ padding: '14px', background: '#fff' }}>
            <button
              onClick={() => onSubmitFormation(formation)}
              disabled={!allPlaced || submitted}
              style={{
                width: '100%', padding: '14px',
                fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '2px',
                border: '3px solid #000', boxShadow: allPlaced && !submitted ? '4px 4px 0 #000' : 'none',
                background: submitted
                  ? '#e5f7ed'
                  : allPlaced
                  ? 'var(--fifa-blue)'
                  : '#e5e7eb',
                color: submitted ? '#00a651' : allPlaced ? '#fff' : '#9ca3af',
                cursor: allPlaced && !submitted ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.15s',
              }}
            >
              {submitted ? (
                <><CheckCircle size={15} /> LOCKED IN</>
              ) : (
                <><Lock size={15} /> LOCK FORMATION</>
              )}
            </button>

            {submitted && (
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: '#555', textAlign: 'center', marginTop: '8px', letterSpacing: '1px' }}>
                WAITING FOR OPPONENT…
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
