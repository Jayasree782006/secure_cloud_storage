import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import Dashboard from './pages/Dashboard';
import VaultExplorer from './pages/VaultExplorer';
import ZeroTrustSimulator from './pages/ZeroTrustSimulator';
import CryptoStudio from './pages/CryptoStudio';
import AuditLedger from './pages/AuditLedger';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Simulation environment controls
  const [simulatedLocation, setSimulatedLocation] = useState('New York, USA');
  const [isSimulation, setIsSimulation] = useState(false);

  // Setup axios interceptor to add JWT token to all requests
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const savedTokens = localStorage.getItem('sentinelvault_tokens');
      if (savedTokens) {
        try {
          const { accessToken } = JSON.parse(savedTokens);
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          }
        } catch (e) {
          console.warn('Failed to parse tokens from localStorage');
        }
      }
      return config;
    });

    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  useEffect(() => {
    // Auto-initialize demo account 'alice' if not present for seamless evaluation
    const init = async () => {
      try {
        const savedUser = localStorage.getItem('sentinelvault_user');
        const savedTokens = localStorage.getItem('sentinelvault_tokens');
        if (savedUser && savedTokens) {
          try {
            setUser(JSON.parse(savedUser));
            setTokens(JSON.parse(savedTokens));
          } catch (e) {
            await initDefaultUser();
          }
        } else {
          await initDefaultUser();
        }
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const initDefaultUser = async () => {
    try {
      // Auto-login as demo user 'alice' to get valid JWT tokens
      const res = await axios.post('/api/auth/login', {
        email: 'alice@sentinelvault.com',
        password: 'password123'
      });

      if (res.data.status === 'SUCCESS') {
        setUser(res.data.user);
        setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
        localStorage.setItem('sentinelvault_user', JSON.stringify(res.data.user));
        localStorage.setItem('sentinelvault_tokens', JSON.stringify({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken }));
      } else {
        // Fallback to hardcoded demo account if login fails
        console.warn('Demo auto-login failed, using fallback account');
        const fallbackUser = {
          id: 1,
          username: 'alice',
          email: 'alice@sentinelvault.com',
          role: 'EnterpriseUser',
          clearance_level: 2
        };
        setUser(fallbackUser);
        setTokens(null);
        localStorage.setItem('sentinelvault_user', JSON.stringify(fallbackUser));
      }
    } catch (err) {
      console.error('Failed to auto-login demo user:', err.message);
      const fallbackUser = {
        id: 1,
        username: 'alice',
        email: 'alice@sentinelvault.com',
        role: 'EnterpriseUser',
        clearance_level: 2
      };
      setUser(fallbackUser);
      setTokens(null);
      localStorage.setItem('sentinelvault_user', JSON.stringify(fallbackUser));
    }
  };

  const handleLoginSuccess = (userData, tokenData) => {
    setUser(userData);
    setTokens(tokenData);
    localStorage.setItem('sentinelvault_user', JSON.stringify(userData));
    localStorage.setItem('sentinelvault_tokens', JSON.stringify(tokenData));
  };

  const handleLogout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('sentinelvault_user');
    localStorage.removeItem('sentinelvault_tokens');
  };

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginOpen(true)}
        simulatedLocation={simulatedLocation}
        setSimulatedLocation={setSimulatedLocation}
        isSimulation={isSimulation}
        setIsSimulation={setIsSimulation}
      />

      <main className="main-content">
        {isInitializing ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
              🔐 Initializing SentinelVault...
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', animation: 'pulse 1.5s infinite', animationDelay: '0s' }}></div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', animation: 'pulse 1.5s infinite', animationDelay: '0.3s' }}></div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', animation: 'pulse 1.5s infinite', animationDelay: '0.6s' }}></div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                user={user}
                setActiveTab={setActiveTab}
                simulatedLocation={simulatedLocation}
              />
            )}

            {activeTab === 'vault' && (
              <VaultExplorer
                user={user}
                tokens={tokens}
                simulatedLocation={simulatedLocation}
                isSimulation={isSimulation}
              />
            )}

            {activeTab === 'zerotrust' && (
              <ZeroTrustSimulator
                simulatedLocation={simulatedLocation}
                setSimulatedLocation={setSimulatedLocation}
                isSimulation={isSimulation}
                setIsSimulation={setIsSimulation}
              />
            )}

            {activeTab === 'crypto' && (
              <CryptoStudio
                user={user}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLedger
                user={user}
                tokens={tokens}
              />
            )}
          </>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border-glass)', marginTop: 'auto', background: 'rgba(7, 10, 19, 0.8)' }}>
        <div>
          <strong>SentinelVault Enterprise Zero-Trust Cloud Storage Platform</strong> | Built for Final-Year Computer Science Engineering Capstone
        </div>
        <div style={{ marginTop: '0.35rem' }}>
          Engineered with Hybrid Envelope Cryptography (AES-256-GCM + RSA-2048), Isolation-Heuristic AI Threat Detection, Adaptive Step-up MFA, and Merkle Chain Logging.
        </div>
      </footer>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        simulatedLocation={simulatedLocation}
        isSimulation={isSimulation}
      />
    </div>
  );
}
