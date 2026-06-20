'use client';

import React, { useState } from 'react';
import { DraftCard, Formation, FORMATION_SLOTS, TIER_COLORS, TRAIT_COLORS } from '../../types/match';
import { CheckCircle } from 'lucide-react';

interface PlacementStageProps {
  mySquad: DraftCard[];
  timer: number;
  onSubmitFormation: (formation: Formation) => void;
  submitted: boolean;
}

export default function PlacementStage({ mySquad, timer, onSubmitFormation, submitted }: PlacementStageProps) {
  const [formation, setFormation] = useState<Formation>({});
  const [dragging, setDragging] = useState<DraftCard | null>(null);

  const placedIds = new Set(Object.values(formation).map(c => c.id));
  const unplaced = mySquad.filter(c => !placedIds.has(c.id));

  const timerColor = timer <= 10 ? '#ff3b30' : timer <= 20 ? '#ffaa00' : 'var(--neon-cyan)';

  const handleDropOnSlot = (slotIndex: number) => {
    if (!dragging) return;
    setFormation(prev => ({ ...prev, [slotIndex]: dragging }));
    setDragging(null);
  };

  const handleRemoveFromSlot = (slotIndex: number) => {
    setFormation(prev => {
      const next = { ...prev };
      delete next[slotIndex];
      return next;
    });
  };

  const allPlaced = Object.keys(formation).length === 5;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-manga)', fontSize: '28px', letterSpacing: '2px' }}>STAGE 2 — PLACEMENT</h2>
          <p style={{ fontSize: '12px', color: '#8b949e', marginTop: '2px' }}>Drag players onto your formation slots</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '42px', fontWeight: 900, fontFamily: 'monospace', color: timerColor, lineHeight: 1 }}>
            {String(timer).padStart(2, '0')}
          </div>
          <div style={{ fontSize: '10px', color: '#5d637f' }}>seconds left</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '24px' }}>

        {/* Pitch half */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, #0a1a0a 0%, #0d2010 100%)',
            border: '2px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            aspectRatio: '3/4',
            overflow: 'hidden',
          }}
          onDragOver={e => e.preventDefault()}
        >
          {/* Pitch lines */}
          <div style={{ position: 'absolute', inset: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }} />
          <div style={{ position: 'absolute', left: '10px', right: '10px', top: '50%', height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <div style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
            width: '60px', height: '60px', borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.08)',
          }} />

          {/* YOUR HALF label */}
          <div style={{
            position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
            fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px', textTransform: 'uppercase',
          }}>Your Half</div>

          {/* Formation slots */}
          {FORMATION_SLOTS.map((slot, i) => {
            const card = formation[i];
            const tierColor = card ? TIER_COLORS[card.tier] : 'rgba(255,255,255,0.15)';
            return (
              <div
                key={i}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDropOnSlot(i)}
                onClick={() => card && handleRemoveFromSlot(i)}
                title={card ? `Click to remove ${card.name}` : `Drop ${slot.label} here`}
                style={{
                  position: 'absolute',
                  left: `${slot.x * 100}%`,
                  top: `${slot.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  width: card ? '54px' : '44px',
                  height: card ? '54px' : '44px',
                  borderRadius: '50%',
                  border: `2px ${card ? 'solid' : 'dashed'} ${tierColor}`,
                  backgroundColor: card ? '#0f111a' : 'rgba(255,255,255,0.03)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: card ? 'pointer' : 'default',
                  boxShadow: card ? `0 0 14px ${tierColor}66` : 'none',
                  transition: 'all 0.15s',
                  zIndex: 2,
                }}
              >
                {card ? (
                  <>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: TRAIT_COLORS[card.trait] || '#fff' }} />
                    <div style={{ fontSize: '7px', color: '#fff', marginTop: '2px', textAlign: 'center', lineHeight: 1.1, maxWidth: '50px', overflow: 'hidden' }}>
                      {card.name.split(' ')[0]}
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{slot.label}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Unplaced cards sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '12px', color: '#8b949e' }}>Drag onto pitch:</p>

          {unplaced.map(card => (
            <div
              key={card.id}
              draggable
              onDragStart={() => setDragging(card)}
              onDragEnd={() => setDragging(null)}
              style={{
                backgroundColor: '#0f111a',
                border: `1.5px solid ${TIER_COLORS[card.tier]}55`,
                borderRadius: '8px',
                padding: '10px',
                cursor: 'grab',
                opacity: dragging?.id === card.id ? 0.5 : 1,
                transition: 'opacity 0.1s',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700 }}>{card.name}</div>
              <div style={{ fontSize: '10px', color: TRAIT_COLORS[card.trait], textTransform: 'uppercase', marginTop: '2px' }}>{card.trait}</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', fontSize: '10px', color: '#8b949e' }}>
                <span>S:{card.speed}</span>
                <span>P:{card.passing}</span>
                <span>H:{card.shooting}</span>
              </div>
            </div>
          ))}

          {unplaced.length === 0 && !submitted && (
            <p style={{ fontSize: '11px', color: '#00ffcc', textAlign: 'center', padding: '8px' }}>All placed!</p>
          )}

          <button
            onClick={() => onSubmitFormation(formation)}
            disabled={!allPlaced || submitted}
            className="btn-primary"
            style={{ justifyContent: 'center', padding: '12px', marginTop: '8px', fontSize: '13px' }}
          >
            {submitted
              ? <><CheckCircle size={14} /> Locked In</>
              : 'Lock Formation'}
          </button>

          {submitted && (
            <p style={{ fontSize: '11px', color: '#8b949e', textAlign: 'center' }}>
              Waiting for opponent…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
