'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, formatEther, parseEther } from 'ethers';
import { ShoppingBag, Tag, Loader2, RefreshCw, ShieldAlert, Wallet, X } from 'lucide-react';
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

const TRAIT_COLORS: Record<string, string> = {
  Arrogant: 'var(--color-arrogant)',
  Calculative: 'var(--neon-cyan)',
  'Panic-Prone': 'var(--color-panic)',
  Maverick: 'var(--color-maverick)',
  'Team-First': 'var(--color-team)',
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

// ── Mock listings for sandbox mode ──────────────────────────────────────────
const MOCK_SHOP_LISTINGS: ListingWithStats[] = [
  {
    tokenId: 1001,
    seller: '0xDEAD000000000000000000000000000000001001',
    price: parseEther('0.5'),
    name: 'Zinedine Zidane',
    trait: 'Calculative',
    speed: 78, passing: 95, shooting: 85, defense: 72, stamina: 80, goals: 12, matches: 34,
  },
  {
    tokenId: 1002,
    seller: '0xDEAD000000000000000000000000000000001002',
    price: parseEther('1.2'),
    name: 'Ronaldo R9',
    trait: 'Maverick',
    speed: 92, passing: 74, shooting: 97, defense: 35, stamina: 85, goals: 28, matches: 41,
  },
  {
    tokenId: 1003,
    seller: '0xDEAD000000000000000000000000000000001003',
    price: parseEther('0.3'),
    name: 'Andrea Pirlo',
    trait: 'Team-First',
    speed: 62, passing: 97, shooting: 78, defense: 68, stamina: 75, goals: 5, matches: 29,
  },
  {
    tokenId: 1004,
    seller: '0xDEAD000000000000000000000000000000001004',
    price: parseEther('0.8'),
    name: 'Zlatan Ibrahimović',
    trait: 'Arrogant',
    speed: 80, passing: 79, shooting: 93, defense: 40, stamina: 82, goals: 22, matches: 38,
  },
];

export default function Shop({ nftContractAddress, marketplaceAddress }: ShopProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [web3Connected, setWeb3Connected] = useState(false);
  const [isMMInstalled, setIsMMInstalled] = useState(false);

  const [listings, setListings] = useState<ListingWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [delistingId, setDelistingId] = useState<number | null>(null);
  const [txLog, setTxLog] = useState<{ msg: string; hash?: string } | null>(null);

  // List-for-sale modal state
  const [showListModal, setShowListModal] = useState(false);
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [listTokenId, setListTokenId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [isListing, setIsListing] = useState(false);

  useEffect(() => {
    setIsMMInstalled(isMetaMaskAvailable());
  }, []);

  const handleConnect = async () => {
    try {
      const { address, provider: p } = await connectMetaMask();
      setWalletAddress(address);
      setProvider(p);
      setWeb3Connected(true);
    } catch (e: any) {
      alert(e.message || 'Failed to connect wallet.');
    }
  };

  const loadListings = useCallback(async () => {
    setIsLoading(true);
    setTxLog(null);
    try {
      if (web3Connected && provider) {
        const raw = await fetchActiveListings(provider, marketplaceAddress);
        // Hydrate with on-chain stats
        const nft = new Contract(nftContractAddress, CONTRACT_ABI, provider);
        const hydrated = await Promise.all(
          raw.map(async (l) => {
            try {
              const s = await nft.getPlayerStats(l.tokenId);
              return {
                ...l,
                name: s.playerName,
                trait: s.personalityTrait as PersonaTrait,
                speed: Number(s.speed),
                passing: Number(s.passing),
                shooting: Number(s.shooting),
                defense: Number(s.defense),
                stamina: Number(s.stamina),
                goals: Number(s.goalsScored),
                matches: Number(s.matchesPlayed),
              } as ListingWithStats;
            } catch {
              return null;
            }
          })
        );
        setListings(hydrated.filter(Boolean) as ListingWithStats[]);
      } else {
        // Sandbox: show mock listings
        await new Promise((r) => setTimeout(r, 500));
        setListings(MOCK_SHOP_LISTINGS);
      }
    } catch (e: any) {
      alert(e.message || 'Failed to load listings.');
    } finally {
      setIsLoading(false);
    }
  }, [web3Connected, provider, marketplaceAddress, nftContractAddress]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleBuy = async (listing: ListingWithStats) => {
    setBuyingId(listing.tokenId);
    setTxLog(null);
    try {
      if (web3Connected && provider) {
        setTxLog({ msg: 'Awaiting MetaMask confirmation...' });
        const hash = await buyAgentFromMarketplace(provider, marketplaceAddress, listing.tokenId, listing.price);
        setTxLog({ msg: `Purchased! Agent is now in your wallet.`, hash });
        await loadListings();
      } else {
        await new Promise((r) => setTimeout(r, 700));
        const hash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setTxLog({ msg: `Sandbox purchase of ${listing.name} confirmed!`, hash });
        setListings((prev) => prev.filter((l) => l.tokenId !== listing.tokenId));
      }
    } catch (e: any) {
      alert(e.message || 'Purchase failed.');
      setTxLog(null);
    } finally {
      setBuyingId(null);
    }
  };

  const handleDelist = async (tokenId: number) => {
    setDelistingId(tokenId);
    setTxLog(null);
    try {
      if (web3Connected && provider) {
        const hash = await delistAgent(provider, marketplaceAddress, tokenId);
        setTxLog({ msg: 'Listing removed.', hash });
        await loadListings();
      } else {
        await new Promise((r) => setTimeout(r, 400));
        setListings((prev) => prev.filter((l) => l.tokenId !== tokenId));
        setTxLog({ msg: 'Sandbox listing removed.' });
      }
    } catch (e: any) {
      alert(e.message || 'Delist failed.');
    } finally {
      setDelistingId(null);
    }
  };

  const handleOpenListModal = () => {
    setMyPlayers(getMockPlayers());
    setShowListModal(true);
  };

  const handleList = async () => {
    if (!listTokenId || !listPrice) return;
    const tid = parseInt(listTokenId);
    let priceWei: bigint;
    try {
      priceWei = parseEther(listPrice);
    } catch {
      alert('Invalid price — enter a valid MON amount, e.g. 0.5');
      return;
    }

    setIsListing(true);
    setTxLog(null);
    try {
      if (web3Connected && provider) {
        setTxLog({ msg: 'Approving marketplace contract...' });
        const hash = await listAgentForSale(provider, nftContractAddress, marketplaceAddress, tid, priceWei);
        setTxLog({ msg: `Agent #${tid} listed on-chain!`, hash });
        setShowListModal(false);
        await loadListings();
      } else {
        await new Promise((r) => setTimeout(r, 600));
        const player = getMockPlayers().find((p) => p.tokenId === tid);
        if (!player) throw new Error('Token not found in your locker.');
        const mockListing: ListingWithStats = {
          tokenId: tid,
          seller: '0xYourAddress',
          price: priceWei,
          name: player.name,
          trait: player.trait,
          speed: player.speed,
          passing: player.passing,
          shooting: player.shooting,
          defense: player.defense,
          stamina: player.stamina,
          goals: player.goals,
          matches: 0,
        };
        setListings((prev) => [...prev, mockListing]);
        setTxLog({ msg: `Sandbox: ${player.name} listed for ${listPrice} MON.` });
        setShowListModal(false);
      }
    } catch (e: any) {
      alert(e.message || 'Listing failed.');
      setTxLog(null);
    } finally {
      setIsListing(false);
      setListTokenId('');
      setListPrice('');
    }
  };

  const shortAddr = (addr: string) =>
    addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{
          fontFamily: 'var(--font-manga)',
          fontSize: '64px',
          letterSpacing: '3px',
          textShadow: '0 0 20px rgba(138, 43, 226, 0.7)',
          background: 'linear-gradient(135deg, #fff 30%, var(--monad-purple) 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '10px',
        }}>
          AGENT SHOP
        </h1>
        <p style={{ fontSize: '16px', color: '#8b949e', maxWidth: '540px', margin: '0 auto' }}>
          Buy and sell AI Persona Agents peer-to-peer. Every trade is settled on-chain with native MON.
        </p>
      </div>

      {/* Top bar: wallet + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {web3Connected ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: 'rgba(0, 255, 255, 0.08)', border: '1px solid rgba(0,255,255,0.2)',
              padding: '8px 14px', borderRadius: '8px'
            }}>
              <Wallet size={14} style={{ color: 'var(--neon-cyan)' }} />
              <span style={{ fontSize: '13px', fontFamily: 'monospace', color: 'var(--neon-cyan)' }}>
                {shortAddr(walletAddress)}
              </span>
            </div>
          ) : (
            isMMInstalled ? (
              <button onClick={handleConnect} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                <Wallet size={14} /> Connect Wallet
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffaa00', fontSize: '12px' }}>
                <ShieldAlert size={14} />
                Sandbox Mode — no MetaMask detected
              </div>
            )
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleOpenListModal} className="btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
            <Tag size={14} /> List My Agent
          </button>
          <button onClick={loadListings} disabled={isLoading} className="btn-secondary" style={{ padding: '8px 14px' }}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Transaction feedback */}
      {txLog && (
        <div style={{
          backgroundColor: '#07090f', border: '1px solid #1a2035',
          padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px'
        }}>
          <span style={{ color: '#00ffcc' }}>{txLog.msg}</span>
          {txLog.hash && (
            <span style={{ color: '#5d637f', fontFamily: 'monospace', marginLeft: '12px', wordBreak: 'break-all' }}>
              {txLog.hash.slice(0, 20)}…
            </span>
          )}
        </div>
      )}

      {/* Listings grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--monad-purple)' }} />
        </div>
      ) : listings.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '300px', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '16px',
          color: '#5d637f', textAlign: 'center', padding: '40px'
        }}>
          <ShoppingBag size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No agents listed yet.</p>
          <p style={{ fontSize: '13px' }}>Be the first to list one using &ldquo;List My Agent&rdquo;.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {listings.map((listing) => {
            const traitColor = TRAIT_COLORS[listing.trait] || '#ffffff';
            const isMine = web3Connected && walletAddress.toLowerCase() === listing.seller.toLowerCase();
            const isBuying = buyingId === listing.tokenId;
            const isDelisting = delistingId === listing.tokenId;

            return (
              <div key={listing.tokenId} className="glass-panel" style={{
                display: 'flex', flexDirection: 'column', gap: '16px',
                border: `1.5px solid ${traitColor}30`,
                boxShadow: `0 0 16px ${traitColor}18`,
                position: 'relative',
              }}>
                {/* Trait aura circle */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    backgroundColor: '#0f111a',
                    border: `4px solid ${traitColor}`,
                    boxShadow: `0 0 20px ${traitColor}60`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: traitColor }} />
                  </div>
                </div>

                {/* Name & trait */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>{listing.name}</div>
                  <div style={{ fontSize: '12px', color: traitColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>
                    {listing.trait}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5d637f', marginTop: '4px' }}>
                    Token #{listing.tokenId} · {listing.goals}G · {listing.matches} matches
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', textAlign: 'center' }}>
                  {[['SPD', listing.speed], ['PAS', listing.passing], ['SHT', listing.shooting], ['DEF', listing.defense], ['STM', listing.stamina]].map(([label, val]) => (
                    <div key={label as string} style={{ backgroundColor: '#07090f', padding: '6px 4px', borderRadius: '6px' }}>
                      <div style={{ fontSize: '9px', color: '#8b949e', marginBottom: '2px' }}>{label}</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Seller */}
                <div style={{ fontSize: '11px', color: '#5d637f', textAlign: 'center' }}>
                  Seller: <span style={{ fontFamily: 'monospace' }}>{shortAddr(listing.seller)}</span>
                  {isMine && <span style={{ color: 'var(--neon-cyan)', marginLeft: '6px' }}>(you)</span>}
                </div>

                {/* Price + action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#8b949e' }}>Price</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--neon-cyan)' }}>
                      {formatEther(listing.price)} MON
                    </div>
                  </div>

                  {isMine ? (
                    <button
                      onClick={() => handleDelist(listing.tokenId)}
                      disabled={isDelisting}
                      className="btn-secondary"
                      style={{ padding: '10px 16px', fontSize: '13px', color: '#ff3b30', borderColor: 'rgba(255,59,48,0.3)' }}
                    >
                      {isDelisting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      Delist
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(listing)}
                      disabled={isBuying}
                      className="btn-primary"
                      style={{ padding: '10px 18px', fontSize: '13px' }}
                    >
                      {isBuying ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                      Buy
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List-for-Sale Modal */}
      {showListModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700 }}>List Agent for Sale</h3>
              <button onClick={() => setShowListModal(false)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#8b949e', lineHeight: 1.5 }}>
              Choose one of your minted agents and set a price in MON. The marketplace contract will receive approval to transfer the token when a buyer pays.
            </p>

            {myPlayers.length > 0 ? (
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '6px' }}>Select Agent</label>
                <select
                  value={listTokenId}
                  onChange={(e) => setListTokenId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', backgroundColor: '#07090f',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                    color: '#fff', fontSize: '14px'
                  }}
                >
                  <option value="">-- choose a player --</option>
                  {myPlayers.map((p) => (
                    <option key={p.id} value={p.tokenId}>
                      {p.name} (#{p.tokenId}) · {p.trait}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '6px' }}>Token ID</label>
                <input
                  type="number"
                  placeholder="e.g. 42"
                  value={listTokenId}
                  onChange={(e) => setListTokenId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', backgroundColor: '#07090f',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                    color: '#fff', fontSize: '14px'
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '6px' }}>Price (MON)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 0.5"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                style={{
                  width: '100%', padding: '10px', backgroundColor: '#07090f',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                  color: '#fff', fontSize: '14px'
                }}
              />
            </div>

            <button
              onClick={handleList}
              disabled={isListing || !listTokenId || !listPrice}
              className="btn-primary"
              style={{ justifyContent: 'center', padding: '12px' }}
            >
              {isListing ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />}
              {web3Connected ? 'Approve & List On-Chain' : 'List (Sandbox)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
