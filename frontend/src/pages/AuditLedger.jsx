import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Database, Shield, AlertTriangle, CheckCircle, RefreshCw, Zap, Lock, Hash, Eye, Trash2 } from 'lucide-react';

export default function AuditLedger({ user, tokens }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(null); // { valid: true/false, details: ... }
  const [tampering, setTampering] = useState(false);

  const getHeaders = () => ({
    headers: {
      'Authorization': tokens ? `Bearer ${tokens.accessToken}` : ''
    }
  });

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/audit/logs', getHeaders());
      if (res.data.status === 'SUCCESS') {
        setLogs(res.data.logs);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Authentication required. Please sign in as an Enterprise User or Auditor.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch audit ledger.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const handleVerifyLedger = async () => {
    setLoading(true);
    setError('');
    setVerificationStatus(null);

    try {
      const res = await axios.get('/api/audit/verify', getHeaders());
      setVerificationStatus(res.data);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.status === 'TAMPERED') {
        setVerificationStatus(err.response.data);
      } else {
        setError(err.response?.data?.error || err.message || 'Verification execution failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateTamper = async () => {
    setTampering(true);
    setError('');
    setVerificationStatus(null);

    try {
      const res = await axios.post('/api/audit/simulate-tamper', {
        blockId: 1,
        tamperedDetails: '[UNAUTHORIZED DB TAMPERING] Altered log payload to conceal suspicious activity.'
      }, getHeaders());

      // Fetch logs and run verify immediately to show the breach
      await fetchLogs();
      await handleVerifyLedger();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Tamper simulation failed.');
    } finally {
      setTampering(false);
    }
  };

  return (
    <div>
      {/* Header Bar */}
      <div className="glass-panel" style={{ padding: '1.75rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Database size={26} color="var(--accent-amber)" />
            <span>Immutable Merkle Audit Ledger</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '800px' }}>
            Every system event is cryptographically linked in an immutable SHA-256 Merkle chain (<code className="font-mono">hash = SHA256(prev_hash + timestamp + payload)</code>). Any database modification instantly breaks chain integrity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchLogs} className="btn btn-secondary" title="Refresh Logs">
            <RefreshCw size={16} />
            <span>Refresh Ledger</span>
          </button>
          <button onClick={handleVerifyLedger} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' }}>
            <Shield size={16} />
            <span>Verify Merkle Chain</span>
          </button>
          <button onClick={handleSimulateTamper} className="btn btn-danger" disabled={tampering} title="Inject a malicious SQL update to test tamper detection">
            <Zap size={16} />
            <span>{tampering ? 'Injecting SQL Attack...' : 'Simulate DB Tamper Attack'}</span>
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verificationStatus && (
        <div style={{
          padding: '1.5rem',
          borderRadius: '16px',
          marginBottom: '2rem',
          background: verificationStatus.isIntact ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.2)',
          border: `2px solid ${verificationStatus.isIntact ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '50%', background: verificationStatus.isIntact ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.3)' }}>
              {verificationStatus.isIntact ? <CheckCircle size={32} color="#10b981" /> : <AlertTriangle size={32} color="#ef4444" />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', color: verificationStatus.isIntact ? '#10b981' : '#ef4444', marginBottom: '0.25rem' }}>
                {verificationStatus.isIntact ? 'Merkle Chain Integrity Verified (100% Intact)' : 'CRYPTOGRAPHIC TAMPERING DETECTED IN LEDGER!'}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>
                {verificationStatus.isIntact
                  ? `All ${verificationStatus.totalBlocks} consecutive block hashes matched their payload signatures. Zero database manipulation detected.`
                  : (verificationStatus.details || `Block #${verificationStatus.tamperedBlockId} stored hash does not match recomputed payload hash!`)}
              </p>
            </div>
          </div>

          {!verificationStatus.isIntact && (
            <button onClick={fetchLogs} className="btn btn-secondary" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
              Inspect Broken Block
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', color: '#ef4444', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Merkle Chain Visualizer Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Hash size={18} color="var(--accent-cyan)" />
            <span>Chronological Merkle Block Stream</span>
          </h3>
          <span className="badge badge-amber">Total Blocks: {logs.length}</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={36} className="pulse-dot" style={{ margin: '0 auto 1rem auto' }} />
            <div>Recomputing Merkle Chain Hashes...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <Database size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.4 }} />
            <div>No audit log blocks recorded yet. Execute file operations or sign in to generate blocks.</div>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Block #</th>
                  <th style={{ width: '160px' }}>Timestamp</th>
                  <th style={{ width: '100px' }}>User ID</th>
                  <th style={{ width: '220px' }}>Action Executed</th>
                  <th style={{ width: '140px' }}>IP Address</th>
                  <th>Merkle Chain Hashes (SHA-256)</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isTampered = (log.action_type || '').includes('TAMPERED') || (log.details || '').includes('TAMPERED');
                  return (
                    <tr key={log.id} style={{ background: isTampered ? 'rgba(239, 68, 68, 0.12)' : 'transparent' }}>
                      <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        #{log.id}
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="font-mono" style={{ fontWeight: 600 }}>
                        {log.actor_username || `User #${log.actor_id}`}
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: isTampered ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                          color: isTampered ? '#ff8080' : 'var(--text-primary)'
                        }}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {log.ip_address}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <span style={{ width: '70px', color: 'var(--text-muted)' }}>Prev Hash:</span>
                            <code className="font-mono" style={{ color: '#94a3b8' }}>
                              {log.prev_hash === '0000000000000000000000000000000000000000000000000000000000000000' ? 'GENESIS_0000000000...' : `${log.prev_hash.substring(0, 24)}...`}
                            </code>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-primary)' }}>
                            <span style={{ width: '70px', fontWeight: 600, color: isTampered ? '#ef4444' : 'var(--accent-emerald)' }}>Block Hash:</span>
                            <code className="font-mono" style={{ color: isTampered ? '#ff8080' : 'var(--accent-cyan)', fontWeight: 700 }}>
                              {log.current_hash ? `${log.current_hash.substring(0, 28)}...` : 'N/A'}
                            </code>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
