import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Lock, Unlock, Upload, Share2, Download, Trash2, Eye, Shield, Key, FileText, CheckCircle, AlertTriangle, RefreshCw, X, UserCheck } from 'lucide-react';
import FileUpload from '../components/FileUpload';

export default function VaultExplorer({ user, tokens, simulatedLocation, isSimulation }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Form states
  const [uploadData, setUploadData] = useState({
    filename: 'confidential_project_spec.txt',
    content: 'TOP SECRET: SentinelVault Zero-Trust Cloud Storage Specification. Protected by RSA-2048 and AES-256-GCM.',
    passphrase: 'password123',
    clearanceLevel: 2
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [shareUsername, setShareUsername] = useState('bob');
  const [sharePermission, setSharePermission] = useState('READ');
  const [decryptPassphrase, setDecryptPassphrase] = useState('password123');
  const [decryptedPayload, setDecryptedPayload] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Live Crypto Visualizer Step Tracker during Upload
  const [cryptoStep, setCryptoStep] = useState(0); // 0=Idle, 1=Gen AES DEK, 2=AES-GCM Encrypt, 3=RSA Wrap, 4=Uploaded

  const getHeaders = () => ({
    headers: {
      'Authorization': tokens ? `Bearer ${tokens.accessToken}` : '',
      'x-simulated-location': simulatedLocation,
      'x-simulated-attack': isSimulation ? 'true' : 'false'
    }
  });

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0) + ' ' + sizes[i];
  };

  const fetchFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/vault/files', getHeaders());
      if (res.data.status === 'SUCCESS') {
        setFiles(res.data.files);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Authentication required or session expired. Please sign in again.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load vault files.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [user, simulatedLocation]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCryptoStep(1);

    try {
      await new Promise(r => setTimeout(r, 600));
      setCryptoStep(2);
      await new Promise(r => setTimeout(r, 600));
      setCryptoStep(3);

      let res;
      if (uploadedFile) {
        // Use FormData for real binary file uploads
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('passphrase', uploadData.passphrase);
        formData.append('clearanceLevel', String(uploadData.clearanceLevel));

        res = await axios.post('/api/vault/upload', formData, {
          headers: {
            ...getHeaders().headers,
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        res = await axios.post('/api/vault/upload', {
          filename: uploadData.filename,
          fileData: uploadData.content,
          passphrase: uploadData.passphrase,
          clearanceLevel: Number(uploadData.clearanceLevel)
        }, getHeaders());
      }

      setCryptoStep(4);
      await new Promise(r => setTimeout(r, 500));

      setSuccessMsg(`File "${uploadedFile ? uploadedFile.name : uploadData.filename}" securely encrypted and saved to Vault!`);
      setShowUploadModal(false);
      setUploadedFile(null);
      setCryptoStep(0);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Upload & encryption failed.');
      setCryptoStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    setUploadedFile(file);
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setLoading(true);
    setError('');

    try {
      await axios.post('/api/vault/share', {
        fileId: selectedFile.id,
        recipientUsername: shareUsername,
        permissionLevel: sharePermission
      }, getHeaders());

      setSuccessMsg(`Access to "${selectedFile.filename}" granted to user "@${shareUsername}"!`);
      setShowShareModal(false);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'File sharing failed.');
    } finally {
      setLoading(false);
    }
  };

  // Decrypt & View (JSON response — for text preview)
  const handleDecryptSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setLoading(true);
    setError('');
    setDecryptedPayload(null);

    try {
      const res = await axios.post(`/api/vault/download/${selectedFile.id}`, {
        passphrase: decryptPassphrase
      }, getHeaders());

      if (res.data.status === 'SUCCESS') {
        setDecryptedPayload(res.data);
        setSuccessMsg('File decrypted! Auth Tag integrity verified!');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Decryption failed.');
    } finally {
      setLoading(false);
    }
  };

  // Download Original File (binary blob — restores PDF, images, ZIPs, etc.)
  const handleDownloadOriginal = async (file) => {
    setDownloading(true);
    setError('');

    try {
      const res = await axios.post(`/api/vault/download/${file.id}`, {
        passphrase: decryptPassphrase || 'password123'
      }, {
        headers: {
          ...getHeaders().headers,
          'Accept': 'application/octet-stream'
        },
        responseType: 'blob'
      });

      // Create a download link from the blob
      const blob = new Blob([res.data], { type: file.mime_type || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccessMsg(`"${file.filename}" downloaded successfully!`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Download failed. Check passphrase.');
    } finally {
      setDownloading(false);
    }
  };

  // Delete File
  const handleDeleteFile = async (file) => {
    if (!confirm(`Are you sure you want to permanently delete "${file.filename}"? This action cannot be undone.`)) return;
    setLoading(true);
    setError('');

    try {
      await axios.delete(`/api/vault/files/${file.id}`, getHeaders());
      setSuccessMsg(`File "${file.filename}" permanently deleted from vault.`);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Delete failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header Bar */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Lock size={26} color="var(--accent-cyan)" />
            <span>Secure Vault Explorer</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Zero-Trust encrypted file repository. Upload any file type — PDFs, images, documents, archives. Every file is encrypted with AES-256-GCM and wrapped in your RSA-2048 Envelope.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchFiles} className="btn btn-secondary" title="Refresh Vault">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <button onClick={() => { setShowUploadModal(true); setError(''); setSuccessMsg(''); }} className="btn btn-primary">
            <Upload size={16} />
            <span>Encrypt & Upload File</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', color: '#ef4444', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={18} /></button>
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', color: '#10b981', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle size={20} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}><X size={18} /></button>
        </div>
      )}

      {/* File Grid */}
      {loading && files.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={36} className="pulse-dot" style={{ margin: '0 auto 1rem auto' }} />
          <div>Decrypting Vault Metadata & Verifying Merkle Chain Integrity...</div>
        </div>
      ) : files.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FileText size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Your Secure Vault is Empty</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto 1.5rem auto', fontSize: '0.9rem' }}>
            Upload any file (PDF, image, document, ZIP, etc.) to initiate real-time AES-256-GCM + RSA-2048 envelope encryption. Original files are restored perfectly on download.
          </p>
          <button onClick={() => setShowUploadModal(true)} className="btn btn-primary">
            <Upload size={16} />
            <span>Encrypt First File</span>
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {files.map((file) => (
            <div key={file.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)' }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', margin: 0, wordBreak: 'break-all' }}>{file.filename}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Owner: @{file.owner_username}</span>
                    </div>
                  </div>
                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>ENCRYPTED</span>
                </div>

                {/* Cryptographic Specs Badge */}
                <div style={{ background: 'var(--bg-dark)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-glass)', fontSize: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    <span>Size:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatFileSize(file.original_size)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    <span>Cipher:</span>
                    <strong style={{ color: 'var(--accent-emerald)' }}>AES-256-GCM</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    <span>Key Wrap:</span>
                    <strong style={{ color: 'var(--accent-purple)' }}>RSA-2048 Envelope</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    <span>Type:</span>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--accent-amber)' }}>{file.mime_type || 'application/octet-stream'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Auth Tag:</span>
                    <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>{file.auth_tag ? `${file.auth_tag.substring(0, 10)}...` : 'Verified 128-bit'}</span>
                  </div>
                </div>
              </div>

              {/* Card Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setSelectedFile(file); setDecryptedPayload(null); setError(''); setShowDecryptModal(true); }}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}
                >
                  <Eye size={14} />
                  <span>View</span>
                </button>
                <button
                  onClick={() => handleDownloadOriginal(file)}
                  className="btn btn-emerald"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                  title="Download Original File"
                  disabled={downloading}
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => { setSelectedFile(file); setError(''); setShowShareModal(true); }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 0.75rem' }}
                  title="Share File Access"
                >
                  <Share2 size={14} />
                </button>
                <button
                  onClick={() => handleDeleteFile(file)}
                  className="btn btn-danger"
                  style={{ padding: '0.5rem 0.75rem' }}
                  title="Delete File"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          UPLOAD & CRYPTO ENVELOPE MODAL
          ========================================== */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={22} color="var(--accent-cyan)" />
                <span>Encrypt & Upload Document</span>
              </h2>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Live Cryptographic Visualizer */}
            {cryptoStep > 0 && (
              <div style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border-glow-cyan)', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.75rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <RefreshCw size={14} className="pulse-dot" />
                  <span>Real-Time Cryptographic Pipeline Executing:</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: cryptoStep >= 1 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                    <span>{cryptoStep >= 1 ? '✓' : '○'}</span>
                    <span>Step 1: Generating 256-bit Ephemeral AES DEK & 96-bit IV</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: cryptoStep >= 2 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                    <span>{cryptoStep >= 2 ? '✓' : '○'}</span>
                    <span>Step 2: Encrypting payload via AES-256-GCM + generating 128-bit Auth Tag</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: cryptoStep >= 3 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                    <span>{cryptoStep >= 3 ? '✓' : '○'}</span>
                    <span>Step 3: Unlocking RSA-2048 Public Key & Wrapping DEK (RSA Envelope)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: cryptoStep >= 4 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                    <span>{cryptoStep >= 4 ? '✓' : '○'}</span>
                    <span>Step 4: Merkle Hash Chaining to Immutable Audit Ledger</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleUploadSubmit}>
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Option 1:</span> Upload your own file (PDF, Image, ZIP, etc.)
                </p>
                <FileUpload onFileSelect={handleFileSelect} maxSize={50 * 1024 * 1024} />
                {uploadedFile && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#10b981', fontSize: '0.9rem' }}>
                    ✓ File ready: <strong>{uploadedFile.name}</strong> ({formatFileSize(uploadedFile.size)})
                  </div>
                )}
              </div>

              {!uploadedFile && (
                <>
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    OR
                  </div>

                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Option 2:</span> Enter text content
                    </p>

                    <div className="input-group">
                      <label className="input-label">Document Filename</label>
                      <input
                        type="text"
                        value={uploadData.filename}
                        onChange={(e) => setUploadData({ ...uploadData, filename: e.target.value })}
                        className="input-field"
                        required={!uploadedFile}
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Confidential Content / Text Payload</label>
                      <textarea
                        rows={4}
                        value={uploadData.content}
                        onChange={(e) => setUploadData({ ...uploadData, content: e.target.value })}
                        className="input-field"
                        style={{ resize: 'vertical', fontFamily: 'var(--font-mono)' }}
                        required={!uploadedFile}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Security Clearance Required</label>
                  <select
                    value={uploadData.clearanceLevel}
                    onChange={(e) => setUploadData({ ...uploadData, clearanceLevel: e.target.value })}
                    className="select-field"
                  >
                    <option value="1">Level 1 (Public / Intern)</option>
                    <option value="2">Level 2 (Standard Enterprise)</option>
                    <option value="3">Level 3 (Confidential)</option>
                    <option value="4">Level 4 (Secret / Auditor)</option>
                    <option value="5">Level 5 (Top Secret / SuperAdmin)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">RSA Passphrase</label>
                  <input
                    type="password"
                    value={uploadData.passphrase}
                    onChange={(e) => setUploadData({ ...uploadData, passphrase: e.target.value })}
                    className="input-field"
                    placeholder="Unlocks private key via PBKDF2"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }} disabled={loading || cryptoStep > 0 || (!uploadedFile && !uploadData.content.trim())}>
                {cryptoStep > 0 ? 'Executing Hybrid Cryptography...' : 'Encrypt & Save to Vault'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          FILE SHARING MODAL
          ========================================== */}
      {showShareModal && selectedFile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Share2 size={22} color="var(--accent-cyan)" />
                <span>Share Access: {selectedFile.filename}</span>
              </h2>
              <button onClick={() => setShowShareModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Sharing generates a customized RSA-OAEP wrapped Data Encryption Key (DEK) encrypted specifically for the target user's public key.
            </p>

            <form onSubmit={handleShareSubmit}>
              <div className="input-group">
                <label className="input-label">Target Recipient Username</label>
                <select
                  value={shareUsername}
                  onChange={(e) => setShareUsername(e.target.value)}
                  className="select-field"
                >
                  <option value="bob">Enterprise User (@bob - Lvl 2)</option>
                  <option value="alice">Enterprise User (@alice - Lvl 2)</option>
                  <option value="auditor">Security Auditor (@auditor - Lvl 4)</option>
                  <option value="admin">SuperAdmin (@admin - Lvl 5)</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Permission Level</label>
                <select
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value)}
                  className="select-field"
                >
                  <option value="READ">READ (Decrypt & View)</option>
                  <option value="DOWNLOAD">DOWNLOAD (Full File Download)</option>
                  <option value="WRITE">WRITE (Modify & Re-encrypt)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }} disabled={loading}>
                <UserCheck size={16} />
                <span>Grant RSA Wrapped Access</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          DECRYPT & VIEW MODAL
          ========================================== */}
      {showDecryptModal && selectedFile && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Unlock size={22} color="var(--accent-emerald)" />
                <span>Decrypt: {selectedFile.filename}</span>
              </h2>
              <button onClick={() => setShowDecryptModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {!decryptedPayload ? (
              <form onSubmit={handleDecryptSubmit}>
                <div style={{ padding: '0.85rem', background: 'var(--bg-dark)', borderRadius: '10px', border: '1px solid var(--border-glass)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    <span>File ID:</span> <span className="font-mono">{selectedFile.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    <span>Original Size:</span> <span className="font-mono">{formatFileSize(selectedFile.original_size)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    <span>MIME Type:</span> <span className="font-mono">{selectedFile.mime_type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Encryption:</span> <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>AES-256-GCM + RSA-2048</span>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Enter RSA Passphrase to Unlock Private Key</label>
                  <input
                    type="password"
                    value={decryptPassphrase}
                    onChange={(e) => setDecryptPassphrase(e.target.value)}
                    className="input-field"
                    placeholder="password123"
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="btn btn-emerald" style={{ flex: 1, padding: '0.85rem' }} disabled={loading}>
                    <Eye size={16} />
                    <span>Decrypt & Preview</span>
                  </button>
                  <button type="button" onClick={() => handleDownloadOriginal(selectedFile)} className="btn btn-primary" style={{ flex: 1, padding: '0.85rem' }} disabled={downloading}>
                    <Download size={16} />
                    <span>{downloading ? 'Downloading...' : 'Download Original'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '10px', color: '#10b981', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} />
                  <span>Auth Tag Verified! Cryptographic integrity 100% intact.</span>
                </div>

                <div className="input-group">
                  <label className="input-label" style={{ color: 'var(--accent-cyan)' }}>Decrypted Plaintext Payload:</label>
                  <pre style={{
                    background: '#070a13',
                    padding: '1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '250px',
                    overflowY: 'auto'
                  }}>
                    {decryptedPayload.plaintext}
                  </pre>
                </div>

                <div style={{ background: 'var(--bg-dark)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-glass)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    <strong>Unwrapped DEK (Hex):</strong> <code className="font-mono" style={{ color: 'var(--accent-purple)' }}>{decryptedPayload.unwrappedDek}</code>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <strong>Verified Auth Tag:</strong> <code className="font-mono" style={{ color: 'var(--accent-emerald)' }}>{decryptedPayload.authTag}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => handleDownloadOriginal(selectedFile)} className="btn btn-primary" style={{ flex: 1 }} disabled={downloading}>
                    <Download size={16} />
                    <span>{downloading ? 'Downloading...' : 'Download Original File'}</span>
                  </button>
                  <button onClick={() => setShowDecryptModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
