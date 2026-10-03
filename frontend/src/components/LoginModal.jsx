import React, { useState } from 'react';
import axios from 'axios';
import { Shield, Lock, User, Mail, Key, AlertTriangle, CheckCircle, ArrowRight, X } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLoginSuccess, simulatedLocation, isSimulation }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState('CREDENTIALS'); // CREDENTIALS, MFA_CHALLENGE, BLOCKED

  const [formData, setFormData] = useState({
    username: 'alice',
    email: 'alice@sentinelvault.com',
    password: 'password123',
    role: 'EnterpriseUser',
    passphrase: 'password123',
    otpCode: '123456'
  });

  const [mfaToken, setMfaToken] = useState('');
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        const res = await axios.post('/api/auth/register', {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          clearanceLevel: formData.role === 'SuperAdmin' ? 5 : 2,
          passphrase: formData.passphrase
        });
        if (res.data.status === 'SUCCESS') {
          onLoginSuccess(res.data.user, { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
          onClose();
        }
      } else {
        const res = await axios.post('/api/auth/login', {
          email: formData.email,
          password: formData.password,
          simulatedLocation,
          isSimulation
        }, {
          headers: {
            'x-simulated-location': simulatedLocation,
            'x-simulated-attack': isSimulation ? 'true' : 'false'
          }
        });

        if (res.data.status === 'BLOCKED') {
          setStep('BLOCKED');
          setRiskData(res.data);
        } else if (res.data.status === 'MFA_REQUIRED') {
          setStep('MFA_CHALLENGE');
          setMfaToken(res.data.mfaToken);
          setRiskData(res.data);
        } else if (res.data.status === 'SUCCESS') {
          onLoginSuccess(res.data.user, { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
          onClose();
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/auth/verify-mfa', {
        mfaToken,
        otpCode: formData.otpCode
      });

      if (res.data.status === 'SUCCESS') {
        onLoginSuccess(res.data.user, { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (accEmail, accUser, accRole) => {
    setFormData({
      ...formData,
      email: accEmail,
      username: accUser,
      password: 'password123',
      role: accRole
    });
    setError('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ position: 'relative' }}>
        
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        {step === 'CREDENTIALS' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '14px', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.3)', marginBottom: '0.75rem' }}>
                <Shield size={32} color="var(--accent-cyan)" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                {isRegistering ? 'Enroll in SentinelVault' : 'Zero-Trust Enterprise Sign In'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {isRegistering ? 'Generate your RSA-2048 envelope key pair and security clearance' : 'Continuous AI anomaly monitoring evaluates every session request'}
              </p>
            </div>

            {/* Quick Demo Fill Buttons */}
            {!isRegistering && (
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Quick Evaluation Demo Accounts:
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => fillDemoAccount('admin@sentinelvault.com', 'admin', 'SuperAdmin')} className="badge badge-purple" style={{ cursor: 'pointer' }}>
                    SuperAdmin (admin)
                  </button>
                  <button type="button" onClick={() => fillDemoAccount('auditor@sentinelvault.com', 'auditor', 'SecurityAuditor')} className="badge badge-amber" style={{ cursor: 'pointer' }}>
                    Auditor (auditor)
                  </button>
                  <button type="button" onClick={() => fillDemoAccount('alice@sentinelvault.com', 'alice', 'EnterpriseUser')} className="badge badge-cyan" style={{ cursor: 'pointer' }}>
                    Enterprise (alice)
                  </button>
                  <button type="button" onClick={() => fillDemoAccount('bob@sentinelvault.com', 'bob', 'EnterpriseUser')} className="badge badge-emerald" style={{ cursor: 'pointer' }}>
                    Enterprise (bob)
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCredentialsSubmit}>
              {isRegistering && (
                <div className="input-group">
                  <label className="input-label">Username</label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} className="input-field" required />
                </div>
              )}

              <div className="input-group">
                <label className="input-label">{isRegistering ? 'Enterprise Email' : 'Email or Username'}</label>
                <input type="text" name="email" value={formData.email} onChange={handleChange} className="input-field" required />
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field" required />
              </div>

              {isRegistering && (
                <>
                  <div className="input-group">
                    <label className="input-label">Security Role</label>
                    <select name="role" value={formData.role} onChange={handleChange} className="select-field">
                      <option value="EnterpriseUser">Enterprise User (Clearance Lvl 2)</option>
                      <option value="SecurityAuditor">Security Auditor (Clearance Lvl 4)</option>
                      <option value="SuperAdmin">SuperAdmin (Clearance Lvl 5)</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">RSA Key Vault Passphrase</label>
                    <input type="password" name="passphrase" value={formData.passphrase} onChange={handleChange} className="input-field" placeholder="Protects private key via PBKDF2" required />
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }} disabled={loading}>
                {loading ? 'Authenticating with AI Anomaly Engine...' : (isRegistering ? 'Generate RSA Key Pair & Enroll' : 'Authenticate Session')}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isRegistering ? 'Already enrolled? ' : "Don't have an enterprise account? "}
              <button type="button" onClick={() => setIsRegistering(!isRegistering)} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                {isRegistering ? 'Sign In Here' : 'Register New User'}
              </button>
            </div>
          </div>
        )}

        {step === 'MFA_CHALLENGE' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', marginBottom: '0.75rem' }}>
                <Key size={32} color="var(--accent-amber)" />
              </div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-amber)', marginBottom: '0.25rem' }}>
                Adaptive Step-Up Authentication Required
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                The AI Threat Engine detected a behavioral anomaly (Risk Score: <strong style={{ color: '#f59e0b' }}>{riskData?.riskScore}/100</strong>). Step-Up MFA OTP verification is required.
              </p>
            </div>

            {riskData?.triggeringFactors && (
              <div style={{ padding: '0.75rem', background: 'var(--bg-dark)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Triggering Anomaly Factors:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {riskData.triggeringFactors.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', color: '#10b981', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              ℹ️ For university grading & demo verification, enter OTP code: <strong>123456</strong>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleMfaSubmit}>
              <div className="input-group">
                <label className="input-label" style={{ textAlign: 'center' }}>Enter 6-Digit One-Time Password (OTP)</label>
                <input
                  type="text"
                  name="otpCode"
                  value={formData.otpCode}
                  onChange={handleChange}
                  className="input-field"
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.4em', fontWeight: 700, color: 'var(--accent-cyan)' }}
                  maxLength={6}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }} disabled={loading}>
                {loading ? 'Verifying Zero-Trust Challenge...' : 'Verify OTP & Unlock Vault'}
              </button>
            </form>
          </div>
        )}

        {step === 'BLOCKED' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '0.85rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.5)', marginBottom: '1rem' }}>
              <AlertTriangle size={42} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#ef4444', marginBottom: '0.5rem' }}>
              Zero-Trust Access Blocked
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Critical behavioral anomaly or untrusted location detected. Your Risk Score is <strong style={{ color: '#ef4444' }}>{riskData?.riskScore}/100</strong>.
            </p>

            {riskData?.triggeringFactors && (
              <div style={{ padding: '0.85rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.4)', textAlign: 'left', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                  Security Violation Details:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {riskData.triggeringFactors.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep('CREDENTIALS')}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Return to Login & Switch Location
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
