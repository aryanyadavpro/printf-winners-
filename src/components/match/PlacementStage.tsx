'use client';

import React, { useState } from 'react';
import { DraftCard, Formation, FORMATION_SLOTS } from '../../types/match';
import { CheckCircle, Lock } from 'lucide-react';

const TIER_COLOR: Record<string, string> = {
  Legendary: '#C89520',
  Epic:      '#6d28d9',
  Rare:      '#0033A0',
  Common:    '#374151',
};

const TRAIT_COLOR: Record<string, string> = {
  'Arrogant':    '#E8001D',
  'Calculative': '#0033A0',
  'Panic-Prone': '#555e70',
  'Maverick':    '#C89520',
  'Team-First':  '#00A651',
};

interface PlacementStageProps {
  mySquad: DraftCard[];
  timer: number;
  onSubmitFormation: (formation: Formation) => void;
  submitted: boolean;
}

export default function PlacementStage({ mySquad, timer, onSubmitFormation, submitted }: PlacementStageProps) {
  const [formation, setFormation] = useState<Formation>({});
  const [dragging, setDragging]   = useState<DraftCard | null>(null);

  const placedIds = new Set(Object.values(formation).map(c => c.id));
  const unplaced  = mySquad.filter(c => !placedIds.has(c.id));
  const allPlaced = Object.keys(formation).length === mySquad.length && mySquad.length === 5;

  const timerColor = timer <= 10 ? 'var(--fifa-red)' : timer <= 20 ? '#C89520' : '#00A651';
  const timerBg    = timer <= 10 ? '#FFE5E8' : timer <= 20 ? '#FFF8E0' : '#E5F7ED';

  const handleDropOnSlot = (i: number) => {
    if (!dragging) return;
    setFormation(prev => ({ ...prev, [i]: dragging }));
    setDragging(null);
  };

  const handleRemoveFromSlot = (i: number) => {
    setFormation(prev => { const n = { ...prev }; delete n[i]; return n; });
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '28px 20px' }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', border: '4px solid #000', boxShadow: 'var(--shadow-md)', marginBottom: '24px' }}>
        <div style={{ background: 'var(--fifa-blue)', padding: '14px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '4px solid #000' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '3px', color: 'rgba(255,255,255,0.6)' }}>STAGE</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '2px', color: '#fff', lineHeight: 1 }}>02 — PLACEMENT</div>
        </div>
        <div style={{ flex: 1, background: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', borderRight: '4px solid #000' }}>
          <p style={{ fontFamily: 'var(--font-primary)', fontSize: '13px', fontWeight: 700, color: '#555' }}>
            Drag players onto formation slots · click a placed player to remove
          </p>
        </div>
        <div style={{ background: timerBg, padding: '14px 24px', textAlign: 'center', minWidth: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'background 0.3s' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '42px', color: timerColor, lineHeight: 1, transition: 'color 0.3s' }}>
            {String(timer).padStart(2, '0')}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '2px', color: timerColor, opacity: 0.7 }}>SEC</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '24px' }}>

        {/* ── PITCH ── */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, #1a5c2a 0%, #0f3d1a 50%, #0a2e13 100%)',
            border: '4px solid #000',
            boxShadow: 'var(--shadow-md)',
            aspectRatio: '3/4',
            overflow: 'hidden',
          }}
          onDragOver={e => e.preventDefault()}
        >
          {/* Pitch markings */}
          <div style={{ position: 'absolute', inset: '12px', border: '2px solid rgba(255,255,255,0.25)' }} />
          <div style={{ position: 'absolute', left: '12px', right: '12px', top: '50%', height: '2px', background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '70px', height: '70px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }} />
          {/* Goal box top */}
          <div style={{ position: 'absolute', top: '12px', left: '30%', right: '30%', height: '12%', border: '2px solid rgba(255,255,255,0.15)', borderTop: 'none' }} />
          {/* Goal box bottom */}
          <div style={{ position: 'absolute', bottom: '12px', left: '30%', right: '30%', height: '12%', border: '2px solid rgba(255,255,255,0.15)', borderBottom: 'none' }} />

          <div style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)' }}>
            YOUR HALF
          </div>

          {/* Formation slots */}
          {FORMATION_SLOTS.map((slot, i) => {
            const card = formation[i];
            const tc   = card ? TIER_COLOR[card.tier] : 'rgba(255,255,255,0.3)';
            return (
              <div
                key={i}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDropOnSlot(i)}
                onClick={() => card && handleRemoveFromSlot(i)}
                title={card ? `Click to remove ${card.name}` : `Drop ${slot.label} here`}
                style={{
                  position: 'absolute',
                  left: `${slot.x * 100}%`, top: `${slot.y * 100}%`,
                  transform: 'translate(-50%,-50%)',
                  width: card ? '58px' : '46px',
                  height: card ? '58px' : '46px',
                  border: `3px ${card ? 'solid' : 'dashed'} ${tc}`,
                  background: card ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: card ? 'pointer' : 'default',
                  boxShadow: card ? `0 0 0 3px #000, 4px 4px 0 #000` : 'none',
                  transition: 'all 0.15s', zIndex: 2,
                }}
              >
                {card ? (
                  <>
                    <div style={{ width: '14px', height: '14px', background: TRAIT_COLOR[card.trait] || '#fff', border: '2px solid #fff' }} />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '7px', color: '#fff', marginTop: '3px', textAlign: 'center', lineHeight: 1.1, maxWidth: '52px', overflow: 'hidden', letterSpacing: '0.5px' }}>
                      {card.name.split(' ')[0]}
                    </div>
                  </>
                ) : (
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>{slot.label}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── SIDEBAR ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '2px', color: '#555' }}>
            DRAG ONTO PITCH
          </div>

          {unplaced.length === 0 && !submitted && (
            <div style={{ background: '#E5F7ED', border: '3px solid #000', boxShadow: '3px 3px 0 #000', padding: '10px 14px', fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '1.5px', color: '#00A651' }}>
              ✓ ALL PLACED
            </div>
          )}

          {unplaced.map(card => (
            <div
              key={card.id}
              draggable
              onDragStart={() => setDragging(card)}
              onDragEnd={() => setDragging(null)}
              style={{
                background: '#fff', border: '3px solid #000',
                borderLeft: `8px solid ${TIER_COLOR[card.tier]}`,
                boxShadow: '4px 4px 0 #000',
                padding: '10px 12px',
                cursor: 'grab',
                opacity: dragging?.id === card.id ? 0.45 : 1,
                transition: 'opacity 0.1s, transform 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '0.5px', color: '#000', lineHeight: 1 }}>{card.name}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '1.5px', color: TRAIT_COLOR[card.trait] || '#555', marginTop: '4px' }}>{card.trait.toUpperCase()}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontFamily: 'var(--font-display)', fontSize: '11px', color: '#555' }}>
                <span>S:{card.speed}</span>
                <span>P:{card.passing}</span>
                <span>H:{card.shooting}</span>
              </div>
            </div>
          ))}

          <button
            onClick={() => onSubmitFormation(formation)}
            disabled={!allPlaced || submitted}
            className="btn-primary"
            style={{ justifyContent: 'center', padding: '14px', fontSize: '16px', letterSpacing: '2px', marginTop: 'auto' }}
          >
            {submitted
              ? <><Lock size={15} strokeWidth={3} /> LOCKED IN</>
              : <><CheckCircle size={15} strokeWidth={3} /> LOCK FORMATION</>
            }
          </button>

          {submitted && (
            <div style={{ background: 'var(--bg-alt)', border: '3px solid #000', padding: '10px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '1.5px', color: '#555' }}>
              WAITING FOR OPPONENT…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
