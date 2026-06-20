'use client';

import React, { useState, useEffect } from 'react';
import { Player, PersonaTrait } from '../types/game';
import {
  isMetaMaskAvailable,
  connectMetaMask,
  mintPlayerNFT,
  getMockPlayers,
  saveMockPlayer,
  clearMockPlayers,
  checkNameTaken,
} from '../utils/web3';
import { Wallet, ShieldAlert, Cpu, Sparkles, Plus, Trash2, Trophy, Loader2, Tag } from 'lucide-react';
import { getPlayerImage } from '../utils/playerImages';
import { BrowserProvider } from 'ethers';

interface DashboardProps {
  onStartMatch: (squad: Player[]) => void;
  onGoToShop?: () => void;
}

export default function Dashboard({ onStartMatch, onGoToShop }: DashboardProps) {
  // Wallet state
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [contractAddress, setContractAddress] = useState<string>('0xed41C47315306e8fE56A330D1e938b257FAC7aE5');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [isMMInstalled, setIsMMInstalled] = useState<boolean>(false);
  const [web3Connected, setWeb3Connected] = useState<boolean>(false);

  // UI state
  const [searchName, setSearchName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedProfile, setGeneratedProfile] = useState<any>(null);
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [txLog, setTxLog] = useState<{ hash: string; status: string; latency?: number } | null>(null);
  const [isMinting, setIsMinting] = useState<boolean>(false);

  useEffect(() => {
    setIsMMInstalled(isMetaMaskAvailable());
    // Load local storage players on start
    setMyPlayers(getMockPlayers());
  }, []);

  const handleConnectWallet = async () => {
    try {
      const { address, provider: p } = await connectMetaMask();
      setWalletAddress(address);
      setProvider(p);
      setWeb3Connected(true);
    } catch (e: any) {
      alert(e.message || "Failed to connect wallet.");
    }
  };

  const handleGeneratePlayer = async () => {
    if (!searchName.trim()) return;
    setIsGenerating(true);
    setGeneratedProfile(null);
    setTxLog(null);
    try {
      // Check on-chain uniqueness before spending an LLM call
      if (web3Connected && provider) {
        const { taken, tokenId } = await checkNameTaken(provider, contractAddress, searchName.trim());
        if (taken) {
          alert(`"${searchName.trim()}" is already a 1-of-1 agent on chain (Token #${tokenId}). Only one can ever exist — find them in the Agent Shop.`);
          setIsGenerating(false);
          return;
        }
      }
      const res = await fetch(`/api/players?name=${encodeURIComponent(searchName.trim())}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedProfile(data);
    } catch (e: any) {
      alert(e.message || "Error generating player profile.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMintPlayer = async () => {
    if (!generatedProfile) return;
    setIsMinting(true);
    setTxLog(null);

    const name = generatedProfile.name;
    const trait = generatedProfile.trait as PersonaTrait;
    const { speed, passing, shooting, defense, stamina } = generatedProfile;

    try {
      if (web3Connected && provider) {
        // Real On-Chain Mint
        setTxLog({ hash: "Pending...", status: "Initiating MetaMask Transaction..." });
        const { txHash, tokenId } = await mintPlayerNFT(
          provider,
          contractAddress,
          name,
          trait,
          speed,
          passing,
          shooting,
          defense,
          stamina
        );
        
        const newPlayer: Player = {
          id: `onchain_${tokenId}`,
          tokenId,
          name,
          side: 'red', // Will be placed in team
          speed,
          passing,
          shooting,
          defense,
          stamina,
          currentStamina: 100,
          trait,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          state: 'idle',
          targetX: 0,
          targetY: 0,
          hasBall: false,
          timeSinceLastAction: 0,
          goals: 0,
          assists: 0
        };

        saveMockPlayer(newPlayer);
        setMyPlayers(getMockPlayers());
        setTxLog({ 
          hash: txHash, 
          status: "Confirmed on Monad Testnet! Parallel execution completed." 
        });
      } else {
        // Mock Sandbox Mint with parallel-execution simulation
        setTxLog({ hash: "Generating mock transaction...", status: "Routing through Parallel EVM Pipeline..." });
        
        // Wait 800ms to simulate Monad's rapid sub-second block confirmation
        await new Promise(resolve => setTimeout(resolve, 800));

        const mockId = Math.floor(Math.random() * 1000000);
        const mockHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        
        const newPlayer: Player = {
          id: `mock_${mockId}`,
          tokenId: mockId,
          name,
          side: 'red',
          speed,
          passing,
          shooting,
          defense,
          stamina,
          currentStamina: 100,
          trait,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          state: 'idle',
          targetX: 0,
          targetY: 0,
          hasBall: false,
          timeSinceLastAction: 0,
          goals: 0,
          assists: 0
        };

        saveMockPlayer(newPlayer);
        setMyPlayers(getMockPlayers());
        setTxLog({ 
          hash: mockHash, 
          status: "Confirmed on Monad Sandbox!",
          latency: 48 // 48ms transaction completion!
        });
      }
      setGeneratedProfile(null);
      setSearchName('');
    } catch (e: any) {
      alert(e.message || "Failed to mint NFT.");
      setTxLog(null);
    } finally {
      setIsMinting(false);
    }
  };

  const handleAutoFill = () => {
    // Fill with top stars
    const mockStars: Player[] = [
      { id: 'mock_m1', name: "Lionel Messi", side: 'red', speed: 84, passing: 96, shooting: 92, defense: 38, stamina: 82, currentStamina: 100, trait: 'Calculative', x: 0, y: 0, vx: 0, vy: 0, state: 'idle', targetX: 0, targetY: 0, hasBall: false, timeSinceLastAction: 0, goals: 0, assists: 0 },
      { id: 'mock_m2', name: "Erling Haaland", side: 'red', speed: 89, passing: 65, shooting: 94, defense: 45, stamina: 88, currentStamina: 100, trait: 'Maverick', x: 0, y: 0, vx: 0, vy: 0, state: 'idle', targetX: 0, targetY: 0, hasBall: false, timeSinceLastAction: 0, goals: 0, assists: 0 },
      { id: 'mock_m3', name: "Jude Bellingham", side: 'red', speed: 83, passing: 86, shooting: 85, defense: 80, stamina: 92, currentStamina: 100, trait: 'Team-First', x: 0, y: 0, vx: 0, vy: 0, state: 'idle', targetX: 0, targetY: 0, hasBall: false, timeSinceLastAction: 0, goals: 0, assists: 0 },
      { id: 'mock_m4', name: "Kylian Mbappé", side: 'red', speed: 97, passing: 82, shooting: 90, defense: 36, stamina: 89, currentStamina: 100, trait: 'Arrogant', x: 0, y: 0, vx: 0, vy: 0, state: 'idle', targetX: 0, targetY: 0, hasBall: false, timeSinceLastAction: 0, goals: 0, assists: 0 },
      { id: 'mock_m5', name: "Bukayo Saka", side: 'red', speed: 86, passing: 84, shooting: 82, defense: 65, stamina: 90, currentStamina: 100, trait: 'Panic-Prone', x: 0, y: 0, vx: 0, vy: 0, state: 'idle', targetX: 0, targetY: 0, hasBall: false, timeSinceLastAction: 0, goals: 0, assists: 0 }
    ];

    clearMockPlayers();
    mockStars.forEach(saveMockPlayer);
    setMyPlayers(getMockPlayers());
  };

  const handleClearSquad = () => {
    clearMockPlayers();
    setMyPlayers([]);
  };

  const handleStartGame = () => {
    if (myPlayers.length < 5) {
      alert("You need at least 5 minted players in your locker to form a squad!");
      return;
    }
    // Take first 5 players for the kickoff
    onStartMatch(myPlayers.slice(0, 5));
  };

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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ 
          fontFamily: 'var(--font-manga)', 
          fontSize: '84px', 
          letterSpacing: '3px',
          color: 'var(--fifa-green)',
          textShadow: '6px 6px 0px #000000',
          WebkitTextStroke: '2.5px #000000',
          marginBottom: '15px',
          lineHeight: 0.95
        }}>
          PROJECT MANGA-MON
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#000000', 
          maxWidth: '650px', 
          margin: '0 auto',
          backgroundColor: 'var(--fifa-gold)',
          border: '3px solid #000000',
          padding: '8px 16px',
          display: 'inline-block',
          boxShadow: '4px 4px 0px #000000',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Deconstruct real-world football giants, map their personas via generative AI, and mint them as dynamic NFTs on Monad.
        </p>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '50px' }}>
        
        {/* Left Column: Wallet Connect & AI Generator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Web3 Wallet Configuration */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wallet style={{ color: 'var(--monad-purple)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Monad Blockchain Connection</h3>
              </div>
              <span style={{ 
                fontSize: '11px', 
                padding: '3px 8px', 
                borderRadius: '12px', 
                backgroundColor: web3Connected ? 'rgba(0, 143, 58, 0.15)' : 'rgba(0, 0, 0, 0.05)',
                color: web3Connected ? 'var(--fifa-green-text)' : '#555555',
                fontWeight: 800,
                textTransform: 'uppercase',
                border: '1.5px solid #000000'
              }}>
                {web3Connected ? "MetaMask Active" : "Sandbox Mode"}
              </span>
            </div>

            {web3Connected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ backgroundColor: '#ffffff', color: '#000000', padding: '12px', border: '3px solid #000000', borderRadius: '0px', boxShadow: '4px 4px 0px #000000' }}>
                  <p style={{ fontSize: '11px', color: '#555555', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Connected Wallet Address</p>
                  <p style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 'bold', wordBreak: 'break-all' }}>{walletAddress}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#ffffff', display: 'block', marginBottom: '5px', fontWeight: 'bold', textTransform: 'uppercase' }}>Contract Address (Monad Testnet)</label>
                  <input 
                    type="text" 
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      backgroundColor: '#ffffff', 
                      border: '3px solid #000000', 
                      borderRadius: '0px',
                      color: '#000000',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '13px', color: '#333333', lineHeight: 1.5 }}>
                  Connect your MetaMask to deploy/mint direct to Monad Testnet, or play in <strong>Sandbox Mode</strong> with fast instant mock updates.
                </p>
                {isMMInstalled ? (
                  <button onClick={handleConnectWallet} className="btn-primary">
                    Connect MetaMask
                  </button>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    backgroundColor: 'rgba(255, 170, 0, 0.08)', 
                    border: '1px solid rgba(255, 170, 0, 0.2)',
                    padding: '12px',
                    borderRadius: '8px'
                  }}>
                    <ShieldAlert style={{ color: '#ffaa00', flexShrink: 0 }} />
                    <p style={{ fontSize: '12px', color: '#ffaa00' }}>
                      MetaMask extension not detected. Running automatically in offline local sandbox.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Player generator */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu style={{ color: 'var(--neon-cyan)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>LLM Footballer Persona Mapper</h3>
            </div>

            <p style={{ fontSize: '13px', color: '#333333', lineHeight: 1.5 }}>
              Type the name of any top football player. Our AI will analyze their real-world persona and map their stats and comic traits for the simulator.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="e.g. Messi, Haaland, Mbappe, Bellingham..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGeneratePlayer()}
                disabled={isGenerating}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  backgroundColor: '#ffffff', 
                  border: '3px solid #000000', 
                  borderRadius: '0px',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              />
              <button 
                onClick={handleGeneratePlayer} 
                disabled={isGenerating || !searchName.trim()}
                className="btn-primary"
                style={{ padding: '12px 20px' }}
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                Map
              </button>
            </div>

            {/* Generated Profile Preview */}
            {generatedProfile && (
              <div style={{ 
                backgroundColor: '#ffffff', 
                color: '#000000',
                border: `4px solid #000000`,
                borderRadius: '0px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                boxShadow: `8px 8px 0px ${getTraitColor(generatedProfile.trait)}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {(() => {
                      const img = getPlayerImage(generatedProfile.name);
                      return img ? (
                        <img
                          src={img}
                          alt={generatedProfile.name}
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            objectPosition: 'top',
                            border: `4px solid ${getTraitColor(generatedProfile.trait)}`,
                            boxShadow: `4px 4px 0px #000000`,
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          backgroundColor: '#0f111a',
                          border: `4px solid ${getTraitColor(generatedProfile.trait)}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: 900,
                          color: getTraitColor(generatedProfile.trait),
                          flexShrink: 0,
                        }}>
                          {(generatedProfile.name as string).substring(0, 2).toUpperCase()}
                        </div>
                      );
                    })()}
                    <div>
                      <h4 style={{ fontSize: '20px', fontWeight: 800 }}>{generatedProfile.name}</h4>
                      <span style={{
                        fontSize: '12px',
                        color: getTraitColor(generatedProfile.trait),
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        Trait: {generatedProfile.trait}
                      </span>
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#222222', lineHeight: 1.4 }}>
                  &ldquo;{generatedProfile.reasoning}&rdquo;
                </p>

                {/* Stats list */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ backgroundColor: '#f0f2f5', padding: '8px', border: '2px solid #000000', borderRadius: '0px' }}>
                    <div style={{ fontSize: '10px', color: '#555555', fontWeight: 'bold', marginBottom: '4px' }}>SPD</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>{generatedProfile.speed}</div>
                  </div>
                  <div style={{ backgroundColor: '#f0f2f5', padding: '8px', border: '2px solid #000000', borderRadius: '0px' }}>
                    <div style={{ fontSize: '10px', color: '#555555', fontWeight: 'bold', marginBottom: '4px' }}>PAS</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>{generatedProfile.passing}</div>
                  </div>
                  <div style={{ backgroundColor: '#f0f2f5', padding: '8px', border: '2px solid #000000', borderRadius: '0px' }}>
                    <div style={{ fontSize: '10px', color: '#555555', fontWeight: 'bold', marginBottom: '4px' }}>SHT</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>{generatedProfile.shooting}</div>
                  </div>
                  <div style={{ backgroundColor: '#f0f2f5', padding: '8px', border: '2px solid #000000', borderRadius: '0px' }}>
                    <div style={{ fontSize: '10px', color: '#555555', fontWeight: 'bold', marginBottom: '4px' }}>DEF</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>{generatedProfile.defense}</div>
                  </div>
                  <div style={{ backgroundColor: '#f0f2f5', padding: '8px', border: '2px solid #000000', borderRadius: '0px' }}>
                    <div style={{ fontSize: '10px', color: '#555555', fontWeight: 'bold', marginBottom: '4px' }}>STM</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#000000' }}>{generatedProfile.stamina}</div>
                  </div>
                </div>

                <button onClick={handleMintPlayer} disabled={isMinting} className="btn-primary" style={{ alignSelf: 'stretch', justifyContent: 'center' }}>
                  {isMinting ? <Loader2 className="animate-spin" /> : <Plus size={16} />}
                  {web3Connected ? "Mint on Monad Testnet" : "Mint Dynamic NFT (Sandbox)"}
                </button>
              </div>
            )}

            {/* Transaction feedback logs */}
            {txLog && (
              <div style={{ 
                backgroundColor: '#ffffff', 
                border: '3px solid #000000', 
                padding: '15px', 
                borderRadius: '0px',
                boxShadow: '4px 4px 0px #000000',
                fontSize: '12px',
                color: '#000000'
              }}>
                <p style={{ color: '#000000', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Transaction Log:</p>
                <p style={{ color: 'var(--fifa-green-text)', fontWeight: 'bold', marginBottom: '8px' }}>{txLog.status}</p>
                {txLog.latency && (
                  <p style={{ color: '#d47a00', marginBottom: '8px' }}>Confirmation Latency: <strong>{txLog.latency}ms</strong></p>
                )}
                <p style={{ color: '#555555', fontFamily: 'monospace', wordBreak: 'break-all' }}>Hash: {txLog.hash}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Squad Locker */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '520px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trophy style={{ color: 'var(--monad-purple)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Your Player Locker ({myPlayers.length}/5 minimum)</h3>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {myPlayers.length === 0 && (
                <button onClick={handleAutoFill} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>
                  Auto-Fill Stars
                </button>
              )}
              {myPlayers.length > 0 && (
                <button onClick={handleClearSquad} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', color: '#ff3b30', borderColor: 'rgba(255, 59, 48, 0.2)' }}>
                  Clear Locker
                </button>
              )}
            </div>
          </div>

          {/* List of squad players */}
          {myPlayers.length === 0 ? (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              border: '3px dashed #000000',
              borderRadius: '0px',
              padding: '40px',
              color: '#333333',
              textAlign: 'center',
              backgroundColor: '#ffffff'
            }}>
              <Cpu size={40} style={{ marginBottom: '15px', color: '#000000' }} />
              <p style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Locker is empty.</p>
              <p style={{ fontSize: '12px', maxWidth: '300px', color: '#555555' }}>
                Use the generator on the left to map real-world superstars, or click &ldquo;Auto-Fill Stars&rdquo; to populate a mock team.
              </p>
            </div>
          ) : (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              maxHeight: '380px', 
              overflowY: 'auto',
              paddingRight: '5px'
            }}>
              {myPlayers.map((player, index) => (
                <div 
                  key={player.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    border: '3px solid #000000',
                    borderLeft: `10px solid ${getTraitColor(player.trait)}`,
                    borderRadius: '0px',
                    padding: '12px 16px',
                    boxShadow: '4px 4px 0px #000000'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Player photo or trait circle fallback */}
                    {(() => {
                      const img = getPlayerImage(player.name);
                      return img ? (
                        <img
                          src={img}
                          alt={player.name}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            objectPosition: 'top',
                            border: `3px solid ${getTraitColor(player.trait)}`,
                            boxShadow: `0 0 10px ${getTraitColor(player.trait)}60`,
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: '#0f111a',
                          border: `3px solid ${getTraitColor(player.trait)}`,
                          boxShadow: `0 0 10px ${getTraitColor(player.trait)}60`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 900,
                          color: getTraitColor(player.trait),
                          flexShrink: 0,
                        }}>
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                      );
                    })()}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{player.name}</div>
                      <div style={{ fontSize: '11px', color: '#555555', marginTop: '2px' }}>
                        Pos: {index === 0 ? 'GK' : index === 1 ? 'DF Left' : index === 2 ? 'DF Right' : index === 3 ? 'MF' : 'FW'} | Trait: <strong style={{ color: getTraitColor(player.trait) }}>{player.trait}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Stats summary */}
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#000000', fontWeight: 'bold' }}>
                      <span>S:{player.speed}</span>
                      <span>P:{player.passing}</span>
                      <span>H:{player.shooting}</span>
                      <span>D:{player.defense}</span>
                    </div>

                    <span style={{ fontSize: '11px', color: '#333333', fontWeight: 'bold' }}>
                      Token #{player.tokenId ? player.tokenId.toString().slice(-4) : 'MOCK'}
                    </span>

                    {onGoToShop && (
                      <button
                        onClick={onGoToShop}
                        title="List this agent for sale in the Shop"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Tag size={11} /> Sell
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action button to pitch */}
          <button 
            onClick={handleStartGame}
            disabled={myPlayers.length < 5}
            className="btn-primary" 
            style={{ 
              alignSelf: 'stretch', 
              justifyContent: 'center', 
              fontSize: '18px',
              fontFamily: 'var(--font-manga)',
              padding: '15px',
              letterSpacing: '2px'
            }}
          >
            ENTER PITCH ({myPlayers.length}/5)
          </button>
        </div>

      </div>

      <div className="glass-panel" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px', 
        background: '#ffffff',
        borderColor: '#000000',
        border: '3px solid #000000',
        borderRadius: '0px',
        boxShadow: '4px 4px 0px #000000',
        color: '#000000'
      }}>
        <Cpu size={40} style={{ color: 'var(--border-black)', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>On-Chain Dynamic SVGs and Metadata</h4>
          <p style={{ fontSize: '13px', color: '#333333', lineHeight: 1.4 }}>
            Manga-Mon characters store stats directly in EVM memory. When minted, the Solidity contract dynamically constructs an SVG image showing their current speed, passing power, goals, and glow-aura directly within the metadata. When matches resolve, stats update directly on-chain.
          </p>
        </div>
      </div>

    </div>
  );
}
