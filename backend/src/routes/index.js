import express from 'express';
import crypto from 'crypto';
import multer from 'multer';
import authService from '../services/authService.js';
import fileController from '../controllers/fileController.js';
import auditService from '../audit/auditService.js';
import cryptoEngine from '../crypto/cryptoEngine.js';
import db from '../config/database.js';
import { authenticateToken, requireRole, evaluateContinuousRisk } from '../middleware/zeroTrustMiddleware.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB file upload limit
});

// ==========================================
// 1. Authentication & Zero-Trust Endpoints
// ==========================================

router.post('/auth/register', async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const simulatedLocation = req.body.simulatedLocation || req.headers['x-simulated-location'] || 'New York, USA';
    const isSimulation = req.body.isSimulation === true || req.headers['x-simulated-attack'] === 'true';

    const result = await authService.login({
      ...req.body,
      ipAddress,
      simulatedLocation,
      isSimulation
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/auth/verify-mfa', async (req, res) => {
  try {
    const ipAddress = req.ip || '127.0.0.1';
    const result = await authService.verifyStepUpMFA({ ...req.body, ipAddress });
    res.status(200).json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get(`SELECT id, username, email, role, clearance_level, created_at FROM users WHERE id = ?`, [req.user.userId]);
    res.status(200).json({ status: 'SUCCESS', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/auth/users', authenticateToken, async (req, res) => {
  try {
    const users = await db.all(`SELECT id, username, email, role, clearance_level FROM users WHERE id != ?`, [req.user.userId]);
    res.status(200).json({ status: 'SUCCESS', users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. Secure Vault File Endpoints
// ==========================================

router.get('/vault/files', authenticateToken, fileController.listFiles);

router.post('/vault/upload', authenticateToken, evaluateContinuousRisk, upload.single('file'), fileController.uploadFile);

router.post('/vault/share', authenticateToken, evaluateContinuousRisk, fileController.shareFile);

router.post('/vault/download/:fileId', authenticateToken, evaluateContinuousRisk, fileController.downloadFile);

router.delete('/vault/files/:fileId', authenticateToken, evaluateContinuousRisk, fileController.deleteFile);

// ==========================================
// 3. Cryptographic Key & Shamir Studio
// ==========================================

router.get('/crypto/keypair', authenticateToken, async (req, res) => {
  try {
    const key = await db.get(`SELECT public_key_pem, key_fingerprint, created_at FROM user_keys WHERE user_id = ?`, [req.user.userId]);
    res.status(200).json({ status: 'SUCCESS', key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/crypto/shamir/split', authenticateToken, (req, res) => {
  try {
    const { secret, totalShares = 5, threshold = 3 } = req.body;
    if (!secret) return res.status(400).json({ error: 'Secret text is required.' });
    const secretHex = Buffer.from(secret, 'utf8').toString('hex');
    const shares = cryptoEngine.splitSecret(secretHex, totalShares, threshold);
    
    auditService.logEvent({
      actorId: req.user.userId,
      actorUsername: req.user.username,
      actionType: 'SHAMIR_SECRET_SPLIT',
      details: `Split secret into ${totalShares} shares with threshold ${threshold}`
    });

    res.status(200).json({ status: 'SUCCESS', shares, totalShares, threshold });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/crypto/shamir/reconstruct', authenticateToken, (req, res) => {
  try {
    const { shares } = req.body;
    if (!shares || !Array.isArray(shares) || shares.length < 2) {
      return res.status(400).json({ error: 'Provide at least 2 valid polynomial shares.' });
    }
    const reconstructed = cryptoEngine.reconstructSecret(shares);
    
    auditService.logEvent({
      actorId: req.user.userId,
      actorUsername: req.user.username,
      actionType: 'SHAMIR_SECRET_RECONSTRUCT',
      details: `Reconstructed secret from ${shares.length} polynomial shares.`
    });

    res.status(200).json({ status: 'SUCCESS', secret: reconstructed });
  } catch (err) {
    res.status(400).json({ error: 'Reconstruction failed: Invalid or insufficient polynomial shares.' });
  }
});

// ==========================================
// 3b. Crypto Demo Endpoints (AES, SHA, Envelope)
// ==========================================

router.post('/crypto/aes-encrypt', authenticateToken, (req, res) => {
  try {
    const { plaintext } = req.body;
    if (!plaintext) return res.status(400).json({ error: 'Plaintext is required.' });

    const buffer = Buffer.from(plaintext, 'utf8');
    const { encryptedBuffer, dek, iv, authTag } = cryptoEngine.encryptBuffer(buffer);

    auditService.logEvent({
      actorId: req.user.userId,
      actorUsername: req.user.username,
      actionType: 'CRYPTO_AES_DEMO_ENCRYPT',
      details: `AES-256-GCM demo encryption of ${buffer.length} byte payload.`
    });

    res.status(200).json({
      status: 'SUCCESS',
      ciphertext: encryptedBuffer.toString('base64'),
      dek,
      iv,
      authTag,
      algorithm: 'AES-256-GCM',
      plaintextLength: buffer.length,
      ciphertextLength: encryptedBuffer.length
    });
  } catch (err) {
    res.status(500).json({ error: 'AES encryption demo failed: ' + err.message });
  }
});

router.post('/crypto/aes-decrypt', authenticateToken, (req, res) => {
  try {
    const { ciphertext, dek, iv, authTag } = req.body;
    if (!ciphertext || !dek || !iv || !authTag) {
      return res.status(400).json({ error: 'ciphertext, dek, iv, and authTag are all required.' });
    }

    const encryptedBuffer = Buffer.from(ciphertext, 'base64');
    const plaintextBuffer = cryptoEngine.decryptBuffer(encryptedBuffer, dek, iv, authTag);

    res.status(200).json({
      status: 'SUCCESS',
      plaintext: plaintextBuffer.toString('utf8'),
      verified: true
    });
  } catch (err) {
    res.status(400).json({ error: 'AES decryption failed: ' + err.message });
  }
});

router.post('/crypto/hash', authenticateToken, (req, res) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: 'Input text is required.' });

    const sha256 = crypto.createHash('sha256').update(input).digest('hex');
    const sha512 = crypto.createHash('sha512').update(input).digest('hex');
    const md5 = crypto.createHash('md5').update(input).digest('hex');

    auditService.logEvent({
      actorId: req.user.userId,
      actorUsername: req.user.username,
      actionType: 'CRYPTO_HASH_DEMO',
      details: `SHA-256 hash generated for ${input.length} character input.`
    });

    res.status(200).json({
      status: 'SUCCESS',
      sha256,
      sha512,
      md5,
      inputLength: input.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Hash computation failed: ' + err.message });
  }
});

router.post('/crypto/envelope-demo', authenticateToken, async (req, res) => {
  try {
    const { plaintext } = req.body;
    if (!plaintext) return res.status(400).json({ error: 'Plaintext is required.' });

    const userKey = await db.get(`SELECT public_key_pem FROM user_keys WHERE user_id = ?`, [req.user.userId]);
    if (!userKey) return res.status(500).json({ error: 'User RSA key pair not found.' });

    // Step 1: Generate ephemeral AES DEK and encrypt
    const buffer = Buffer.from(plaintext, 'utf8');
    const { encryptedBuffer, dek, iv, authTag } = cryptoEngine.encryptBuffer(buffer);

    // Step 2: Wrap DEK with user's RSA public key
    const wrappedDek = cryptoEngine.wrapDEK(dek, userKey.public_key_pem);

    auditService.logEvent({
      actorId: req.user.userId,
      actorUsername: req.user.username,
      actionType: 'CRYPTO_ENVELOPE_DEMO',
      details: `Full Hybrid Envelope Encryption demo: AES-256-GCM + RSA-2048 OAEP key wrapping.`
    });

    res.status(200).json({
      status: 'SUCCESS',
      steps: [
        { step: 1, name: 'Generate Ephemeral DEK', dek: dek.substring(0, 16) + '...' },
        { step: 2, name: 'AES-256-GCM Encryption', ciphertextLength: encryptedBuffer.length, iv, authTag },
        { step: 3, name: 'RSA-2048 OAEP Key Wrapping', wrappedDekLength: wrappedDek.length }
      ],
      wrappedDek: wrappedDek.substring(0, 32) + '...',
      ciphertext: encryptedBuffer.toString('base64').substring(0, 64) + '...',
      iv,
      authTag,
      algorithm: 'AES-256-GCM + RSA-2048 OAEP'
    });
  } catch (err) {
    res.status(500).json({ error: 'Envelope encryption demo failed: ' + err.message });
  }
});

// ==========================================
// 4. Immutable Audit Ledger & Verification
// ==========================================

router.get('/audit/logs', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const logs = await auditService.getLogs(limit, offset);
    res.status(200).json({ status: 'SUCCESS', logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit/verify', authenticateToken, async (req, res) => {
  try {
    const verification = await auditService.verifyChainIntegrity();
    
    await auditService.logEvent({
      actorId: req.user.userId,
      actorUsername: req.user.username,
      actionType: 'VERIFY_MERKLE_CHAIN',
      details: `Audit ledger integrity verification executed. Status: ${verification.isIntact ? 'INTACT' : 'TAMPERED'}`
    });

    res.status(200).json({ status: 'SUCCESS', ...verification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audit/simulate-tamper', authenticateToken, async (req, res) => {
  try {
    const { blockId, tamperedDetails } = req.body;
    const result = await auditService.simulateTamper(blockId, tamperedDetails);
    res.status(200).json({
      status: 'SUCCESS',
      message: `Simulated attack executed: Altered Block #${blockId} details in database without updating consecutive SHA-256 hashes. Run integrity verification to detect failure!`,
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. Dashboard Statistics
// ==========================================

router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const totalFiles = await db.get(`SELECT COUNT(*) as count FROM vault_files WHERE is_deleted = 0`);
    const totalUsers = await db.get(`SELECT COUNT(*) as count FROM users`);
    const totalAuditBlocks = await db.get(`SELECT COUNT(*) as count FROM audit_logs`);
    const totalIncidents = await db.get(`SELECT COUNT(*) as count FROM security_incidents`);
    const totalSimulations = await db.get(`SELECT COUNT(*) as count FROM simulation_results`);
    const recentIncidents = await db.all(`SELECT * FROM security_incidents ORDER BY id DESC LIMIT 10`);
    const recentAuditLogs = await db.all(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 5`);

    // Calculate security posture based on incidents
    const openIncidents = await db.get(`SELECT COUNT(*) as count FROM security_incidents WHERE status = 'OPEN'`);
    const postureScore = Math.max(100 - ((openIncidents?.count || 0) * 5), 60);

    res.status(200).json({
      status: 'SUCCESS',
      stats: {
        totalFiles: totalFiles?.count || 0,
        totalUsers: totalUsers?.count || 0,
        totalAuditBlocks: totalAuditBlocks?.count || 0,
        totalIncidents: totalIncidents?.count || 0,
        totalSimulations: totalSimulations?.count || 0,
        securityPosture: postureScore,
        openIncidents: openIncidents?.count || 0
      },
      recentIncidents,
      recentAuditLogs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. Security Incidents & Zero-Trust Simulators
// ==========================================

router.get('/security/incidents', authenticateToken, async (req, res) => {
  try {
    const incidents = await db.all(`SELECT * FROM security_incidents ORDER BY id DESC LIMIT 50`);
    res.status(200).json({ status: 'SUCCESS', incidents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/simulators/evaluate-risk', authenticateToken, async (req, res) => {
  try {
    const ipAddress = req.ip || '127.0.0.1';
    const evalResult = await authService.evaluateAirisk({
      userId: req.user.userId,
      username: req.user.username,
      actionType: req.body.actionType || 'SIMULATED_TEST',
      ipAddress,
      location: req.body.simulatedLocation || 'New York, USA',
      timestamp: new Date().toISOString(),
      isSimulation: req.body.isSimulation || false
    });
    res.status(200).json({ status: 'SUCCESS', result: evalResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Zero-Trust Simulator — stores results in DB
router.post('/simulators/zero-trust', authenticateToken, async (req, res) => {
  try {
    const { attackType, simulatedLocation, ipAddress: simIp } = req.body;
    const userId = req.user.userId;
    const username = req.user.username;

    // Build metadata for AI evaluation
    const metadata = {
      userId,
      username,
      actionType: `SIMULATED_ATTACK_${attackType}`,
      ipAddress: simIp || req.ip || '127.0.0.1',
      location: simulatedLocation || 'New York, USA',
      timestamp: new Date().toISOString(),
      isSimulation: true
    };

    // Evaluate via AI engine
    const aiResult = await authService.evaluateAirisk(metadata);

    // Store simulation result in DB
    await db.run(`
      INSERT INTO simulation_results (user_id, username, attack_type, risk_score, risk_level, triggering_factors, recommendation, vectors)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      username,
      attackType,
      aiResult.riskScore || 0,
      aiResult.riskLevel || 'UNKNOWN',
      JSON.stringify(aiResult.triggeringFactors || []),
      aiResult.recommendation || '',
      JSON.stringify(aiResult.vectors || {})
    ]);

    // Log audit event
    await auditService.logEvent({
      actorId: userId,
      actorUsername: username,
      actorRole: req.user.role,
      actionType: 'ZERO_TRUST_SIMULATION',
      ipAddress: req.ip || '127.0.0.1',
      riskScore: aiResult.riskScore || 0,
      details: `Simulated ${attackType} attack. AI Risk Score: ${aiResult.riskScore}/100 (${aiResult.riskLevel}).`
    });

    res.status(200).json({
      status: 'SUCCESS',
      attackType,
      aiResponse: aiResult
    });
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed: ' + err.message });
  }
});

// Simulation history
router.get('/simulators/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const results = await db.all(`SELECT * FROM simulation_results ORDER BY id DESC LIMIT ?`, [limit]);
    res.status(200).json({ status: 'SUCCESS', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
