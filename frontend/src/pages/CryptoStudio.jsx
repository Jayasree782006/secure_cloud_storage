import React, { useState } from 'react';
import axios from 'axios';
import { Key, Shield, Lock, Unlock, CheckCircle, AlertTriangle, Cpu, Share2, Copy, Check } from 'lucide-react';

export default function CryptoStudio({ user }) {
  const [secretText, setSecretText] = useState('MASTER_VAULT_RECOVERY_KEY_77889900');
  const [totalShares, setTotalShares] = useState(5);
  const [threshold, setThreshold] = useState(3);
  
  const [shares, setShares] = useState([]);
  const [selectedShares, setSelectedShares] = useState([]);
  const [reconstructedSecret, setReconstructedSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const demoPublicKeyPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3t3r+L9U9z/z4/h1
7P7J8wQ0t1y0e5g4f6j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8
e9f0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8
c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8
g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8
k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0a1b2c3d4e5f6g7h8
-----END PUBLIC KEY-----`;

  const handleSplitSecret = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShares([]);
    setSelectedShares([]);
    setReconstructedSecret('');

    try {
      const res = await axios.post('/api/crypto/shamir/split', {
        secret: secretText,
        totalShares: Number(totalShares),
        threshold: Number(threshold)
      });

      if (res.data.status === 'SUCCESS') {
        setShares(res.data.shares);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Shamir splitting failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleShareSelection = (share) => {
    const exists = selectedShares.some(s => s.x === share.x);
    if (exists) {
      setSelectedShares(selectedShares.filter(s => s.x !== share.x));
    } else {
      setSelectedShares([...selectedShares, share]);
    }
  };

  const handleReconstruct = async () => {
    if (selectedShares.length < threshold) {
      setError(`You must select at least ${threshold} shares to reconstruct the polynomial! Currently selected: ${selectedShares.length}`);
      return;
    }
    setLoading(true);
    setError('');
    setReconstructedSecret('');

    try {
      const res = await axios.post('/api/crypto/shamir/reconstruct', {
        shares: selectedShares
      });

      if (res.data.status === 'SUCCESS') {
        setReconstructedSecret(res.data.secret);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Shamir reconstruction failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(user?.publicKey || demoPublicKeyPem);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Header Bar */}
      <div className="glass-panel" style={{ padding: '1.75rem 2rem', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Key size={26} color="var(--accent-purple)" />
          <span>Cryptographic Studio & Shamir Lab</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '850px' }}>
          Inspect your RSA-2048 Envelope public key fingerprint and test Shamir's Secret Sharing (SSS) algorithm. SSS splits root master keys into polynomial points over a 1025-bit Galois Field.
        </p>
      </div>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        
        {/* RSA Key Pair Inspector */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justify: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={20} color="var(--accent-cyan)" />
                <span>Personal RSA Envelope Key Vault</span>
              </h3>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>RSA-2048 OAEP</span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Your private key is protected by <strong>PBKDF2</strong> (100,000 iterations of SHA-256) and never leaves the encrypted keystore without passphrase authorization.
            </p>

            <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Public Key PEM (Shareable):</span>
                <button onClick={copyKey} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy PEM'}</span>
                </button>
              </div>
              <pre style={{
                background: '#070a13',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                maxHeight: '160px',
                overflowY: 'auto'
              }}>
                {user?.publicKey || demoPublicKeyPem}
              </pre>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', background: 'rgba(13, 19, 34, 0.6)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>ALGORITHM</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>RSA-OAEP</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>KEY SIZE</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>2048 Bits</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>KDF HASH</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-purple)' }}>SHA-256</div>
            </div>
          </div>
        </div>

        {/* Shamir's Secret Sharing Splitter */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={20} color="var(--accent-emerald)" />
            <span>Shamir's Secret Sharing (1025-bit Prime Field)</span>
          </h3>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Split any root secret into <strong style={{ color: '#fff' }}>N shares</strong> where any <strong style={{ color: '#10b981' }}>K threshold shares</strong> can reconstruct the secret using Lagrange polynomial interpolation.
          </p>

          <form onSubmit={handleSplitSecret}>
            <div className="input-group">
              <label className="input-label">Master Recovery Secret / Key to Split</label>
              <input
                type="text"
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                className="input-field"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}
                required
              />
            </div>

            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Total Shares (N)</label>
                <select value={totalShares} onChange={(e) => setTotalShares(e.target.value)} className="select-field">
                  <option value="3">3 Shares</option>
                  <option value="5">5 Shares</option>
                  <option value="7">7 Shares</option>
                  <option value="10">10 Shares</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Threshold Needed (K)</label>
                <select value={threshold} onChange={(e) => setThreshold(e.target.value)} className="select-field">
                  <option value="2">2 Shares</option>
                  <option value="3">3 Shares</option>
                  <option value="4">4 Shares</option>
                  <option value="5">5 Shares</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }} disabled={loading}>
              <Cpu size={16} />
              <span>Generate Polynomial Shares</span>
            </button>
          </form>
        </div>

      </div>

      {/* ==========================================
          SHAMIR SHARES LIST & RECONSTRUCTION LAB
          ========================================== */}
      {shares.length > 0 && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>
                Generated Polynomial Points <span style={{ color: 'var(--accent-emerald)' }}>(Select any {threshold} of {shares.length})</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Check the boxes below to select shares. With {threshold} shares selected, SentinelVault will execute Lagrange modular interpolation over prime field <code className="font-mono" style={{ color: 'var(--accent-purple)' }}>2^1024 + 643</code>.
              </p>
            </div>

            <button
              onClick={handleReconstruct}
              className="btn btn-emerald"
              style={{ padding: '0.75rem 1.5rem' }}
              disabled={loading || selectedShares.length < threshold}
            >
              <Unlock size={16} />
              <span>Reconstruct Secret ({selectedShares.length}/{threshold} selected)</span>
            </button>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
            {shares.map((share) => {
              const isSelected = selectedShares.some(s => s.x === share.x);
              return (
                <div
                  key={share.x}
                  onClick={() => toggleShareSelection(share)}
                  className="glass-card"
                  style={{
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #10b981' : '1px solid var(--border-glass)',
                    background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-dark)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontWeight: 700, color: isSelected ? '#10b981' : '#fff' }}>
                      Share #{share.x} (X={share.x})
                    </span>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: '1px solid var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? '#10b981' : 'transparent'
                    }}>
                      {isSelected && <Check size={14} color="#000" strokeWidth={3} />}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Y-Coordinate Polynomial Eval (Hex):</div>
                  <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all', maxHeight: '60px', overflowY: 'auto', background: '#070a13', padding: '0.5rem', borderRadius: '6px' }}>
                    {share.y}
                  </div>
                </div>
              );
            })}
          </div>

          {reconstructedSecret && (
            <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.5)', borderRadius: '14px', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#10b981', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                <CheckCircle size={24} />
                <span>Lagrange Polynomial Reconstruction Complete!</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                The mathematical intersection of the {selectedShares.length} selected shares yielded the exact root constant term $f(0)$:
              </div>
              <div className="font-mono" style={{ background: '#070a13', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)', textAlign: 'center', letterSpacing: '0.05em' }}>
                {reconstructedSecret}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
