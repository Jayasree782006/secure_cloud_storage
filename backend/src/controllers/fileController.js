import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import cryptoEngine from '../crypto/cryptoEngine.js';
import auditService from '../audit/auditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAULT_STORAGE_DIR = path.join(__dirname, '../../data/vault_storage');
if (!fs.existsSync(VAULT_STORAGE_DIR)) {
  fs.mkdirSync(VAULT_STORAGE_DIR, { recursive: true });
}

class FileController {
  /**
   * Upload and encrypt file using Hybrid Envelope Cryptography
   */
  async uploadFile(req, res) {
    try {
      const fileBuffer = req.file ? req.file.buffer : (req.body.fileData || req.body.content ? Buffer.from(req.body.fileData || req.body.content, 'utf8') : null);
      if (!fileBuffer) {
        return res.status(400).json({ error: 'No file buffer provided.' });
      }

      const filename = req.file ? req.file.originalname : (req.body.filename || 'untitled_document.txt');
      const fileSize = req.file ? req.file.size : fileBuffer.length;
      const mimeType = req.file ? req.file.mimetype : 'text/plain';

      const userId = req.user.userId;
      const userKey = await db.get(`SELECT public_key_pem FROM user_keys WHERE user_id = ?`, [userId]);
      if (!userKey) {
        return res.status(500).json({ error: 'User cryptographic vault keys not found.' });
      }

      // 1. Bulk encrypt data buffer with AES-256-GCM
      const { encryptedBuffer, dek, iv, authTag } = cryptoEngine.encryptBuffer(fileBuffer);

      // 2. Wrap AES Data Encryption Key with User's RSA Public Key
      const wrappedDek = cryptoEngine.wrapDEK(dek, userKey.public_key_pem);

      // 3. Store encrypted ciphertext to disk
      const storageFilename = `enc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.vault`;
      const storagePath = path.join(VAULT_STORAGE_DIR, storageFilename);
      fs.writeFileSync(storagePath, encryptedBuffer);

      // 4. Save metadata in DB
      const sql = `
        INSERT INTO vault_files (filename, original_size, mime_type, owner_id, storage_path, encrypted_dek, iv, auth_tag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.run(sql, [
        filename,
        fileSize,
        mimeType,
        userId,
        storagePath,
        wrappedDek,
        iv,
        authTag
      ]);

      const savedFile = await db.get(`SELECT * FROM vault_files WHERE storage_path = ?`, [storagePath]);

      // 5. Log immutable audit entry
      await auditService.logEvent({
        actorId: userId,
        actorUsername: req.user.username,
        actorRole: req.user.role,
        actionType: 'FILE_UPLOAD_ENCRYPTED',
        resourceId: `File #${savedFile.id} (${savedFile.filename})`,
        ipAddress: req.ip || '127.0.0.1',
        riskScore: req.riskEvaluation ? req.riskEvaluation.riskScore : 10.0,
        details: `Uploaded & encrypted ${fileSize} bytes using AES-256-GCM + RSA-2048 envelope wrapping.`
      });

      return res.status(201).json({
        status: 'SUCCESS',
        message: 'File successfully encrypted and archived in SentinelVault.',
        fileId: savedFile.id,
        authTag: savedFile.auth_tag,
        file: {
          id: savedFile.id,
          filename: savedFile.filename,
          size: savedFile.original_size,
          mimeType: savedFile.mime_type,
          encryption: 'AES-256-GCM + RSA-OAEP Wrapped DEK',
          createdAt: savedFile.created_at
        }
      });
    } catch (err) {
      console.error('[FileUpload Error]', err);
      return res.status(500).json({ error: 'Cryptographic upload pipeline failed: ' + err.message });
    }
  }

  /**
   * Share an encrypted file using Zero-Trust Re-wrapping
   */
  async shareFile(req, res) {
    try {
      const { fileId, recipientUsername, permissionLevel = 'DOWNLOAD', passphrase = 'password123' } = req.body;
      const grantorId = req.user.userId;

      const file = await db.get(`SELECT * FROM vault_files WHERE id = ?`, [fileId]);
      if (!file) return res.status(404).json({ error: 'Vault file not found.' });
      if (file.owner_id !== grantorId && req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ error: 'Zero-Trust Violation: Only the file owner can grant cryptographic access shares.' });
      }

      const recipient = await db.get(`SELECT id, username FROM users WHERE username = ? OR email = ?`, [recipientUsername, recipientUsername]);
      if (!recipient) return res.status(404).json({ error: `Recipient user "${recipientUsername}" not found in SentinelVault.` });
      if (recipient.id === grantorId) return res.status(400).json({ error: 'Cannot share file with yourself.' });

      // 1. Retrieve Grantor's private key to unwrap DEK
      const grantorKey = await db.get(`SELECT encrypted_private_key_pem FROM user_keys WHERE user_id = ?`, [grantorId]);
      let privateKeyPem;
      try {
        privateKeyPem = cryptoEngine.decryptPrivateKey(grantorKey.encrypted_private_key_pem, passphrase);
      } catch (e) {
        return res.status(401).json({ error: 'Invalid passphrase. Could not unlock your RSA private key to authorize sharing.' });
      }

      // 2. Unwrap AES DEK
      const rawDekBase64 = cryptoEngine.unwrapDEK(file.encrypted_dek, privateKeyPem);

      // 3. Retrieve Grantee's RSA Public Key
      const granteeKey = await db.get(`SELECT public_key_pem FROM user_keys WHERE user_id = ?`, [recipient.id]);
      if (!granteeKey) return res.status(500).json({ error: 'Recipient public key not found.' });

      // 4. Re-wrap DEK for Grantee
      const recipientWrappedDek = cryptoEngine.wrapDEK(rawDekBase64, granteeKey.public_key_pem);

      // 5. Store share permission
      await db.run(`
        INSERT INTO file_shares (file_id, grantor_id, grantee_id, recipient_encrypted_dek, permission_level)
        VALUES (?, ?, ?, ?, ?)
      `, [fileId, grantorId, recipient.id, recipientWrappedDek, permissionLevel]);

      // 6. Log to Immutable Audit Ledger
      await auditService.logEvent({
        actorId: grantorId,
        actorUsername: req.user.username,
        actorRole: req.user.role,
        actionType: 'FILE_SHARED_ZERO_TRUST',
        resourceId: `File #${file.id} -> User #${recipient.id}`,
        ipAddress: req.ip || '127.0.0.1',
        details: `Cryptographically re-wrapped AES DEK for recipient "${recipient.username}" with ${permissionLevel} rights.`
      });

      return res.status(200).json({
        status: 'SUCCESS',
        message: `File securely shared with ${recipient.username} via RSA envelope re-wrapping.`
      });
    } catch (err) {
      console.error('[FileShare Error]', err);
      return res.status(500).json({ error: 'Zero-trust cryptographic sharing failed: ' + err.message });
    }
  }

  /**
   * Decrypt and download a vault file
   */
  async downloadFile(req, res) {
    try {
      const { fileId } = req.params;
      const passphrase = req.body?.passphrase || req.query.passphrase || req.headers['x-key-passphrase'] || 'password123';
      const userId = req.user.userId;

      const file = await db.get(`SELECT * FROM vault_files WHERE id = ?`, [fileId]);
      if (!file) return res.status(404).json({ error: 'Vault file not found.' });

      // Check access permission (Owner or Grantee)
      let wrappedDek = file.encrypted_dek;
      if (file.owner_id !== userId && req.user.role !== 'SuperAdmin') {
        const share = await db.get(`SELECT recipient_encrypted_dek FROM file_shares WHERE file_id = ? AND grantee_id = ?`, [fileId, userId]);
        if (!share) {
          await auditService.logEvent({
            actorId: userId,
            actorUsername: req.user.username,
            actionType: 'UNAUTHORIZED_DOWNLOAD_ATTEMPT',
            resourceId: `File #${fileId}`,
            ipAddress: req.ip || '127.0.0.1',
            riskScore: 80.0,
            details: `User attempted to download file without cryptographic share permission.`
          });
          return res.status(403).json({ error: 'Zero-Trust Enforcement: You do not have cryptographic access to this vault file.' });
        }
        wrappedDek = share.recipient_encrypted_dek;
      }

      // 1. Decrypt User's Private Key
      const userKey = await db.get(`SELECT encrypted_private_key_pem FROM user_keys WHERE user_id = ?`, [userId]);
      let privateKeyPem;
      try {
        privateKeyPem = cryptoEngine.decryptPrivateKey(userKey.encrypted_private_key_pem, passphrase);
      } catch (e) {
        await auditService.logEvent({
          actorId: userId,
          actorUsername: req.user.username,
          actionType: 'DECRYPTION_PASSPHRASE_FAIL',
          resourceId: `File #${fileId}`,
          ipAddress: req.ip || '127.0.0.1',
          riskScore: 60.0,
          details: `Failed private key passphrase verification during file download attempt.`
        });
        return res.status(401).json({ error: 'Invalid passphrase. Cannot unlock RSA private key to decrypt file.' });
      }

      // 2. Unwrap AES DEK
      const dekBase64 = cryptoEngine.unwrapDEK(wrappedDek, privateKeyPem);

      // 3. Read encrypted ciphertext from disk
      if (!fs.existsSync(file.storage_path)) {
        return res.status(500).json({ error: 'Physical storage archive missing from vault storage disk.' });
      }
      const encryptedBuffer = fs.readFileSync(file.storage_path);

      // 4. Decrypt AES-256-GCM buffer & verify Auth Tag integrity
      const plaintextBuffer = cryptoEngine.decryptBuffer(encryptedBuffer, dekBase64, file.iv, file.auth_tag);

      // 5. Log audit success
      await auditService.logEvent({
        actorId: userId,
        actorUsername: req.user.username,
        actorRole: req.user.role,
        actionType: 'FILE_DECRYPT_DOWNLOAD',
        resourceId: `File #${file.id} (${file.filename})`,
        ipAddress: req.ip || '127.0.0.1',
        details: `Successfully unwrapped DEK and verified GCM auth tag for download.`
      });

      if (req.query.format === 'json' || req.body?.format === 'json' || req.headers.accept?.includes('application/json')) {
        return res.status(200).json({
          status: 'SUCCESS',
          filename: file.filename,
          plaintext: plaintextBuffer.toString('utf8'),
          unwrappedDek: dekBase64,
          authTag: file.auth_tag
        });
      }
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      return res.send(plaintextBuffer);
    } catch (err) {
      console.error('[FileDownload Error]', err);
      return res.status(500).json({ error: 'Cryptographic decryption pipeline failed: ' + err.message });
    }
  }

  /**
   * List all vault files accessible to user
   */
  async listFiles(req, res) {
    try {
      const userId = req.user.userId;
      const ownedFiles = await db.all(`
        SELECT f.id, f.filename, f.original_size, f.mime_type, f.auth_tag, f.iv, f.created_at, u.username as owner_username, 'OWNER' as access_type
        FROM vault_files f
        JOIN users u ON f.owner_id = u.id
        WHERE f.owner_id = ? AND f.is_deleted = 0
        ORDER BY f.id DESC
      `, [userId]);

      const sharedFiles = await db.all(`
        SELECT f.id, f.filename, f.original_size, f.mime_type, f.created_at, u.username as owner_username, 'SHARED' as access_type, s.permission_level
        FROM file_shares s
        JOIN vault_files f ON s.file_id = f.id
        JOIN users u ON f.owner_id = u.id
        WHERE s.grantee_id = ? AND f.is_deleted = 0
        ORDER BY f.id DESC
      `, [userId]);

      return res.status(200).json({
        status: 'SUCCESS',
        files: [...ownedFiles, ...sharedFiles]
      });
    } catch (err) {
      console.error('[ListFiles Error]', err);
      return res.status(500).json({ error: 'Failed to retrieve vault file inventory.' });
    }
  }

  /**
   * Soft-delete a vault file
   */
  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      const userId = req.user.userId;

      const file = await db.get(`SELECT * FROM vault_files WHERE id = ?`, [fileId]);
      if (!file) return res.status(404).json({ error: 'Vault file not found.' });
      if (file.owner_id !== userId && req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ error: 'Zero-Trust Violation: Only the file owner or SuperAdmin can delete files.' });
      }

      // Soft delete
      await db.run(`UPDATE vault_files SET is_deleted = 1, updated_at = ? WHERE id = ?`, [new Date().toISOString(), fileId]);

      // Delete physical file
      if (fs.existsSync(file.storage_path)) {
        fs.unlinkSync(file.storage_path);
      }

      // Remove shares
      await db.run(`DELETE FROM file_shares WHERE file_id = ?`, [fileId]);

      await auditService.logEvent({
        actorId: userId,
        actorUsername: req.user.username,
        actorRole: req.user.role,
        actionType: 'FILE_DELETED',
        resourceId: `File #${file.id} (${file.filename})`,
        ipAddress: req.ip || '127.0.0.1',
        details: `Permanently deleted encrypted file "${file.filename}" (${file.original_size} bytes) from vault storage.`
      });

      return res.status(200).json({
        status: 'SUCCESS',
        message: `File "${file.filename}" has been permanently deleted from SentinelVault.`
      });
    } catch (err) {
      console.error('[DeleteFile Error]', err);
      return res.status(500).json({ error: 'Failed to delete vault file: ' + err.message });
    }
  }
}

const fileController = new FileController();
export default fileController;
