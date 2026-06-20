'use client';

import React, { useState } from 'react';
import Dashboard from '../components/Dashboard';
import PitchView from '../components/PitchView';
import { Player } from '../types/game';

export default function Home() {
  const [activeView, setActiveView] = useState<'dashboard' | 'pitch'>('dashboard');
  const [activeSquad, setActiveSquad] = useState<Player[]>([]);

  const handleStartMatch = (squad: Player[]) => {
    setActiveSquad(squad);
    setActiveView('pitch');
  };

  const handleBackToDashboard = () => {
    setActiveView('dashboard');
  };

  return (
    <main>
      {activeView === 'dashboard' ? (
        <Dashboard onStartMatch={handleStartMatch} />
      ) : (
        <PitchView squad={activeSquad} onBackToDashboard={handleBackToDashboard} />
      )}
    </main>
  );
}
