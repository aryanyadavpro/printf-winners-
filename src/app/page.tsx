'use client';

import React, { useState } from 'react';
import Dashboard from '../components/Dashboard';
import FormationPicker from '../components/FormationPicker';
import PitchView from '../components/PitchView';
import Shop from '../components/Shop';
import { Player } from '../types/game';

// Update these after deploying your contracts
const NFT_CONTRACT_ADDRESS = '0xed41C47315306e8fE56A330D1e938b257FAC7aE5';
const MARKETPLACE_CONTRACT_ADDRESS = '0x414D4901abaF7d100a79D5ee10316BCe3037d9C3';

type View = 'dashboard' | 'formation' | 'pitch' | 'shop';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [pendingSquad, setPendingSquad] = useState<Player[]>([]);
  const [activeSquad, setActiveSquad] = useState<Player[]>([]);

  // Dashboard → Formation picker
  const handleStartMatch = (squad: Player[]) => {
    setPendingSquad(squad);
    setActiveView('formation');
  };

  // Formation picker → Pitch (players already have position bonuses applied)
  const handleFormationConfirm = (players: Player[]) => {
    setActiveSquad(players);
    setActiveView('pitch');
  };

  const handleBackToDashboard = () => {
    setActiveView('dashboard');
  };

  return (
    <main>
      {/* Global nav — hidden during active match and formation */}
      {activeView !== 'pitch' && activeView !== 'formation' && (
        <nav style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          padding: '20px 20px 0',
        }}>
          {(['dashboard', 'shop'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                padding: '10px 28px',
                borderRadius: '8px',
                border: activeView === view
                  ? '1.5px solid var(--monad-purple)'
                  : '1.5px solid rgba(255,255,255,0.08)',
                backgroundColor: activeView === view
                  ? 'rgba(138, 43, 226, 0.15)'
                  : 'transparent',
                color: activeView === view ? '#fff' : '#8b949e',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {view === 'dashboard' ? 'My Squad' : 'Agent Shop'}
            </button>
          ))}
        </nav>
      )}

      {activeView === 'dashboard' && (
        <Dashboard onStartMatch={handleStartMatch} onGoToShop={() => setActiveView('shop')} />
      )}
      {activeView === 'formation' && (
        <FormationPicker
          squad={pendingSquad}
          onConfirm={handleFormationConfirm}
          onBack={() => setActiveView('dashboard')}
        />
      )}
      {activeView === 'pitch' && (
        <PitchView squad={activeSquad} onBackToDashboard={handleBackToDashboard} />
      )}
      {activeView === 'shop' && (
        <Shop
          nftContractAddress={NFT_CONTRACT_ADDRESS}
          marketplaceAddress={MARKETPLACE_CONTRACT_ADDRESS}
        />
      )}
    </main>
  );
}
