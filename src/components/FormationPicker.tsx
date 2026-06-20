'use client';

import React, { useState } from 'react';
import { Player, PositionSlot } from '../types/game';
import { POSITION_MULTIPLIERS, applyPositionBonuses } from '../utils/matchEngine';
import { getPlayerImage } from '../utils/playerImages';

export interface FormationAssignment {
  GK: Player | null;
  DL: Player | null;
  DR: Player | null;
  MF: Player | null;
  FW: Player | null;
}

interface FormationPickerProps {
  squad: Player[];
  onConfirm: (players: Player[]) => void;
  onBack: () => void;
}

const POSITION_LABELS: Record<PositionSlot, string> = {
  GK: 'Goalkeeper',
  DL: 'Def. Left',
  DR: 'Def. Right',
  MF: 'Midfielder',
  FW: 'Forward',
};

// Rows rendered top→bottom = attack→defense on the pitch display
const FORMATION_ROWS: PositionSlot[][] = [['FW'], ['MF'], ['DL', 'DR'], ['GK']];

// 3 = perfect fit, 2 = decent, 1 = mismatched
function getNaturalSlot(p: Player): PositionSlot {
  const { defense, passing, shooting } = p;
  const top = Math.max(defense, passing, shooting);
  if (top === defense && defense > 75 && shooting < 65) return 'GK';
  if (top === defense) return 'DL';
  if (top === passing) return 'MF';
  if (top === shooting) return 'FW';
  return 'MF';
}

function getPositionFit(player: Player, slot: PositionSlot): 1 | 2 | 3 {
  const natural = getNaturalSlot(player);
  if (natural === slot || (slot === 'DR' && natural === 'DL') || (slot === 'DL' && natural === 'DR')) return 3;
  const adj: Partial<Record<PositionSlot, PositionSlot[]>> = {
    GK: ['DL', 'DR'],
    DL: ['GK', 'DR', 'MF'],
    DR: ['GK', 'DL', 'MF'],
    MF: ['DL', 'DR', 'FW'],
    FW: ['MF'],
  };
  return adj[slot]?.includes(natural) ? 2 : 1;
}

function getTraitColor(trait: string): string {
  switch (trait) {
    case 'Arrogant':    return 'var(--color-arrogant)';
    case 'Calculative': return 'var(--color-calculative)';
    case 'Panic-Prone': return 'var(--color-panic)';
    case 'Maverick':    return 'var(--color-maverick)';
    case 'Team-First':  return 'var(--color-team)';
    default:            return '#000000';
  }
}

const FIT_COLOR = ['', '#FF0055', '#FFEA00', '#00FF66'] as const;
const FIT_LABEL = ['', 'WEAK', 'DECENT', 'NATURAL'] as const;

export default function FormationPicker({ squad, onConfirm, onBack }: FormationPickerProps) {
  const [assignment, setAssignment] = useState<FormationAssignment>({
    GK: null, DL: null, DR: null, MF: null, FW: null,
  });
  const [selectedSlot, setSelectedSlot] = useState<PositionSlot | null>(null);

  const assignedIds = new Set(
    (Object.values(assignment).filter(Boolean) as Player[]).map(p => p.id)
  );
  const isComplete = Object.values(assignment).every(Boolean);
  const filledCount = Object.values(assignment).filter(Boolean).length;

  function handleSlotClick(slot: PositionSlot) {
    setSelectedSlot(prev => (prev === slot ? null : slot));
  }

  function handlePlayerClick(player: Player) {
    if (!selectedSlot || assignedIds.has(player.id)) return;
    const next = { ...assignment };
    // Unassign this player from wherever they currently are
    (Object.keys(next) as PositionSlot[]).forEach(s => {
      if (next[s]?.id === player.id) next[s] = null;
    });
    next[selectedSlot] = player;
    setAssignment(next);
    setSelectedSlot(null);
  }

  function handleRemove(slot: PositionSlot, e: React.MouseEvent) {
    e.stopPropagation();
    setAssignment(a => ({ ...a, [slot]: null }));
  }

  function handleConfirm() {
    if (!isComplete) return;
    // Emit players in slot order: GK, DL, DR, MF, FW — matches pitch index positions
    const ordered: PositionSlot[] = ['GK', 'DL', 'DR', 'MF', 'FW'];
    const players = ordered.map(slot => applyPositionBonuses(assignment[slot]!, slot));
    onConfirm(players);
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{
          fontFamily: 'var(--font-manga)',
          fontSize: '60px',
          letterSpacing: '3px',
          color: 'var(--fifa-green)',
          textShadow: '5px 5px 0px #000000',
          WebkitTextStroke: '2px #000000',
          lineHeight: 1,
          marginBottom: '12px',
        }}>
          SET FORMATION
        </h1>
        <p style={{
          display: 'inline-block',
          fontSize: '13px',
          fontWeight: 800,
          color: '#000000',
          backgroundColor: 'var(--fifa-gold)',
          border: '3px solid #000000',
          padding: '6px 16px',
          boxShadow: '3px 3px 0px #000000',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Assign agents to positions — stat multipliers apply in-game based on role fit
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>

        {/* ── Pitch ── */}
        <div style={{
          background: 'linear-gradient(180deg, #0d7a3a 0%, #107c41 50%, #0d7a3a 100%)',
          border: '4px solid #000000',
          boxShadow: '8px 8px 0px #000000',
          padding: '20px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          position: 'relative',
          minHeight: '470px',
        }}>
          {/* Decorative pitch lines */}
          <div style={{ position: 'absolute', top: '50%', left: '8%', right: '8%', height: '2px', background: 'rgba(255,255,255,0.22)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '25%', left: '22%', right: '22%', height: '2px', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '75%', left: '22%', right: '22%', height: '2px', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />

          <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', textAlign: 'center', letterSpacing: '3px' }}>
            ▲ ATTACK DIRECTION ▲
          </div>

          {FORMATION_ROWS.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: '16px', flex: 1 }}>
              {row.map(slot => {
                const player = assignment[slot];
                const isSelected = selectedSlot === slot;
                const fit = player ? getPositionFit(player, slot) : null;
                const eff = player ? applyPositionBonuses(player, slot) : null;

                return (
                  <div
                    key={slot}
                    onClick={() => handleSlotClick(slot)}
                    style={{
                      width: '152px',
                      border: isSelected
                        ? '4px solid var(--fifa-gold)'
                        : '3px solid rgba(255,255,255,0.38)',
                      boxShadow: isSelected
                        ? '0 0 0 2px #000, 4px 4px 0px #000'
                        : '3px 3px 0px rgba(0,0,0,0.55)',
                      backgroundColor: player ? '#ffffff' : 'rgba(0,0,0,0.42)',
                      cursor: 'pointer',
                      padding: '10px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                      transform: isSelected ? 'translate(-2px,-2px)' : 'none',
                      minHeight: '108px',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Position label */}
                    <div style={{
                      fontSize: '9px', fontWeight: 900, letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: player ? '#555555' : 'rgba(255,255,255,0.65)',
                    }}>
                      {POSITION_LABELS[slot]}
                    </div>

                    {player ? (
                      <>
                        {/* Player photo or trait circle fallback */}
                        {(() => {
                          const img = getPlayerImage(player.name);
                          return img ? (
                            <img
                              src={img}
                              alt={player.name}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                objectPosition: 'top',
                                border: `3px solid ${getTraitColor(player.trait)}`,
                                marginTop: '3px',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '50%',
                              backgroundColor: '#0f111a',
                              border: `3px solid ${getTraitColor(player.trait)}`,
                              marginTop: '3px',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 900,
                              color: getTraitColor(player.trait),
                            }}>
                              {player.name.substring(0, 2).toUpperCase()}
                            </div>
                          );
                        })()}

                        {/* Name */}
                        <div style={{ fontSize: '11px', fontWeight: 900, color: '#000000', textAlign: 'center', lineHeight: 1.1 }}>
                          {player.name.length > 14 ? player.name.slice(0, 14) + '…' : player.name}
                        </div>

                        {/* Fit stars */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                          {[1, 2, 3].map(s => (
                            <div key={s} style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              backgroundColor: s <= fit! ? FIT_COLOR[fit!] : '#cccccc',
                              border: '1.5px solid #000000',
                            }} />
                          ))}
                          <span style={{ fontSize: '8px', fontWeight: 800, color: '#333', marginLeft: '2px' }}>
                            {FIT_LABEL[fit!]}
                          </span>
                        </div>

                        {/* Effective stat preview — green = boosted, red = penalised */}
                        <div style={{ display: 'flex', gap: '5px', marginTop: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {([
                            ['S', eff!.speed,    player.speed],
                            ['P', eff!.passing,  player.passing],
                            ['H', eff!.shooting, player.shooting],
                            ['D', eff!.defense,  player.defense],
                          ] as [string, number, number][]).map(([lbl, e, b]) => (
                            <span key={lbl} style={{
                              fontSize: '9px', fontWeight: 900,
                              color: e > b ? '#006b2b' : e < b ? '#cc0000' : '#333333',
                            }}>
                              {lbl}:{e}{e > b ? '▲' : e < b ? '▼' : ''}
                            </span>
                          ))}
                        </div>

                        <button
                          onClick={ev => handleRemove(slot, ev)}
                          style={{
                            fontSize: '8px', fontWeight: 900, color: '#cc0000',
                            background: 'none', border: 'none', cursor: 'pointer',
                            marginTop: '3px', textDecoration: 'underline', letterSpacing: '0.5px',
                          }}
                        >
                          REMOVE
                        </button>
                      </>
                    ) : (
                      <div style={{
                        fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                        textAlign: 'center', marginTop: '6px',
                      }}>
                        {isSelected ? '← Select player →' : 'Click to assign'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', textAlign: 'center', letterSpacing: '3px' }}>
            ▼ OWN GOAL ▼
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Squad roster */}
          <div className="glass-panel" style={{ padding: '14px' }}>
            <h3 style={{
              fontSize: '14px', fontWeight: 900, textTransform: 'uppercase',
              letterSpacing: '1px', marginBottom: '6px',
            }}>
              {selectedSlot ? `→ Placing: ${POSITION_LABELS[selectedSlot]}` : 'Squad Roster'}
            </h3>
            <p style={{ fontSize: '11px', color: '#555555', marginBottom: '10px', lineHeight: 1.4 }}>
              {selectedSlot
                ? 'Click a player to assign them. Stars = position fit.'
                : 'Click a pitch slot, then choose who fills it.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', maxHeight: '340px', overflowY: 'auto' }}>
              {squad.map(player => {
                const isAssigned = assignedIds.has(player.id);
                const slotOf = isAssigned
                  ? (Object.keys(assignment) as PositionSlot[]).find(s => assignment[s]?.id === player.id)
                  : null;
                const fit = selectedSlot ? getPositionFit(player, selectedSlot) : null;

                return (
                  <div
                    key={player.id}
                    onClick={() => handlePlayerClick(player)}
                    style={{
                      padding: '8px 10px',
                      border: `3px solid ${isAssigned ? '#cccccc' : '#000000'}`,
                      borderLeft: `8px solid ${getTraitColor(player.trait)}`,
                      backgroundColor: isAssigned ? '#f0f0f0' : '#ffffff',
                      cursor: !isAssigned && selectedSlot ? 'pointer' : 'default',
                      opacity: isAssigned ? 0.55 : 1,
                      boxShadow: isAssigned ? 'none' : '3px 3px 0px #000000',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!isAssigned && selectedSlot) {
                        (e.currentTarget as HTMLDivElement).style.transform = 'translate(-2px,-2px)';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '5px 5px 0px #000000';
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = '';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = isAssigned ? 'none' : '3px 3px 0px #000000';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Roster photo */}
                        {(() => {
                          const img = getPlayerImage(player.name);
                          return img ? (
                            <img
                              src={img}
                              alt={player.name}
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                objectPosition: 'top',
                                border: `2px solid ${getTraitColor(player.trait)}`,
                                flexShrink: 0,
                                opacity: isAssigned ? 0.5 : 1,
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '34px', height: '34px', borderRadius: '50%',
                              backgroundColor: '#0f111a',
                              border: `2px solid ${getTraitColor(player.trait)}`,
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9px',
                              fontWeight: 900,
                              color: getTraitColor(player.trait),
                            }}>
                              {player.name.substring(0, 2).toUpperCase()}
                            </div>
                          );
                        })()}
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 900 }}>{player.name}</div>
                          <div style={{ fontSize: '9px', color: '#555555', fontWeight: 700, marginTop: '1px' }}>
                            S:{player.speed} P:{player.passing} H:{player.shooting} D:{player.defense}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {isAssigned ? (
                          <span style={{
                            fontSize: '8px', fontWeight: 900, color: '#888888',
                            textTransform: 'uppercase', backgroundColor: '#dddddd',
                            padding: '2px 5px', border: '1px solid #bbbbbb',
                          }}>
                            {slotOf}
                          </span>
                        ) : fit !== null ? (
                          <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end', marginTop: '2px' }}>
                            {[1, 2, 3].map(s => (
                              <div key={s} style={{
                                width: '7px', height: '7px', borderRadius: '50%',
                                backgroundColor: s <= fit ? FIT_COLOR[fit] : '#dddddd',
                                border: '1px solid #000000',
                              }} />
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '8px', color: '#aaaaaa', fontWeight: 700, textTransform: 'uppercase' }}>
                            {getNaturalSlot(player)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Position multipliers legend */}
          <div className="glass-panel" style={{ padding: '12px' }}>
            <h4 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>
              Position Multipliers
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {(Object.keys(POSITION_MULTIPLIERS) as PositionSlot[]).map(slot => (
                <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 900, minWidth: '28px' }}>{slot}</span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {Object.entries(POSITION_MULTIPLIERS[slot]).map(([stat, mult]) =>
                      mult === 1.0 ? null : (
                        <span key={stat} style={{
                          fontSize: '9px', fontWeight: 800,
                          color: mult > 1 ? '#006b2b' : '#cc0000',
                          backgroundColor: mult > 1 ? 'rgba(0,107,43,0.1)' : 'rgba(204,0,0,0.1)',
                          padding: '1px 4px',
                          border: `1px solid ${mult > 1 ? '#006b2b' : '#cc0000'}`,
                        }}>
                          {stat.slice(0, 3).toUpperCase()} {mult > 1 ? '+' : ''}{Math.round((mult - 1) * 100)}%
                        </span>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleConfirm}
            disabled={!isComplete}
            className="btn-primary"
            style={{ justifyContent: 'center', fontSize: '20px', letterSpacing: '2px', padding: '14px' }}
          >
            KICK OFF ({filledCount}/5)
          </button>
          <button onClick={onBack} className="btn-secondary" style={{ justifyContent: 'center', padding: '10px' }}>
            ← Back to Locker
          </button>
        </div>
      </div>
    </div>
  );
}
