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
  const { player, type, goalProbability } = event;

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
    if (type === 'clutch_shot') return `CLUTCH SHOT! (PROBABILITY: ${goalProbability}%)`;
    if (type === 'setup') return "THE PERFECT ASSIST SETUP!";
    return "TACTICAL DEFENSIVE BREAKDOWN!";
  };

  return (
    <div className="manga-panel-container">
      
      {/* 1. Diagonal Left Slide (Stark Manga Artwork / PFP) */}
      <div className="manga-slice-left" style={{ borderRight: `10px solid ${auraColor}` }}>
        <div className="speedlines-bg" />
        
        {/* SVG Player Comic Illustration */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '70%',
          height: '70%',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <svg viewBox="0 0 200 200" width="100%" height="100%" className={`glow-aura-${player.trait.toLowerCase()}`}>
            {/* Background elements */}
            <path d="M 10 100 L 190 100 M 100 10 L 100 190" stroke="rgba(0,0,0,0.15)" strokeWidth="4" strokeDasharray="5,5" />
            <circle cx="100" cy="100" r="85" fill="none" stroke="#000000" strokeWidth="6" />
            
            {/* Outer neon ring */}
            <circle cx="100" cy="100" r="81" fill="none" stroke={auraColor} strokeWidth="3" />
            
            {/* Manga Stylized Abstract Figure Face / Silhouette */}
            {/* Halftone / Heavy shadow block face */}
            <path d="M 60 160 C 60 160, 50 110, 75 70 C 85 55, 115 55, 125 70 C 150 110, 140 160, 140 160 Z" fill="#000000" />
            
            {/* Styled eyes (glowing aura color) */}
            <path d="M 80 85 L 95 90 M 120 85 L 105 90" stroke={auraColor} strokeWidth="4" strokeLinecap="round" />
            
            {/* Energy flows / Spikes (Blue Lock visual signature) */}
            <path d="M 75 70 L 60 50 M 125 70 L 140 50 M 100 55 L 100 30" stroke="#000000" strokeWidth="5" strokeLinecap="round" />
            <path d="M 75 70 L 63 53 M 125 70 L 137 53 M 100 55 L 100 33" stroke={auraColor} strokeWidth="2.5" strokeLinecap="round" />

            {/* Dynamic wind sweeps */}
            <path d="M 30 50 Q 80 40 130 30" fill="none" stroke="#000000" strokeWidth="3" />
            <path d="M 50 170 Q 100 180 150 170" fill="none" stroke="#000000" strokeWidth="3" />

            {/* Ink Splatters / Action dots */}
            <circle cx="50" cy="80" r="4" fill="#000000" />
            <circle cx="150" cy="110" r="3" fill="#000000" />
            <circle cx="130" cy="150" r="5" fill="#000000" />
          </svg>
        </div>
      </div>

      {/* 2. Diagonal Right Slide (Dialogue bubble and controls) */}
      <div className="manga-slice-right" style={{ borderLeft: `2px solid rgba(255,255,255,0.05)` }}>
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '80%',
          height: '80%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '30px',
          zIndex: 20
        }}>
          
          {/* Action Callout Title (Heavy Bebas font) */}
          <h2 style={{
            fontFamily: 'var(--font-manga)',
            fontSize: '36px',
            color: '#ffffff',
            letterSpacing: '2px',
            textAlign: 'center',
            textShadow: `0 0 10px ${auraColor}`
          }}>
            {getEventTitle()}
          </h2>

          {/* Thought bubble */}
          <div style={{ position: 'relative', height: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {isLoading ? (
              <div className="manga-speech-bubble" style={{ opacity: 1, transform: 'scale(1)' }}>
                <span style={{ fontSize: '15px', color: '#555', fontFamily: 'monospace', letterSpacing: '1px' }}>
                  THINKING OPTIMAL VECTOR...
                </span>
              </div>
            ) : (
              <div className="manga-speech-bubble" style={{ opacity: 1, transform: 'scale(1)' }}>
                &ldquo;{dialogue}&rdquo;
              </div>
            )}
          </div>

          {/* Player Identity Tag */}
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {player.name}
            </h3>
            <p style={{ 
              fontSize: '14px', 
              color: auraColor, 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              letterSpacing: '2px',
              marginTop: '4px' 
            }}>
              AGENT TRAIT: {player.trait}
            </p>
          </div>

          {/* Dismiss Button */}
          <button 
            onClick={onClose} 
            disabled={isLoading}
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              border: '4px solid #000000',
              padding: '12px 30px',
              fontSize: '18px',
              fontWeight: 'bold',
              borderRadius: '0px', // Manga block style
              cursor: 'pointer',
              boxShadow: '4px 4px 0px rgba(255, 255, 255, 0.2)',
              fontFamily: 'var(--font-manga)',
              letterSpacing: '1px',
              transition: 'transform 0.1s ease',
              marginTop: '10px'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'translate(2px, 2px)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'translate(0px, 0px)'}
          >
            RESUME MATCH
          </button>

        </div>
      </div>

    </div>
  );
}
