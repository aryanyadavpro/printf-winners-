'use client';

import React from 'react';
import { MangaEvent } from '../types/game';
import { getPlayerImage } from '../utils/playerImages';

interface MangaOverlayProps {
  event: MangaEvent;
  dialogue: string;
  isLoading: boolean;
  onClose: () => void;
}

export default function MangaOverlay({ event, dialogue, isLoading, onClose }: MangaOverlayProps) {
  const { player, type } = event;

  // Determine styling color depending on trait
  const getTraitColor = (trait: string) => {
    switch (trait) {
      case 'Arrogant': return 'var(--color-arrogant)';
      case 'Calculative': return 'var(--neon-cyan)';
      case 'Panic-Prone': return 'var(--color-panic)';
      case 'Maverick': return 'var(--color-maverick)';
      case 'Team-First': return 'var(--color-team)';
      default: return '#ffffff';
    }
  };

  const auraColor = getTraitColor(player.trait);
  const playerImg = getPlayerImage(player.name);
  const teamColor = player.side === 'red' ? '#FF0055' : '#0066FF';

  const getEventTitle = () => {
    if (type === 'clutch_shot') return 'CLUTCH SHOT!';
    if (type === 'setup') return 'PERFECT SETUP!';
    return 'BREAKDOWN!';
  };

  return (
    <div className="mini-manga-panel" style={{ borderLeft: `8px solid ${auraColor}` }}>
      {/* 1. Left slice — real player photo or SVG silhouette fallback */}
      <div className="mini-manga-slice-left" style={{ position: 'relative', overflow: 'hidden' }}>
        {playerImg ? (
          <>
            <img
              src={playerImg}
              alt={player.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
                display: 'block',
              }}
            />
            {/* Trait aura overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(135deg, ${auraColor}30 0%, transparent 60%)`,
              pointerEvents: 'none',
            }} />
            {/* Team colour strip at bottom */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '6px', backgroundColor: teamColor,
            }} />
          </>
        ) : (
          <svg viewBox="0 0 200 200" width="100%" height="100%" className={`glow-aura-${player.trait.toLowerCase()}`}>
            <path d="M 10 100 L 190 100 M 100 10 L 100 190" stroke="rgba(255,255,255,0.15)" strokeWidth="4" strokeDasharray="5,5" />
            <circle cx="100" cy="100" r="85" fill="none" stroke="#ffffff" strokeWidth="6" />
            <circle cx="100" cy="100" r="81" fill="none" stroke={auraColor} strokeWidth="3" />
            <path d="M 60 160 C 60 160, 50 110, 75 70 C 85 55, 115 55, 125 70 C 150 110, 140 160, 140 160 Z" fill="#ffffff" />
            <path d="M 80 85 L 95 90 M 120 85 L 105 90" stroke={auraColor} strokeWidth="6" strokeLinecap="round" />
            <path d="M 75 70 L 60 50 M 125 70 L 140 50 M 100 55 L 100 30" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
            <path d="M 75 70 L 63 53 M 125 70 L 137 53 M 100 55 L 100 33" stroke={auraColor} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* 2. Content Details on the Right */}
      <div className="mini-manga-slice-right">
        {/* Team badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: teamColor,
          color: '#ffffff',
          fontSize: '8px',
          fontWeight: 900,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          padding: '2px 6px',
          marginBottom: '3px',
          border: '1.5px solid #000000',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            backgroundColor: '#ffffff', display: 'inline-block',
          }} />
          {player.side === 'red' ? 'YOUR TEAM' : 'OPPONENT'}
        </div>

        <h4 style={{
          fontFamily: 'var(--font-manga)',
          fontSize: '17px',
          color: auraColor,
          letterSpacing: '1px',
          margin: 0,
          lineHeight: 1,
          textShadow: `0 0 4px ${auraColor}40`
        }}>
          {getEventTitle()}
        </h4>
        <h5 style={{
          fontSize: '12px',
          fontWeight: 900,
          textTransform: 'uppercase',
          margin: '2px 0 0 0',
          color: '#000000',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {player.name}
        </h5>
        <div style={{
          fontSize: '9px',
          color: '#555555',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginTop: '1px'
        }}>
          {player.trait}
        </div>
      </div>
    </div>
  );
}
