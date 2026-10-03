import React from 'react';
import { Shield, Lock, Activity, Key, Database, LogOut, User, Globe, AlertTriangle, Cpu } from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onOpenLogin,
  simulatedLocation,
  setSimulatedLocation,
  isSimulation,
  setIsSimulation
}) {
  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: Activity },
    { id: 'vault', label: 'Secure Vault', icon: Lock },
    { id: 'zerotrust', label: 'Zero-Trust Simulator', icon: Shield },
    { id: 'crypto', label: 'Crypto Studio', icon: Key },
    { id: 'audit', label: 'Audit Ledger', icon: Database },
  ];

  const locations = [
    "New York, USA",
    "San Francisco, USA",
    "London, UK",
    "Tokyo, Japan",
    "Moscow, Russia",
    "Unknown Onion Proxy (Critical)"
  ];

  return (
    <header className="glass-panel" style={{ margin: '1rem 2rem 0 2rem', padding: '0.85rem 1.5rem', position: 'sticky', top: '1rem', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand Title & Shield */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
            padding: '0.6rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)'
          }}>
            <Shield size={24} color="#070a13" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', margin: 0, lineHeight: 1.1 }} className="text-gradient-cyan">
              SentinelVault
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', fontWeight: 600 }}>
              ZERO-TRUST ENTERPRISE VAULT
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', gap: '0.5rem', background: 'rgba(13, 19, 34, 0.6)', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  background: isActive ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(79, 172, 254, 0.2))' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: isActive ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
                  boxShadow: isActive ? '0 0 15px rgba(0, 242, 254, 0.15)' : 'none'
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Security Posture & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          {/* Live Geo & Attack Simulation Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-dark)', padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            <Globe size={15} color="var(--accent-cyan)" />
            <select
              value={simulatedLocation}
              onChange={(e) => setSimulatedLocation(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {locations.map(loc => (
                <option key={loc} value={loc} style={{ background: '#0d1322', color: '#fff' }}>
                  Simulated Loc: {loc}
                </option>
              ))}
            </select>
          </div>

          {/* AI Threat Health Indicator */}
          <div className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem' }}>
            <div className="pulse-dot pulse-emerald"></div>
            <span>AI MONITOR ACTIVE</span>
          </div>

          {/* User Auth Section */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-surface)', padding: '0.35rem 0.85rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.username}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>{user.role}</div>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '0.4rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onOpenLogin} style={{ padding: '0.5rem 1.25rem' }}>
              <User size={16} />
              <span>Enterprise Sign In</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
