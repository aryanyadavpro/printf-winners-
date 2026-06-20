'use client';

import React, { useState } from 'react';
import { Swords, Users, Link, Loader2, Wallet, Copy, CheckCheck } from 'lucide-react';

interface MatchLobbyProps {
  walletAddress: string;
  onJoinQueue: (stake: string) => void;
  onCreateRoom: (roomCode: string, stake: string) => void;
  onJoinRoom: (roomCode: string) => void;
  isConnecting: boolean;
  queuePosition: number | null;
  onLeaveQueue: () => void;
}

const STAKE_OPTIONS = ['0.1', '0.5', '1', '5'];

export default function MatchLobby({
  walletAddress,
  onJoinQueue,
  onCreateRoom,
  onJoinRoom,
  isConnecting,
  queuePosition,
  onLeaveQueue,
}: MatchLobbyProps) {
  const [selectedStake, setSelectedStake] = useState('0.5');
  const [mode, setMode]       = useState<'queue' | 'room'>('queue');
  const [customRoom, setCustomRoom] = useState('');
  const [copied, setCopied]   = useState(false);

  const generatedCode = walletAddress ? walletAddress.slice(2, 8).toUpperCase() : 'ROOM01';
  const prize         = (parseFloat(selectedStake) * 2).toFixed(1);
  const payout        = (parseFloat(selectedStake) * 2 * 0.975).toFixed(3);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ── ARENA HERO ── */}
      <div style={{
        background: 'var(--fifa-blue)', border: '4px solid #000', boxShadow: 'var(--shadow-lg)',
        padding: '36px 40px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', inset:0, opacity:0.07, backgroundImage:'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize:'24px 24px', pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:'-16px', top:'-20px', fontFamily:'var(--font-display)', fontSize:'260px', color:'rgba(255,255,255,0.04)', lineHeight:1, userSelect:'none', pointerEvents:'none' }}>⚽</div>

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
            <div style={{ background:'var(--fifa-gold-light)', border:'3px solid #000', boxShadow:'3px 3px 0 #000', padding:'2px 10px', fontFamily:'var(--font-display)', fontSize:'12px', letterSpacing:'3px', color:'#000', transform:'rotate(-1deg)' }}>FIFA</div>
            <div style={{ border:'2px solid rgba(255,255,255,0.3)', padding:'2px 8px', fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'2px', color:'rgba(255,255,255,0.6)' }}>LIVE ARENA</div>
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(48px,8vw,80px)', letterSpacing:'2px', color:'#fff', lineHeight:0.9, marginBottom:'14px' }}>
            MATCH<br /><span style={{ color:'var(--fifa-gold-light)', WebkitTextStroke:'2px #000' }}>LOBBY</span>
          </h1>
          <p style={{ fontFamily:'var(--font-primary)', fontWeight:700, fontSize:'13px', color:'rgba(255,255,255,0.75)', lineHeight:1.7 }}>
            2-Player · Draft → Place → Fight · On-Chain Prize Pool
          </p>

          {/* Wallet pill */}
          <div style={{ marginTop:'18px', display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.3)', padding:'6px 14px' }}>
            <Wallet size={13} strokeWidth={3} color="var(--fifa-gold-light)" />
            <span style={{ fontFamily:'monospace', fontSize:'12px', fontWeight:800, color: walletAddress ? 'var(--fifa-gold-light)' : 'rgba(255,255,255,0.5)' }}>
              {walletAddress ? `${walletAddress.slice(0,6)}…${walletAddress.slice(-4)}` : 'Sandbox Mode — no wallet'}
            </span>
          </div>
        </div>
      </div>

      {/* ── STAKE SELECTOR ── */}
      <div className="glass-panel" style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
        <div style={{ borderBottom:'3px solid #000', paddingBottom:'12px' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'18px', letterSpacing:'2px' }}>ENTRY STAKE</div>
          <div style={{ fontFamily:'var(--font-primary)', fontSize:'12px', fontWeight:700, color:'#555', marginTop:'2px' }}>Winner takes both — platform fee 2.5%</div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'10px' }}>
          {STAKE_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSelectedStake(s)}
              style={{
                padding:'14px 8px', border:'3px solid #000',
                background: selectedStake === s ? 'var(--fifa-blue)' : '#fff',
                color: selectedStake === s ? '#fff' : '#000',
                fontFamily:'var(--font-display)', fontSize:'20px', letterSpacing:'1px',
                cursor:'pointer', textAlign:'center',
                boxShadow: selectedStake === s ? '4px 4px 0 #000' : '4px 4px 0 #ccc',
                transform: selectedStake === s ? 'translate(-2px,-2px)' : undefined,
                transition:'all 0.1s ease',
              }}
            >
              {s}
              <div style={{ fontFamily:'var(--font-primary)', fontSize:'10px', fontWeight:700, opacity:0.7, marginTop:'2px' }}>MON</div>
            </button>
          ))}
        </div>

        {/* Prize pool bar */}
        <div style={{ background:'var(--fifa-gold-light)', border:'3px solid #000', boxShadow:'4px 4px 0 #000', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'2px', color:'#555' }}>PRIZE POOL</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'28px', color:'#000', letterSpacing:'1px', lineHeight:1 }}>{prize} <span style={{ fontSize:'14px' }}>MON</span></div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'11px', letterSpacing:'2px', color:'#555' }}>YOU RECEIVE</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'28px', color:'#000', letterSpacing:'1px', lineHeight:1 }}>{payout} <span style={{ fontSize:'14px' }}>MON</span></div>
          </div>
        </div>
      </div>

      {/* ── MODE TABS ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0', border:'4px solid #000', boxShadow:'var(--shadow-md)' }}>
        {(['queue', 'room'] as const).map((m, i) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding:'14px 20px', border:'none',
              borderRight: i === 0 ? '3px solid #000' : undefined,
              background: mode === m ? 'var(--fifa-red)' : '#fff',
              color: mode === m ? '#fff' : '#000',
              fontFamily:'var(--font-display)', fontSize:'16px', letterSpacing:'2px',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
              transition:'background 0.1s',
            }}
          >
            {m === 'queue' ? <Users size={16} strokeWidth={3} /> : <Link size={16} strokeWidth={3} />}
            {m === 'queue' ? 'RANDOM QUEUE' : 'CUSTOM ROOM'}
          </button>
        ))}
      </div>

      {/* ── ACTION PANEL ── */}
      <div className="glass-panel" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

        {mode === 'queue' ? (
          queuePosition !== null ? (
            /* In queue */
            <div style={{ display:'flex', flexDirection:'column', gap:'20px', alignItems:'center', padding:'12px 0' }}>
              <div style={{ background:'var(--bg-alt)', border:'4px solid #000', boxShadow:'var(--shadow-md)', padding:'28px 40px', textAlign:'center', width:'100%' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:'16px' }}>
                  <div style={{ background:'var(--fifa-blue)', border:'3px solid #000', padding:'12px', boxShadow:'4px 4px 0 #000', display:'inline-flex' }}>
                    <Loader2 size={28} color="#fff" className="animate-spin" />
                  </div>
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'22px', letterSpacing:'3px', marginBottom:'8px' }}>FINDING OPPONENT…</div>
                <div style={{ fontFamily:'var(--font-primary)', fontSize:'13px', fontWeight:700, color:'#555' }}>
                  Stake: <span style={{ color:'var(--fifa-blue)', fontFamily:'var(--font-display)', fontSize:'16px' }}>{selectedStake} MON</span>
                </div>
              </div>
              <button onClick={onLeaveQueue} className="btn-secondary" style={{ width:'100%', justifyContent:'center', padding:'13px' }}>
                Leave Queue
              </button>
            </div>
          ) : (
            /* Queue CTA */
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <p style={{ fontSize:'13px', fontWeight:600, color:'#333', lineHeight:1.7 }}>
                Join the global queue and get matched with the next available opponent at your stake level. Match starts instantly when found.
              </p>
              <button
                onClick={() => onJoinQueue(selectedStake)}
                disabled={isConnecting}
                className="btn-primary"
                style={{ justifyContent:'center', padding:'18px', fontSize:'24px', letterSpacing:'4px' }}
              >
                {isConnecting
                  ? <><Loader2 size={20} className="animate-spin" /> CONNECTING…</>
                  : <><Swords size={20} strokeWidth={3} /> ENTER QUEUE</>
                }
              </button>
            </div>
          )
        ) : (
          /* Custom Room */
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

            {/* Create room */}
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'2px', color:'#555' }}>CREATE A ROOM</div>
              <div style={{ display:'flex', gap:'0', border:'4px solid #000', boxShadow:'var(--shadow-sm)' }}>
                <div style={{
                  flex:1, padding:'14px 18px',
                  background:'var(--bg-alt)',
                  fontFamily:'monospace', fontSize:'22px', fontWeight:900,
                  letterSpacing:'6px', color:'var(--fifa-blue)',
                  borderRight:'4px solid #000',
                }}>
                  {generatedCode}
                </div>
                <button
                  onClick={handleCopy}
                  style={{ background:'#fff', border:'none', padding:'14px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'1.5px', color:'#000', borderRight:'4px solid #000', transition:'background 0.1s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-alt)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff'; }}
                >
                  {copied ? <CheckCheck size={15} strokeWidth={3} color="#00A651" /> : <Copy size={15} strokeWidth={3} />}
                  {copied ? 'COPIED' : 'COPY'}
                </button>
                <button
                  onClick={() => onCreateRoom(generatedCode, selectedStake)}
                  disabled={isConnecting}
                  className="btn-primary"
                  style={{ border:'none', borderRadius:0, padding:'14px 20px', fontSize:'15px', boxShadow:'none !important' }}
                >
                  {isConnecting ? <Loader2 size={15} className="animate-spin" /> : 'CREATE'}
                </button>
              </div>
              <p style={{ fontSize:'11px', fontWeight:700, color:'#777' }}>Share this code with your opponent so they can join.</p>
            </div>

            {/* Divider */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ flex:1, height:'3px', background:'#000' }} />
              <span style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'2px', color:'#555' }}>OR JOIN</span>
              <div style={{ flex:1, height:'3px', background:'#000' }} />
            </div>

            {/* Join room */}
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'2px', color:'#555' }}>JOIN A ROOM</div>
              <div style={{ display:'flex', gap:'0', border:'4px solid #000', boxShadow:'var(--shadow-sm)' }}>
                <input
                  type="text"
                  placeholder="ENTER ROOM CODE…"
                  value={customRoom}
                  onChange={e => setCustomRoom(e.target.value.toUpperCase())}
                  style={{
                    flex:1, padding:'14px 18px', border:'none', outline:'none',
                    background:'var(--bg-alt)',
                    fontFamily:'monospace', fontSize:'18px', fontWeight:900,
                    letterSpacing:'4px', color:'#000',
                    borderRight:'4px solid #000',
                  }}
                />
                <button
                  onClick={() => onJoinRoom(customRoom)}
                  disabled={!customRoom || isConnecting}
                  className="btn-secondary"
                  style={{ border:'none', borderRadius:0, padding:'14px 24px', fontSize:'15px', boxShadow:'none !important' }}
                >
                  {isConnecting ? <Loader2 size={15} className="animate-spin" /> : 'JOIN'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Match flow steps ── */}
        <div style={{ borderTop:'3px solid #000', paddingTop:'16px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0', border:'3px solid #000' }}>
            {[
              { step:'①', label:'DRAFT', sub:'60s', color:'var(--fifa-blue)' },
              { step:'②', label:'PLACE', sub:'60s', color:'var(--fifa-gold)' },
              { step:'③', label:'MATCH', sub:'3min', color:'var(--fifa-red)' },
              { step:'④', label:'PAYOUT', sub:'on-chain', color:'#00A651' },
            ].map(({ step, label, sub, color }, i) => (
              <div key={label} style={{
                textAlign:'center', padding:'10px 6px',
                borderRight: i < 3 ? '2px solid #000' : undefined,
                background: '#fff',
              }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'18px', color, lineHeight:1 }}>{step}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'13px', letterSpacing:'1.5px', color:'#000', marginTop:'2px' }}>{label}</div>
                <div style={{ fontFamily:'var(--font-primary)', fontSize:'10px', fontWeight:700, color:'#777', marginTop:'2px' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
