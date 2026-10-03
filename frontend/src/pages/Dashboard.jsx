import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, Lock, Activity, Database, Key, AlertTriangle, CheckCircle, ArrowRight, Upload, Zap, Eye, Cpu, RefreshCw } from 'lucide-react';

export default function Dashboard({ user, setActiveTab, simulatedLocation }) {
  const [metrics, setMetrics] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postureScore, setPostureScore] = useState(98);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch AI metrics and security incidents
      const [resMetrics, resIncidents] = await Promise.all([
        axios.get('http://localhost:8001/metrics').catch(() => ({
          data: {
            status: "ONLINE (Local Heuristic Fallback)",
            activeUserProfiles: 4,
            totalAnalyzedTransactions: 86,
            threatCounts: { highRiskBlocked: 3, mediumRiskMfa: 8, lowRiskStandard: 75 },
            radarDistribution: [
              { subject: "Geo-Velocity", A: 25 },
              { subject: "Temporal Anomaly", A: 15 },
              { subject: "Behavioral Spike", A: 35 },
              { subject: "Crypto Failures", A: 10 },
              { subject: "IP Reputation", A: 20 }
            ],
            recentIncidents: [
              { timestamp: new Date().toISOString(), user: "bob", action: "SIMULATED_ATTACK_MOSCOW", risk_score: 85.0, level: "HIGH_BLOCKED", factors: ["Untrusted Zone Moscow"] },
              { timestamp: new Date().toISOString(), user: "alice", action: "LOGIN_TOKYO", risk_score: 45.0, level: "MEDIUM_MFA_REQUIRED", factors: ["Impossible Travel"] }
            ]
          }
        })),
        axios.get('/api/security/incidents').catch(() => ({ data: { incidents: [] } }))
      ]);

      setMetrics(resMetrics.data);
      if (resIncidents.data && resIncidents.data.incidents) {
        setIncidents(resIncidents.data.incidents);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [simulatedLocation]);

  return (
    <div>
      {/* Welcome & Security Banner */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(19, 28, 51, 0.8), rgba(13, 19, 34, 0.9))', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-50px', top: '-50px', opacity: 0.08, pointerEvents: 'none' }}>
          <Shield size={350} color="var(--accent-cyan)" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 2 }}>
          <div>
            <div className="badge badge-cyan" style={{ marginBottom: '0.75rem' }}>
              <span>ACTIVE SECURITY CLEARANCE: LEVEL {user?.clearanceLevel || 2}</span>
            </div>
            <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>
              Welcome back, <span className="text-gradient-cyan">{user?.username || 'Enterprise User'}</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '650px', fontSize: '0.95rem' }}>
              SentinelVault Zero-Trust continuous monitoring is actively protecting your cloud storage.
              Every file upload is encrypted with <strong>AES-256-GCM</strong> and wrapped in your <strong>RSA-2048 Envelope</strong>.
            </p>
          </div>

          {/* Security Posture Gauge Circle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'rgba(7, 10, 19, 0.6)', padding: '1.25rem 1.75rem', borderRadius: '16px', border: '1px solid rgba(0, 242, 254, 0.3)', boxShadow: '0 0 25px rgba(0, 242, 254, 0.15)' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'conic-gradient(var(--accent-cyan) 0% 98%, rgba(255,255,255,0.1) 98% 100%)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#0d1322', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{postureScore}%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>SECURITY POSTURE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle size={16} />
                <span>EXCELLENT</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0 Unresolved Vulnerabilities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Zap size={20} color="var(--accent-cyan)" />
        <span>Enterprise Security Operations</span>
      </h3>
      <div className="grid-4" style={{ marginBottom: '2.5rem' }}>
        
        <div className="glass-card" onClick={() => setActiveTab('vault')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '170px' }}>
          <div>
            <div style={{ display: 'inline-flex', padding: '0.65rem', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', marginBottom: '1rem' }}>
              <Lock size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Secure Vault Storage</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Upload, encrypt, and share files using AES-256-GCM and RSA Envelope key wrapping.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 600, marginTop: '1rem' }}>
            <span>Open Vault Explorer</span>
            <ArrowRight size={15} />
          </div>
        </div>

        <div className="glass-card" onClick={() => setActiveTab('zerotrust')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '170px' }}>
          <div>
            <div style={{ display: 'inline-flex', padding: '0.65rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', marginBottom: '1rem' }}>
              <Shield size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Zero-Trust Simulator</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Test geo-velocity jumps, off-hours access, and live AI Step-Up MFA authentication.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600, marginTop: '1rem' }}>
            <span>Launch Simulators</span>
            <ArrowRight size={15} />
          </div>
        </div>

        <div className="glass-card" onClick={() => setActiveTab('crypto')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '170px' }}>
          <div>
            <div style={{ display: 'inline-flex', padding: '0.65rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', marginBottom: '1rem' }}>
              <Key size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Crypto Studio & Shamir Lab</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Manage your RSA public key and test Shamir's Secret Sharing polynomial splitting.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-purple)', fontSize: '0.85rem', fontWeight: 600, marginTop: '1rem' }}>
            <span>Enter Crypto Studio</span>
            <ArrowRight size={15} />
          </div>
        </div>

        <div className="glass-card" onClick={() => setActiveTab('audit')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '170px' }}>
          <div>
            <div style={{ display: 'inline-flex', padding: '0.65rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', marginBottom: '1rem' }}>
              <Database size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Immutable Audit Ledger</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verify SHA-256 Merkle hash chain integrity and test database tamper detection.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: 600, marginTop: '1rem' }}>
            <span>Verify Blockchain</span>
            <ArrowRight size={15} />
          </div>
        </div>

      </div>

      {/* AI Threat Intelligence & System Metrics */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        
        {/* AI Anomaly Radar & Threat Counter */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={20} color="var(--accent-purple)" />
              <span>AI Threat Intelligence Analytics</span>
            </h3>
            <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid-3" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>LOW RISK (STANDARD)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
                {metrics?.threatCounts?.lowRiskStandard || 75}
              </div>
            </div>
            <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>MEDIUM (MFA STEP-UP)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.25rem' }}>
                {metrics?.threatCounts?.mediumRiskMfa || 8}
              </div>
            </div>
            <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-glass)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>HIGH RISK (BLOCKED)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', marginTop: '0.25rem' }}>
                {metrics?.threatCounts?.highRiskBlocked || 3}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(13, 19, 34, 0.7)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
              Multi-Vector Risk Vector Analysis (Average Anomaly Spikes)
            </div>
            {metrics?.radarDistribution?.map((vec, idx) => (
              <div key={idx} style={{ marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                  <span>{vec.subject}</span>
                  <span className="font-mono" style={{ color: vec.A > 60 ? '#ef4444' : (vec.A > 30 ? '#f59e0b' : '#10b981') }}>{vec.A}/100</span>
                </div>
                <div className="progress-bar-container" style={{ height: '6px' }}>
                  <div
                    className={`progress-bar-fill ${vec.A > 60 ? 'danger' : (vec.A > 30 ? '' : 'emerald')}`}
                    style={{ width: `${vec.A}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Security Incidents & Threat Feed */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} color="#f59e0b" />
            <span>Live Security Incident & Anomaly Feed</span>
          </h3>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {metrics?.recentIncidents && metrics.recentIncidents.length > 0 ? (
              metrics.recentIncidents.map((inc, idx) => (
                <div key={idx} style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '12px', borderLeft: `4px solid ${inc.level === 'HIGH_BLOCKED' ? '#ef4444' : '#f59e0b'}`, border: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span className={`badge ${inc.level === 'HIGH_BLOCKED' ? 'badge-red' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                      {inc.level} (SCORE: {inc.risk_score})
                    </span>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(inc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    User "{inc.user}" triggered anomaly in action: <code style={{ color: 'var(--accent-cyan)' }}>{inc.action}</code>
                  </div>
                  {inc.factors && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      ⚡ Factors: {inc.factors.join('; ')}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <CheckCircle size={36} color="var(--accent-emerald)" style={{ margin: '0 auto 0.75rem auto', opacity: 0.6 }} />
                <div>No critical behavioral anomalies detected recently. System operating nominally.</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
