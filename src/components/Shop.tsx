'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, formatEther, parseEther } from 'ethers';
import { ShoppingBag, Tag, Loader2, RefreshCw, ShieldAlert, Wallet, X, TrendingUp } from 'lucide-react';
import {
  connectMetaMask,
  isMetaMaskAvailable,
  fetchActiveListings,
  buyAgentFromMarketplace,
  listAgentForSale,
  delistAgent,
  getMockPlayers,
  MarketplaceListing,
  CONTRACT_ABI,
} from '../utils/web3';
import { Contract } from 'ethers';
import { Player, PersonaTrait } from '../types/game';

const TRAIT_META: Record<string, { color: string; bg: string; label: string }> = {
  'Arrogant':    { color: '#E8001D', bg: '#FFE5E8', label: 'Arrogant' },
  'Calculative': { color: '#0033A0', bg: '#E5EBFF', label: 'Calculative' },
  'Panic-Prone': { color: '#555e70', bg: '#eef0f3', label: 'Panic-Prone' },
  'Maverick':    { color: '#9c6e00', bg: '#FFF8E0', label: 'Maverick' },
  'Team-First':  { color: '#00A651', bg: '#E5F7ED', label: 'Team-First' },
};

interface ShopProps {
  nftContractAddress: string;
  marketplaceAddress: string;
}

interface ListingWithStats extends MarketplaceListing {
  name: string;
  trait: PersonaTrait;
  speed: number;
  passing: number;
  shooting: number;
  defense: number;
  stamina: number;
  goals: number;
  matches: number;
}

const MOCK_SHOP_LISTINGS: ListingWithStats[] = [
  { tokenId: 1001, seller: '0xDEAD000000000000000000000000000000001001', price: parseEther('0.5'),  name: 'Zinedine Zidane',    trait: 'Calculative', speed: 78, passing: 95, shooting: 85, defense: 72, stamina: 80, goals: 12, matches: 34 },
  { tokenId: 1002, seller: '0xDEAD000000000000000000000000000000001002', price: parseEther('1.2'),  name: 'Ronaldo R9',         trait: 'Maverick',     speed: 92, passing: 74, shooting: 97, defense: 35, stamina: 85, goals: 28, matches: 41 },
  { tokenId: 1003, seller: '0xDEAD000000000000000000000000000000001003', price: parseEther('0.3'),  name: 'Andrea Pirlo',       trait: 'Team-First',   speed: 62, passing: 97, shooting: 78, defense: 68, stamina: 75, goals: 5,  matches: 29 },
  { tokenId: 1004, seller: '0xDEAD000000000000000000000000000000001004', price: parseEther('0.8'),  name: 'Zlatan Ibrahimović', trait: 'Arrogant',     speed: 80, passing: 79, shooting: 93, defense: 40, stamina: 82, goals: 22, matches: 38 },
];

export default function Shop({ nftContractAddress, marketplaceAddress }: ShopProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider]           = useState<BrowserProvider | null>(null);
  const [web3Connected, setWeb3Connected] = useState(false);
  const [isMMInstalled, setIsMMInstalled] = useState(false);
  const [listings, setListings]           = useState<ListingWithStats[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [buyingId, setBuyingId]           = useState<number | null>(null);
  const [delistingId, setDelistingId]     = useState<number | null>(null);
  const [txLog, setTxLog]                 = useState<{ msg: string; hash?: string; ok?: boolean } | null>(null);
  const [showListModal, setShowListModal] = useState(false);
  const [myPlayers, setMyPlayers]         = useState<Player[]>([]);
  const [listTokenId, setListTokenId]     = useState('');
  const [listPrice, setListPrice]         = useState('');
  const [isListing, setIsListing]         = useState(false);

  useEffect(() => { setIsMMInstalled(isMetaMaskAvailable()); }, []);

  const handleConnect = async () => {
    try {
      const { address, provider: p } = await connectMetaMask();
      setWalletAddress(address); setProvider(p); setWeb3Connected(true);
    } catch (e: any) { alert(e.message || 'Failed to connect.'); }
  };

  const loadListings = useCallback(async () => {
    setIsLoading(true); setTxLog(null);
    try {
      if (web3Connected && provider) {
        const raw = await fetchActiveListings(provider, marketplaceAddress);
        const nft = new Contract(nftContractAddress, CONTRACT_ABI, provider);
        const hydrated = await Promise.all(raw.map(async (l) => {
          try {
            const s = await nft.getPlayerStats(l.tokenId);
            return { ...l, name: s.playerName, trait: s.personalityTrait as PersonaTrait, speed: Number(s.speed), passing: Number(s.passing), shooting: Number(s.shooting), defense: Number(s.defense), stamina: Number(s.stamina), goals: Number(s.goalsScored), matches: Number(s.matchesPlayed) } as ListingWithStats;
          } catch { return null; }
        }));
        setListings(hydrated.filter(Boolean) as ListingWithStats[]);
      } else {
        await new Promise(r => setTimeout(r, 500));
        setListings(MOCK_SHOP_LISTINGS);
      }
    } catch { /* silent */ } finally { setIsLoading(false); }
  }, [web3Connected, provider, marketplaceAddress, nftContractAddress]);

  useEffect(() => { loadListings(); }, [loadListings]);

  const handleBuy = async (listing: ListingWithStats) => {
    setBuyingId(listing.tokenId); setTxLog(null);
    try {
      if (web3Connected && provider) {
        setTxLog({ msg: 'Awaiting MetaMask confirmation...' });
        const hash = await buyAgentFromMarketplace(provider, marketplaceAddress, listing.tokenId, listing.price);
        setTxLog({ msg: `Purchased! ${listing.name} is now in your wallet.`, hash, ok: true });
        await loadListings();
      } else {
        await new Promise(r => setTimeout(r, 700));
        const hash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setTxLog({ msg: `Sandbox purchase of ${listing.name} confirmed!`, hash, ok: true });
        setListings(prev => prev.filter(l => l.tokenId !== listing.tokenId));
      }
    } catch (e: any) { alert(e.message || 'Purchase failed.'); setTxLog(null); }
    finally { setBuyingId(null); }
  };

  const handleDelist = async (tokenId: number) => {
    setDelistingId(tokenId); setTxLog(null);
    try {
      if (web3Connected && provider) {
        const hash = await delistAgent(provider, marketplaceAddress, tokenId);
        setTxLog({ msg: 'Listing removed.', hash, ok: true });
        await loadListings();
      } else {
        await new Promise(r => setTimeout(r, 400));
        setListings(prev => prev.filter(l => l.tokenId !== tokenId));
        setTxLog({ msg: 'Sandbox listing removed.', ok: true });
      }
    } catch (e: any) { alert(e.message || 'Delist failed.'); }
    finally { setDelistingId(null); }
  };

  const handleOpenListModal = () => { setMyPlayers(getMockPlayers()); setShowListModal(true); };

  const handleList = async () => {
    if (!listTokenId || !listPrice) return;
    const tid = parseInt(listTokenId);
    let priceWei: bigint;
    try { priceWei = parseEther(listPrice); } catch { alert('Invalid price.'); return; }
    setIsListing(true); setTxLog(null);
    try {
      if (web3Connected && provider) {
        setTxLog({ msg: 'Approving marketplace contract...' });
        const hash = await listAgentForSale(provider, nftContractAddress, marketplaceAddress, tid, priceWei);
        setTxLog({ msg: `Agent #${tid} listed on-chain!`, hash, ok: true });
        setShowListModal(false); await loadListings();
      } else {
        await new Promise(r => setTimeout(r, 600));
        const player = getMockPlayers().find(p => p.tokenId === tid);
        if (!player) throw new Error('Token not found in your locker.');
        const mockListing: ListingWithStats = { tokenId: tid, seller: '0xYourAddress', price: priceWei, name: player.name, trait: player.trait, speed: player.speed, passing: player.passing, shooting: player.shooting, defense: player.defense, stamina: player.stamina, goals: player.goals, matches: 0 };
        setListings(prev => [...prev, mockListing]);
        setTxLog({ msg: `${player.name} listed for ${listPrice} MON.`, ok: true });
        setShowListModal(false);
      }
    } catch (e: any) { alert(e.message || 'Listing failed.'); setTxLog(null); }
    finally { setIsListing(false); setListTokenId(''); setListPrice(''); }
  };

  const shortAddr = (addr: string) => addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 20px' }}>

      {/* ── SHOP HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        marginBottom: '28px', gap: '20px', flexWrap: 'wrap',
      }}>
        <div>
          {/* FIFA label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              background: 'var(--fifa-gold-light)', border: '3px solid #000',
              boxShadow: '3px 3px 0 #000', padding: '2px 10px',
              fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '3px', color: '#000',
              transform: 'rotate(-1deg)',
            }}>FIFA</div>
            <div style={{ fontFamily: 'var(--font-primary)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#555', textTransform: 'uppercase' }}>
              Official Agent Marketplace
            </div>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(42px, 6vw, 72px)',
            letterSpacing: '3px',
            color: '#000',
            lineHeight: 0.92,
            WebkitTextStroke: '2px #000',
          }}>
            <span style={{ color: 'var(--fifa-blue)' }}>AGENT</span><br />
            <span style={{ color: 'var(--fifa-red)' }}>SHOP</span>
          </h1>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#555', marginTop: '10px', maxWidth: '400px', lineHeight: 1.6 }}>
            Buy and sell AI Persona Agents peer-to-peer. Every trade is settled on-chain with native MON.
          </p>
        </div>

        {/* Actions bar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
          {/* Wallet status */}
          {web3Connected ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#E5F7ED', border: '3px solid #000', boxShadow: '3px 3px 0 #000',
              padding: '8px 14px',
            }}>
              <Wallet size={14} strokeWidth={3} color="#00A651" />
              <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#00A651' }}>
                {shortAddr(walletAddress)}
              </span>
            </div>
          ) : isMMInstalled ? (
            <button onClick={handleConnect} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              <Wallet size={14} strokeWidth={3} /> Connect Wallet
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFF8E0', border: '3px solid #000', padding: '8px 12px', boxShadow: '3px 3px 0 #000' }}>
              <ShieldAlert size={14} strokeWidth={3} color="var(--color-maverick)" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>Sandbox Mode</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleOpenListModal} className="btn-primary" style={{ padding: '10px 20px', fontSize: '14px' }}>
              <Tag size={14} strokeWidth={3} /> List My Agent
            </button>
            <button onClick={loadListings} disabled={isLoading} className="btn-secondary" style={{ padding: '10px 14px' }}>
              <RefreshCw size={14} strokeWidth={3} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="divider-stripe" style={{ marginBottom: '28px' }} />

      {/* ── TX LOG ── */}
      {txLog && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          background: txLog.ok ? '#E5F7ED' : '#FFE5E8',
          border: '3px solid #000', boxShadow: '4px 4px 0 #000',
          padding: '14px 16px', marginBottom: '24px',
        }}>
          <TrendingUp size={16} strokeWidth={3} color={txLog.ok ? '#00A651' : '#E8001D'} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#000' }}>{txLog.msg}</p>
            {txLog.hash && (
              <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#555', marginTop: '4px', wordBreak: 'break-all' }}>
                {txLog.hash.slice(0, 28)}…
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── LISTINGS GRID ── */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '16px' }}>
          <div style={{ background: 'var(--fifa-blue)', border: '4px solid #000', boxShadow: 'var(--shadow-md)', padding: '16px' }}>
            <Loader2 size={32} color="#fff" className="animate-spin" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '3px' }}>LOADING AGENTS…</div>
        </div>
      ) : listings.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '300px', border: '4px dashed #000', background: 'var(--bg-alt)',
          textAlign: 'center', padding: '48px', gap: '16px',
        }}>
          <div style={{ background: '#fff', border: '4px solid #000', boxShadow: 'var(--shadow-md)', padding: '16px' }}>
            <ShoppingBag size={40} strokeWidth={2} color="var(--fifa-blue)" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '3px' }}>NO AGENTS LISTED</div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#555' }}>Be the first to list one using &ldquo;List My Agent&rdquo;.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '24px' }}>
          {listings.map((listing) => {
            const tm = TRAIT_META[listing.trait] ?? { color: '#000', bg: '#f5f5f5', label: listing.trait };
            const isMine      = web3Connected && walletAddress.toLowerCase() === listing.seller.toLowerCase();
            const isBuying    = buyingId === listing.tokenId;
            const isDelisting = delistingId === listing.tokenId;
            const overallRating = Math.round((listing.speed + listing.passing + listing.shooting + listing.defense + listing.stamina) / 5);

            return (
              <div key={listing.tokenId} style={{
                background: '#fff', border: '4px solid #000',
                boxShadow: 'var(--shadow-md)',
                display: 'flex', flexDirection: 'column',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translate(-3px,-3px)'; el.style.boxShadow = '11px 11px 0 #000'; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = 'var(--shadow-md)'; }}
              >
                {/* Card header — trait colored */}
                <div style={{
                  background: tm.bg, borderBottom: '4px solid #000',
                  padding: '16px 20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '1.5px', lineHeight: 1, color: '#000' }}>
                      {listing.name}
                    </div>
                    <div className="trait-pill" style={{ marginTop: '8px', background: tm.color, color: '#fff', fontSize: '10px' }}>
                      {tm.label}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#777', marginTop: '6px', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>
                      #{listing.tokenId} · {listing.goals}G · {listing.matches} MATCHES
                    </div>
                  </div>

                  {/* OVR badge */}
                  <div style={{
                    background: tm.color, border: '3px solid #000',
                    boxShadow: '4px 4px 0 #000',
                    padding: '6px 10px', textAlign: 'center', minWidth: '54px',
                    flexShrink: 0,
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: '#fff', lineHeight: 1 }}>{overallRating}</div>
                    <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.8)', letterSpacing: '1px' }}>OVR</div>
                  </div>
                </div>

                {/* Stat bars */}
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {([
                    ['SPD', listing.speed],
                    ['PAS', listing.passing],
                    ['SHT', listing.shooting],
                    ['DEF', listing.defense],
                    ['STM', listing.stamina],
                  ] as [string, number][]).map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '1px', color: '#555', width: '28px', flexShrink: 0 }}>{label}</div>
                      <div style={{ flex: 1 }}>
                        <div className="stat-bar-track">
                          <div className="stat-bar-fill" style={{ width: `${val}%`, background: val >= 85 ? tm.color : val >= 70 ? 'var(--fifa-blue)' : '#555' }} />
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 900, color: '#000', width: '26px', textAlign: 'right', flexShrink: 0 }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Footer: price + seller + CTA */}
                <div style={{ borderTop: '3px solid #000', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', background: 'var(--bg-alt)' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontFamily: 'var(--font-display)', letterSpacing: '1.5px', color: '#555' }}>PRICE</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--fifa-blue)', letterSpacing: '1px', lineHeight: 1 }}>
                      {formatEther(listing.price)} <span style={{ fontSize: '14px' }}>MON</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#777', fontWeight: 700, fontFamily: 'monospace', marginTop: '2px' }}>
                      {shortAddr(listing.seller)}{isMine && <span style={{ color: '#00A651', marginLeft: '4px' }}>(you)</span>}
                    </div>
                  </div>

                  {isMine ? (
                    <button onClick={() => handleDelist(listing.tokenId)} disabled={isDelisting} className="btn-danger" style={{ padding: '10px 16px', fontSize: '13px' }}>
                      {isDelisting ? <Loader2 size={13} className="animate-spin" /> : <X size={13} strokeWidth={3} />}
                      Delist
                    </button>
                  ) : (
                    <button onClick={() => handleBuy(listing)} disabled={isBuying} className="btn-primary" style={{ padding: '12px 20px', fontSize: '14px' }}>
                      {isBuying ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} strokeWidth={3} />}
                      BUY
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST MODAL ── */}
      {showListModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
          backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            background: '#fff', border: '4px solid #000', boxShadow: 'var(--shadow-xl)',
            width: '100%', maxWidth: '440px',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Modal header */}
            <div style={{
              background: 'var(--fifa-blue)', borderBottom: '4px solid #000',
              padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Tag size={18} strokeWidth={3} color="#fff" />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', letterSpacing: '2px', color: '#fff' }}>LIST AGENT FOR SALE</span>
              </div>
              <button
                onClick={() => setShowListModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: '4px', display: 'flex' }}
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#555', lineHeight: 1.6 }}>
                Choose one of your minted agents and set a price in MON. The marketplace contract will receive approval to transfer the token when a buyer pays.
              </p>

              {myPlayers.length > 0 ? (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '2px', color: '#555', marginBottom: '8px' }}>SELECT AGENT</div>
                  <select
                    value={listTokenId}
                    onChange={(e) => setListTokenId(e.target.value)}
                    style={{ width: '100%', padding: '12px', background: 'var(--bg-alt)', border: '3px solid #000', borderRadius: 0, fontSize: '14px', fontWeight: 700, color: '#000', outline: 'none', fontFamily: 'var(--font-primary)', cursor: 'pointer' }}
                  >
                    <option value="">-- choose a player --</option>
                    {myPlayers.map(p => (
                      <option key={p.id} value={p.tokenId}>{p.name} (#{p.tokenId}) · {p.trait}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '2px', color: '#555', marginBottom: '8px' }}>TOKEN ID</div>
                  <input
                    type="number" placeholder="e.g. 42" value={listTokenId}
                    onChange={(e) => setListTokenId(e.target.value)}
                    style={{ width: '100%', padding: '12px', background: 'var(--bg-alt)', border: '3px solid #000', borderRadius: 0, fontSize: '14px', fontWeight: 700, color: '#000', outline: 'none' }}
                  />
                </div>
              )}

              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '2px', color: '#555', marginBottom: '8px' }}>PRICE (MON)</div>
                <input
                  type="number" step="0.01" min="0" placeholder="e.g. 0.5"
                  value={listPrice} onChange={(e) => setListPrice(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-alt)', border: '3px solid #000', borderRadius: 0, fontSize: '14px', fontWeight: 700, color: '#000', outline: 'none' }}
                />
              </div>

              <button
                onClick={handleList}
                disabled={isListing || !listTokenId || !listPrice}
                className="btn-primary"
                style={{ justifyContent: 'center', padding: '14px', fontSize: '16px' }}
              >
                {isListing ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} strokeWidth={3} />}
                {web3Connected ? 'APPROVE & LIST ON-CHAIN' : 'LIST (SANDBOX)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
