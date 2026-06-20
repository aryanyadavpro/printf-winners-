'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { BrowserProvider } from 'ethers';
import { Wallet, ShieldAlert, Zap } from 'lucide-react';
import { connectMetaMask, isMetaMaskAvailable } from '../utils/web3';

// MatchView uses socket.io, ethers, and canvas — all browser-only APIs.
// ssr:false prevents Next.js from server-rendering it, fixing React hydration error #418.
const MatchView = dynamic(() => import('../components/match/MatchView'), { ssr: false });

export default function Home() {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider]           = useState<BrowserProvider | null>(null);
  const [isMMInstalled]                   = useState(() => {
    if (typeof window === 'undefined') return false;
    return isMetaMaskAvailable();
  });
  const [connecting, setConnecting]       = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { address, provider: p } = await connectMetaMask();
      setWalletAddress(address);
      setProvider(p);
    } catch (e: any) {
      alert(e.message || 'Failed to connect wallet.');
    } finally {
      setConnecting(false);
    }
  };

  // Once wallet is connected (or sandbox skip), go straight to match
  const enterSandbox = () => setWalletAddress('sandbox');

  const inMatch = walletAddress !== '';

  return (
    <main style={{ minHeight: '100vh' }}>
      {/* ── FIFA stripe ── */}
      <div className="divider-stripe" />

      {/* ── Header (always visible) ── */}
      <header style={{
        background: 'var(--fifa-blue)',
        borderBottom: '4px solid #000',
        padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: '64px', boxShadow: '0 4px 0 #000',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'var(--fifa-gold-light)', border: '4px solid #000',
            boxShadow: '4px 4px 0 #000', padding: '4px 14px', transform: 'rotate(-1deg)',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '4px', color: '#000', lineHeight: 1 }}>FIFA</span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', letterSpacing: '3px', color: '#fff', lineHeight: 1 }}>MANGA-MON</div>
            <div style={{ fontFamily: 'var(--font-primary)', fontSize: '10px', fontWeight: 700, color: 'var(--fifa-gold-light)', letterSpacing: '2px', textTransform: 'uppercase' }}>
              AI AGENT × MONAD BLOCKCHAIN
            </div>
          </div>
        </div>

        {/* Wallet status chip */}
        {walletAddress && walletAddress !== 'sandbox' && (
          <div style={{
            background: '#E5F7ED', border: '3px solid #000', boxShadow: '3px 3px 0 #000',
            padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Wallet size={13} strokeWidth={3} color="#00A651" />
            <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 800, color: '#00A651' }}>
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </span>
          </div>
        )}
        {walletAddress === 'sandbox' && (
          <div style={{ background: 'var(--fifa-gold-light)', border: '3px solid #000', boxShadow: '3px 3px 0 #000', padding: '6px 14px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '2px', color: '#000' }}>SANDBOX MODE</span>
          </div>
        )}
      </header>

      {!inMatch ? (
        /* ── LANDING / WALLET GATE ── */
        <div style={{
          maxWidth: '640px', margin: '0 auto',
          padding: '60px 20px', display: 'flex', flexDirection: 'column', gap: '32px',
        }}>

          {/* Hero */}
          <div style={{
            background: 'var(--fifa-blue)', border: '4px solid #000', boxShadow: 'var(--shadow-lg)',
            padding: '48px 40px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position:'absolute', inset:0, opacity:0.07, backgroundImage:'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize:'24px 24px', pointerEvents:'none' }} />
            <div style={{ position:'absolute', right:'-12px', top:'-28px', fontFamily:'var(--font-display)', fontSize:'240px', color:'rgba(255,255,255,0.04)', lineHeight:1, userSelect:'none', pointerEvents:'none' }}>M</div>

            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                <div style={{ background:'var(--fifa-gold-light)', border:'3px solid #000', boxShadow:'3px 3px 0 #000', padding:'2px 10px', fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'3px', color:'#000', transform:'rotate(-1.5deg)' }}>FIFA</div>
                <div style={{ border:'2px solid rgba(255,255,255,0.3)', padding:'2px 8px', fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'2px', color:'rgba(255,255,255,0.6)' }}>WORLD CUP 2026</div>
              </div>

              <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(56px,10vw,96px)', letterSpacing:'2px', color:'#fff', lineHeight:0.88, marginBottom:'20px' }}>
                MANGA<br />
                <span style={{ color:'var(--fifa-gold-light)', WebkitTextStroke:'2px #000' }}>MON</span>
              </h1>

              <p style={{ fontFamily:'var(--font-primary)', fontWeight:700, fontSize:'14px', color:'rgba(255,255,255,0.8)', lineHeight:1.7, maxWidth:'360px' }}>
                Draft your squad. Place your formation. Watch AI personas clash in real-time multiplayer football — settled on-chain with MON.
              </p>

              {/* Match flow */}
              <div style={{ display:'flex', gap:'0', marginTop:'24px', border:'3px solid rgba(255,255,255,0.25)' }}>
                {['① DRAFT', '② PLACE', '③ MATCH', '④ PAYOUT'].map((s, i) => (
                  <div key={s} style={{
                    flex:1, textAlign:'center', padding:'10px 6px',
                    borderRight: i < 3 ? '2px solid rgba(255,255,255,0.2)' : undefined,
                    fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'1.5px',
                    color: i === 0 ? 'var(--fifa-gold-light)' : 'rgba(255,255,255,0.6)',
                  }}>{s}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Wallet connect card */}
          <div className="glass-panel" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            <div style={{ borderBottom:'3px solid #000', paddingBottom:'14px', display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ background:'var(--fifa-blue)', border:'3px solid #000', padding:'6px', boxShadow:'3px 3px 0 #000' }}>
                <Wallet size={16} color="#fff" strokeWidth={3} />
              </div>
              <span style={{ fontFamily:'var(--font-display)', fontSize:'20px', letterSpacing:'2px' }}>CONNECT TO PLAY</span>
            </div>

            <p style={{ fontSize:'13px', fontWeight:600, color:'#333', lineHeight:1.7 }}>
              Connect your MetaMask wallet to enter the match queue and stake <strong>MON</strong> on your squad. No wallet? Jump into <strong>Sandbox Mode</strong> instantly.
            </p>

            {isMMInstalled ? (
              <button onClick={handleConnect} disabled={connecting} className="btn-primary" style={{ justifyContent:'center', padding:'16px', fontSize:'20px', letterSpacing:'3px' }}>
                {connecting
                  ? <span style={{ fontFamily:'var(--font-display)' }}>CONNECTING…</span>
                  : <><Wallet size={18} strokeWidth={3} /> CONNECT METAMASK</>
                }
              </button>
            ) : (
              <div style={{ display:'flex', gap:'12px', background:'#FFF8E0', border:'3px solid #000', boxShadow:'4px 4px 0 #000', padding:'14px' }}>
                <ShieldAlert size={20} style={{ color:'var(--color-maverick)', flexShrink:0 }} strokeWidth={3} />
                <p style={{ fontSize:'13px', fontWeight:700, color:'#555', lineHeight:1.6 }}>MetaMask not detected. Use Sandbox Mode to play without a wallet.</p>
              </div>
            )}

            {/* Divider */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ flex:1, height:'3px', background:'#000' }} />
              <span style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'2px', color:'#555' }}>OR</span>
              <div style={{ flex:1, height:'3px', background:'#000' }} />
            </div>

            <button onClick={enterSandbox} className="btn-secondary" style={{ justifyContent:'center', padding:'14px', fontSize:'18px', letterSpacing:'2px' }}>
              <Zap size={17} strokeWidth={3} /> PLAY IN SANDBOX
            </button>
          </div>
        </div>
      ) : (
        /* ── MATCH (all stages live here) ── */
        <MatchView walletAddress={walletAddress === 'sandbox' ? '' : walletAddress} provider={provider} />
      )}
    </main>
  );
}
