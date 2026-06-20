'use client';

import React, { useState } from 'react';
import { BrowserProvider } from 'ethers';
import Dashboard from '../components/Dashboard';
import PitchView from '../components/PitchView';
import Shop from '../components/Shop';
import MatchView from '../components/match/MatchView';
import { Player } from '../types/game';

const NFT_CONTRACT_ADDRESS = '0xed41C47315306e8fE56A330D1e938b257FAC7aE5';
const MARKETPLACE_CONTRACT_ADDRESS = '0x414D4901abaF7d100a79D5ee10316BCe3037d9C3';

type View = 'dashboard' | 'pitch' | 'shop' | 'match';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [activeSquad, setActiveSquad] = useState<Player[]>([]);

  // Shared wallet state — set by Dashboard, passed to MatchView
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const handleStartMatch = (squad: Player[]) => {
    setActiveSquad(squad);
    setActiveView('pitch');
  };

  const handleWalletConnect = (address: string, p: BrowserProvider) => {
    setWalletAddress(address);
    setProvider(p);
  };

  return (
    <main>
      {activeView !== 'pitch' && (
        <nav style={{
          display: 'flex', justifyContent: 'center',
          gap: '8px', padding: '20px 20px 0',
        }}>
          {([
            { id: 'dashboard', label: 'My Squad' },
            { id: 'match',     label: '⚔ Match' },
            { id: 'shop',      label: 'Agent Shop' },
          ] as { id: View; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              style={{
                padding: '10px 28px',
                borderRadius: '8px',
                border: activeView === id
                  ? '1.5px solid var(--monad-purple)'
                  : '1.5px solid rgba(255,255,255,0.08)',
                backgroundColor: activeView === id
                  ? 'rgba(138, 43, 226, 0.15)'
                  : 'transparent',
                color: activeView === id ? '#fff' : '#8b949e',
                fontSize: '13px', fontWeight: 700, letterSpacing: '1px',
                textTransform: 'uppercase', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      )}

      {activeView === 'dashboard' && (
        <Dashboard
          onStartMatch={handleStartMatch}
          onGoToShop={() => setActiveView('shop')}
          onWalletConnect={handleWalletConnect}
        />
      )}
      {activeView === 'pitch' && (
        <PitchView squad={activeSquad} onBackToDashboard={() => setActiveView('dashboard')} />
      )}
      {activeView === 'shop' && (
        <Shop
          nftContractAddress={NFT_CONTRACT_ADDRESS}
          marketplaceAddress={MARKETPLACE_CONTRACT_ADDRESS}
        />
      )}
      {activeView === 'match' && (
        <MatchView walletAddress={walletAddress} provider={provider} />
      )}
    </main>
  );
}
