'use client';

import React, { useState, useEffect } from 'react';
import { Player, PersonaTrait } from '../types/game';
import {
  isMetaMaskAvailable,
  connectMetaMask,
  getMockPlayers,
  saveMockPlayer,
  clearMockPlayers,
} from '../utils/web3';
import { Wallet, ShieldAlert, Trophy, Trash2, Zap, ChevronRight } from 'lucide-react';
import { BrowserProvider } from 'ethers';

interface DashboardProps {
  onStartMatch: (squad: Player[]) => void;
  onWalletConnect?: (address: string, provider: BrowserProvider) => void;
}

const POSITION_LABELS = ['GK', 'DF L', 'DF R', 'MF', 'FW'];

const TRAIT_META: Record<string, { color: string; bg: string }> = {
  'Arrogant':    { color: '#E8001D', bg: '#FFE5E8' },
  'Calculative': { color: '#0033A0', bg: '#E5EBFF' },
  'Panic-Prone': { color: '#555e70', bg: '#eef0f3' },
  'Maverick':    { color: '#9c6e00', bg: '#FFF8E0' },
  'Team-First':  { color: '#00A651', bg: '#E5F7ED' },
};

const DEFAULT_STARS: Player[] = [
  { id:'s1', name:'Lionel Messi',    side:'red', speed:84, passing:96, shooting:92, defense:38, stamina:82, currentStamina:100, trait:'Calculative',  x:0,y:0,vx:0,vy:0,state:'idle',targetX:0,targetY:0,hasBall:false,timeSinceLastAction:0,goals:0,assists:0 },
  { id:'s2', name:'Erling Haaland',  side:'red', speed:89, passing:65, shooting:94, defense:45, stamina:88, currentStamina:100, trait:'Maverick',     x:0,y:0,vx:0,vy:0,state:'idle',targetX:0,targetY:0,hasBall:false,timeSinceLastAction:0,goals:0,assists:0 },
  { id:'s3', name:'Jude Bellingham', side:'red', speed:83, passing:86, shooting:85, defense:80, stamina:92, currentStamina:100, trait:'Team-First',   x:0,y:0,vx:0,vy:0,state:'idle',targetX:0,targetY:0,hasBall:false,timeSinceLastAction:0,goals:0,assists:0 },
  { id:'s4', name:'Kylian Mbappé',   side:'red', speed:97, passing:82, shooting:90, defense:36, stamina:89, currentStamina:100, trait:'Arrogant',     x:0,y:0,vx:0,vy:0,state:'idle',targetX:0,targetY:0,hasBall:false,timeSinceLastAction:0,goals:0,assists:0 },
  { id:'s5', name:'Bukayo Saka',     side:'red', speed:86, passing:84, shooting:82, defense:65, stamina:90, currentStamina:100, trait:'Panic-Prone',  x:0,y:0,vx:0,vy:0,state:'idle',targetX:0,targetY:0,hasBall:false,timeSinceLastAction:0,goals:0,assists:0 },
];

export default function Dashboard({ onStartMatch, onWalletConnect }: DashboardProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider]           = useState<BrowserProvider | null>(null);
  const [isMMInstalled, setIsMMInstalled] = useState(false);
  const [web3Connected, setWeb3Connected] = useState(false);
  const [myPlayers, setMyPlayers]         = useState<Player[]>([]);

  useEffect(() => {
    setIsMMInstalled(isMetaMaskAvailable());
    const saved = getMockPlayers();
    setMyPlayers(saved.length > 0 ? saved : DEFAULT_STARS);
    if (saved.length === 0) DEFAULT_STARS.forEach(saveMockPlayer);
  }, []);

  const handleConnectWallet = async () => {
    try {
      const { address, provider: p } = await connectMetaMask();
      setWalletAddress(address); setProvider(p); setWeb3Connected(true);
      onWalletConnect?.(address, p);
    } catch (e: any) { alert(e.message || 'Failed to connect wallet.'); }
  };

  const handleAutoFill = () => {
    clearMockPlayers();
    DEFAULT_STARS.forEach(saveMockPlayer);
    setMyPlayers(getMockPlayers());
  };

  const handleClearSquad = () => { clearMockPlayers(); setMyPlayers([]); };

  const handleStartGame = () => {
    if (myPlayers.length < 5) { alert('You need at least 5 players to enter the pitch!'); return; }
    onStartMatch(myPlayers.slice(0, 5));
  };

  const traitMeta = (trait: string) => TRAIT_META[trait] ?? { color: '#000', bg: '#f5f5f5' };
  const totalOVR = myPlayers.slice(0, 5).reduce((acc, p) => acc + Math.round((p.speed + p.passing + p.shooting + p.defense + p.stamina) / 5), 0);
  const avgOVR   = myPlayers.length > 0 ? Math.round(totalOVR / Math.min(myPlayers.length, 5)) : 0;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '36px 20px' }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'var(--fifa-blue)',
        border: '4px solid #000',
        boxShadow: 'var(--shadow-lg)',
        padding: '40px 48px',
        marginBottom: '32px',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: '24px', flexWrap: 'wrap',
      }}>
        {/* Halftone bg */}
        <div style={{ position:'absolute', inset:0, opacity:0.07, backgroundImage:'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize:'24px 24px', pointerEvents:'none' }} />
        {/* Big BG number */}
        <div style={{ position:'absolute', right:'-8px', top:'-24px', fontFamily:'var(--font-display)', fontSize:'220px', color:'rgba(255,255,255,0.04)', lineHeight:1, userSelect:'none', pointerEvents:'none' }}>11</div>

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
            <div style={{ background:'var(--fifa-gold-light)', border:'3px solid #000', boxShadow:'3px 3px 0 #000', padding:'2px 10px', fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'3px', color:'#000', transform:'rotate(-1deg)' }}>FIFA</div>
            <div style={{ height:'2px', width:'40px', background:'var(--fifa-gold-light)' }} />
            <div style={{ border:'2px solid rgba(255,255,255,0.35)', padding:'2px 8px', fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'2px', color:'rgba(255,255,255,0.6)' }}>SQUAD BUILDER</div>
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(44px,6vw,84px)', letterSpacing:'2px', color:'#fff', lineHeight:0.9, marginBottom:'16px' }}>
            BUILD YOUR<br />
            <span style={{ color:'var(--fifa-gold-light)', WebkitTextStroke:'2px #000' }}>SQUAD</span>
          </h1>
          <p style={{ fontFamily:'var(--font-primary)', fontWeight:700, fontSize:'13px', color:'rgba(255,255,255,0.75)', maxWidth:'380px', lineHeight:1.6 }}>
            Assemble 5 players with unique AI personas, then hit the pitch or challenge opponents in a live match.
          </p>
        </div>

        {/* Squad OVR badge */}
        {myPlayers.length >= 5 && (
          <div style={{ position:'relative', zIndex:1, textAlign:'center', flexShrink:0 }}>
            <div style={{ background:'var(--fifa-gold-light)', border:'4px solid #000', boxShadow:'var(--shadow-md)', padding:'16px 24px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'56px', color:'#000', lineHeight:1 }}>{avgOVR}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'2px', color:'#555' }}>SQUAD OVR</div>
            </div>
          </div>
        )}
      </div>

      {/* ── TWO-COLUMN LAYOUT ── */}
      <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:'28px', alignItems:'start' }}>

        {/* LEFT: Wallet + actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>

          {/* Wallet panel */}
          <div className="glass-panel" style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'3px solid #000', paddingBottom:'14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ background:'var(--fifa-blue)', border:'3px solid #000', padding:'6px', boxShadow:'3px 3px 0 #000' }}>
                  <Wallet size={16} color="#fff" strokeWidth={3} />
                </div>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'18px', letterSpacing:'2px' }}>WALLET</span>
              </div>
              <div style={{ background: web3Connected ? '#00A651' : '#fff', border:'3px solid #000', boxShadow:'3px 3px 0 #000', padding:'3px 10px', fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'1.5px', color: web3Connected ? '#fff' : '#000' }}>
                {web3Connected ? 'LIVE' : 'SANDBOX'}
              </div>
            </div>

            {web3Connected ? (
              <div style={{ background:'var(--bg-alt)', border:'3px solid #000', boxShadow:'3px 3px 0 #000', padding:'12px' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'10px', letterSpacing:'2px', color:'#555', marginBottom:'4px' }}>CONNECTED</div>
                <div style={{ fontFamily:'monospace', fontSize:'12px', fontWeight:800, wordBreak:'break-all', color:'#000' }}>{walletAddress}</div>
              </div>
            ) : (
              <>
                <p style={{ fontSize:'13px', fontWeight:600, color:'#333', lineHeight:1.6 }}>
                  Connect MetaMask to settle matches on <strong>Monad Testnet</strong>, or play instantly in free <strong>Sandbox Mode</strong>.
                </p>
                {isMMInstalled ? (
                  <button onClick={handleConnectWallet} className="btn-primary" style={{ justifyContent:'center' }}>
                    <Wallet size={16} strokeWidth={3} /> Connect MetaMask
                  </button>
                ) : (
                  <div style={{ display:'flex', gap:'10px', background:'#FFF8E0', border:'3px solid #000', boxShadow:'3px 3px 0 #000', padding:'12px' }}>
                    <ShieldAlert size={18} style={{ color:'var(--color-maverick)', flexShrink:0 }} strokeWidth={3} />
                    <p style={{ fontSize:'12px', fontWeight:700, color:'#555' }}>MetaMask not detected — Sandbox Mode active.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Match info panel */}
          <div style={{ background:'var(--fifa-red)', border:'4px solid #000', boxShadow:'var(--shadow-md)', padding:'20px', display:'flex', flexDirection:'column', gap:'12px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, opacity:0.08, backgroundImage:'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize:'20px 20px', pointerEvents:'none' }} />
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'16px', letterSpacing:'2px', color:'#fff', marginBottom:'10px', display:'flex', alignItems:'center', gap:'8px' }}>
                <Zap size={16} strokeWidth={3} /> MATCH MODES
              </div>
              {[
                ['⚽ Pitch Sim',   'Play a solo 5v5 AI match right now'],
                ['⚔ Live Match',  'Challenge real opponents on-chain'],
              ].map(([title, desc]) => (
                <div key={title} style={{ display:'flex', alignItems:'center', gap:'10px', paddingTop:'8px', borderTop:'2px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:'14px', letterSpacing:'1.5px', color:'#fff' }}>{title}</div>
                    <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.7)', marginTop:'2px' }}>{desc}</div>
                  </div>
                  <ChevronRight size={16} color="rgba(255,255,255,0.5)" strokeWidth={3} />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT: Player locker */}
        <div className="glass-panel" style={{ display:'flex', flexDirection:'column', gap:'20px', minHeight:'500px' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'3px solid #000', paddingBottom:'14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ background:'var(--fifa-red)', border:'3px solid #000', padding:'6px', boxShadow:'3px 3px 0 #000' }}>
                <Trophy size={16} color="#fff" strokeWidth={3} />
              </div>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'20px', letterSpacing:'2px' }}>PLAYER LOCKER</div>
                <div style={{ fontFamily:'var(--font-primary)', fontSize:'11px', fontWeight:700, color:'#555' }}>{myPlayers.length} PLAYERS · NEED 5 MINIMUM</div>
              </div>
            </div>

            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={handleAutoFill} className="btn-secondary" style={{ padding:'6px 14px', fontSize:'12px' }}>
                Auto-Fill Stars
              </button>
              {myPlayers.length > 0 && (
                <button onClick={handleClearSquad} className="btn-danger" style={{ padding:'6px 12px', fontSize:'12px' }}>
                  <Trash2 size={12} strokeWidth={3} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Empty state */}
          {myPlayers.length === 0 ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', border:'4px dashed #000', background:'var(--bg-alt)', padding:'48px', textAlign:'center', gap:'14px' }}>
              <div style={{ background:'#fff', border:'4px solid #000', padding:'16px', boxShadow:'var(--shadow-md)' }}>
                <Trophy size={36} strokeWidth={2} color="var(--fifa-blue)" />
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'20px', letterSpacing:'2px' }}>LOCKER EMPTY</div>
              <p style={{ fontSize:'12px', fontWeight:600, color:'#555', maxWidth:'240px', lineHeight:1.6 }}>
                Click <strong>Auto-Fill Stars</strong> to load a ready-to-play squad of world-class players.
              </p>
              <button onClick={handleAutoFill} className="btn-primary" style={{ marginTop:'4px' }}>
                ⚽ Auto-Fill Stars
              </button>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 40px 40px 40px 40px', gap:'8px', paddingBottom:'8px', borderBottom:'2px solid #000', paddingLeft:'4px', paddingRight:'4px' }}>
                <div />
                <div style={{ fontFamily:'var(--font-display)', fontSize:'10px', letterSpacing:'2px', color:'#555' }}>PLAYER</div>
                {['SPD','SHT','PAS','DEF'].map(k => (
                  <div key={k} style={{ fontFamily:'var(--font-display)', fontSize:'10px', letterSpacing:'1px', color:'#555', textAlign:'center' }}>{k}</div>
                ))}
              </div>

              {/* Player rows */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'8px', overflowY:'auto', paddingRight:'4px' }}>
                {myPlayers.slice(0, 5).map((player, i) => {
                  const tm = traitMeta(player.trait);
                  return (
                    <div key={player.id} style={{
                      display:'grid', gridTemplateColumns:'36px 1fr 40px 40px 40px 40px',
                      alignItems:'center', gap:'8px',
                      background:'#fff', border:'3px solid #000',
                      borderLeft:`8px solid ${tm.color}`,
                      boxShadow:'4px 4px 0 #000', padding:'10px 12px',
                      transition:'transform 0.1s, box-shadow 0.1s',
                    }}
                      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform='translate(-2px,-2px)'; el.style.boxShadow='6px 6px 0 #000'; }}
                      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform=''; el.style.boxShadow='4px 4px 0 #000'; }}
                    >
                      {/* Position badge */}
                      <div style={{ background:'var(--fifa-blue)', border:'2px solid #000', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:'10px', letterSpacing:'0.5px', color:'#fff' }}>
                        {POSITION_LABELS[i]}
                      </div>

                      {/* Name + trait */}
                      <div>
                        <div style={{ fontFamily:'var(--font-display)', fontSize:'15px', letterSpacing:'1px', lineHeight:1 }}>{player.name}</div>
                        <span className="trait-pill" style={{ marginTop:'5px', background:tm.bg, color:tm.color, fontSize:'9px', padding:'1px 6px', boxShadow:'none', display:'inline-block' }}>
                          {player.trait}
                        </span>
                      </div>

                      {/* Stats */}
                      {[player.speed, player.shooting, player.passing, player.defense].map((val, si) => (
                        <div key={si} style={{ textAlign:'center' }}>
                          <div style={{
                            fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:900,
                            color: val >= 85 ? tm.color : '#000',
                          }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Enter Pitch CTA */}
          <button
            onClick={handleStartGame}
            disabled={myPlayers.length < 5}
            className="btn-primary"
            style={{ justifyContent:'center', padding:'18px', fontSize:'24px', letterSpacing:'4px', marginTop:'auto' }}
          >
            ⚽ ENTER PITCH
          </button>
        </div>
      </div>
    </div>
  );
}
