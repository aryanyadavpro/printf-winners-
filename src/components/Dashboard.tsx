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
import { BrowserProvider } from 'ethers';

interface DashboardProps {
  onStartMatch: (squad: Player[]) => void;
  onGoToShop?: () => void;
}

export default function Dashboard({ onStartMatch, onGoToShop }: DashboardProps) {
  // Wallet state
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [contractAddress, setContractAddress] = useState<string>('0x9aE7A8A31D0cf6c429c629532822a1017c603b55'); // Example address
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
          fontSize: '72px', 
          letterSpacing: '3px',
          textShadow: '0 0 20px rgba(138, 43, 226, 0.7)',
          background: 'linear-gradient(135deg, #fff 30%, var(--monad-purple) 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '10px'
        }}>
          PROJECT MANGA-MON
        </h1>
        <p style={{ fontSize: '18px', color: '#8b949e', maxWidth: '600px', margin: '0 auto' }}>
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
                backgroundColor: web3Connected ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: web3Connected ? 'var(--neon-cyan)' : '#8b949e',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                {web3Connected ? "MetaMask Active" : "Sandbox Mode"}
              </span>
            </div>

            {web3Connected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ backgroundColor: '#07090f', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <p style={{ fontSize: '12px', color: '#8b949e' }}>Connected Wallet Address</p>
                  <p style={{ fontSize: '14px', fontFamily: 'monospace', color: '#fff', wordBreak: 'break-all' }}>{walletAddress}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '5px' }}>Contract Address (Monad Testnet)</label>
                  <input 
                    type="text" 
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      backgroundColor: '#07090f', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      borderRadius: '6px',
                      color: '#fff',
                      fontFamily: 'monospace',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '13px', color: '#8b949e', lineHeight: 1.5 }}>
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

            <p style={{ fontSize: '13px', color: '#8b949e', lineHeight: 1.5 }}>
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
                  backgroundColor: '#07090f', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px'
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
                backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                border: `1.5px solid ${getTraitColor(generatedProfile.trait)}`,
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                boxShadow: `0 0 15px ${generatedProfile.trait === 'Arrogant' ? 'var(--color-arrogant-glow)' : 
                             generatedProfile.trait === 'Calculative' ? 'var(--neon-cyan-glow)' : 
                             generatedProfile.trait === 'Maverick' ? 'var(--color-maverick-glow)' : 
                             generatedProfile.trait === 'Team-First' ? 'var(--color-team-glow)' : 
                             'var(--color-panic-glow)'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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

                <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#b3b9c9', lineHeight: 1.4 }}>
                  &ldquo;{generatedProfile.reasoning}&rdquo;
                </p>

                {/* Stats list */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ backgroundColor: '#0f111a', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#8b949e', marginBottom: '4px' }}>SPD</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{generatedProfile.speed}</div>
                  </div>
                  <div style={{ backgroundColor: '#0f111a', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#8b949e', marginBottom: '4px' }}>PAS</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{generatedProfile.passing}</div>
                  </div>
                  <div style={{ backgroundColor: '#0f111a', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#8b949e', marginBottom: '4px' }}>SHT</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{generatedProfile.shooting}</div>
                  </div>
                  <div style={{ backgroundColor: '#0f111a', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#8b949e', marginBottom: '4px' }}>DEF</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{generatedProfile.defense}</div>
                  </div>
                  <div style={{ backgroundColor: '#0f111a', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: '#8b949e', marginBottom: '4px' }}>STM</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{generatedProfile.stamina}</div>
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
                backgroundColor: '#07090f', 
                border: '1px solid #1a2035', 
                padding: '15px', 
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                <p style={{ color: '#8b949e', fontWeight: 600, marginBottom: '5px' }}>Transaction Log:</p>
                <p style={{ color: '#00ffcc', marginBottom: '8px' }}>{txLog.status}</p>
                {txLog.latency && (
                  <p style={{ color: '#ffaa00', marginBottom: '8px' }}>Confirmation Latency: <strong>{txLog.latency}ms</strong></p>
                )}
                <p style={{ color: '#8b949e', fontFamily: 'monospace', wordBreak: 'break-all' }}>Hash: {txLog.hash}</p>
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
              border: '2px dashed rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '40px',
              color: '#5d637f',
              textAlign: 'center'
            }}>
              <Cpu size={40} style={{ marginBottom: '15px', color: '#252b45' }} />
              <p style={{ fontSize: '14px', marginBottom: '8px' }}>Locker is empty.</p>
              <p style={{ fontSize: '12px', maxWidth: '300px' }}>
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
                    backgroundColor: '#090b12',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderLeft: `5px solid ${getTraitColor(player.trait)}`,
                    borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Trait circle representation */}
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      backgroundColor: '#0f111a', 
                      border: `3px solid ${getTraitColor(player.trait)}`,
                      boxShadow: `0 0 8px ${getTraitColor(player.trait)}`
                    }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{player.name}</div>
                      <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '2px' }}>
                        Pos: {index === 0 ? 'GK' : index === 1 ? 'DF Left' : index === 2 ? 'DF Right' : index === 3 ? 'MF' : 'FW'} | Trait: <strong style={{ color: getTraitColor(player.trait) }}>{player.trait}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Stats summary */}
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#8b949e' }}>
                      <span>S:{player.speed}</span>
                      <span>P:{player.passing}</span>
                      <span>H:{player.shooting}</span>
                      <span>D:{player.defense}</span>
                    </div>

                    <span style={{ fontSize: '11px', color: '#5d637f' }}>
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

      {/* Dynamic NFT on-chain contract highlight banner */}
      <div className="glass-panel" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px', 
        background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.05) 0%, rgba(0, 255, 255, 0.05) 100%)',
        borderColor: 'rgba(138, 43, 226, 0.15)'
      }}>
        <Cpu size={40} style={{ color: 'var(--monad-purple)', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>On-Chain Dynamic SVGs and Metadata</h4>
          <p style={{ fontSize: '13px', color: '#8b949e', lineHeight: 1.4 }}>
            Manga-Mon characters store stats directly in EVM memory. When minted, the Solidity contract dynamically constructs an SVG image showing their current speed, passing power, goals, and glow-aura directly within the metadata. When matches resolve, stats update directly on-chain.
          </p>
        </div>
      </div>

    </div>
  );
}
