'use client';

import React from 'react';
import { MangaEvent } from '../types/game';

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

  // Return a clean description of the event for headers
  const getEventTitle = () => {
    if (type === 'clutch_shot') return 'CLUTCH SHOT!';
    if (type === 'setup') return 'PERFECT SETUP!';
    return 'BREAKDOWN!';
  };

  return (
    <div className="mini-manga-panel" style={{ borderLeft: `8px solid ${auraColor}` }}>
      {/* 1. Sliced Left Side (Stark Manga Artwork SVG) */}
      <div className="mini-manga-slice-left">
        <svg viewBox="0 0 200 200" width="100%" height="100%" className={`glow-aura-${player.trait.toLowerCase()}`} style={{ zIndex: 10 }}>
          {/* Background grid lines */}
          <path d="M 10 100 L 190 100 M 100 10 L 100 190" stroke="rgba(255,255,255,0.15)" strokeWidth="4" strokeDasharray="5,5" />
          <circle cx="100" cy="100" r="85" fill="none" stroke="#ffffff" strokeWidth="6" />
          
          {/* Outer neon ring */}
          <circle cx="100" cy="100" r="81" fill="none" stroke={auraColor} strokeWidth="3" />
          
          {/* Silhouette Face */}
          <path d="M 60 160 C 60 160, 50 110, 75 70 C 85 55, 115 55, 125 70 C 150 110, 140 160, 140 160 Z" fill="#ffffff" />
          
          {/* Eyes (neon) */}
          <path d="M 80 85 L 95 90 M 120 85 L 105 90" stroke={auraColor} strokeWidth="6" strokeLinecap="round" />
          
          {/* Spikes / Energy */}
          <path d="M 75 70 L 60 50 M 125 70 L 140 50 M 100 55 L 100 30" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
          <path d="M 75 70 L 63 53 M 125 70 L 137 53 M 100 55 L 100 33" stroke={auraColor} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* 2. Content Details on the Right */}
      <div className="mini-manga-slice-right">
        <h4 style={{
          fontFamily: 'var(--font-manga)',
          fontSize: '18px',
          color: auraColor,
          letterSpacing: '1px',
          margin: 0,
          lineHeight: 1,
          textShadow: `0 0 4px ${auraColor}40`
        }}>
          {getEventTitle()}
        </h4>
        <h5 style={{ 
          fontSize: '13px', 
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
          TRAIT: {player.trait}
        </div>
      </div>
    </div>
  );
}
