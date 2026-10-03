import crypto from 'crypto';
import db from '../config/database.js';

/**
 * Immutable Audit Ledger Service (Merkle Hash Chaining)
 * Every audit log is cryptographically chained to the previous record.
 * Any manual database tampering breaks the hash chain.
 */
class AuditService {
  /**
   * Log an immutable security event
   * @param {Object} event
   * @returns {Object} Created audit block
   */
  async logEvent({
    actorId = null,
    actorUsername = 'SYSTEM',
    actorRole = 'System',
    actionType,
    resourceId = '',
    ipAddress = '127.0.0.1',
    riskScore = 0.0,
    details = ''
  }) {
    const timestamp = new Date().toISOString();

    // 1. Retrieve the latest block to get prev_hash
    const lastLog = await db.get(`SELECT current_hash FROM audit_logs ORDER BY id DESC LIMIT 1`);
    const prevHash = lastLog ? lastLog.current_hash : '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis Block

    // 2. Compute current SHA-256 hash
    const payload = `${prevHash}|${timestamp}|${actorId}|${actionType}|${resourceId}|${details}|${riskScore}`;
    const currentHash = crypto.createHash('sha256').update(payload).digest('hex');

    // 3. Insert into immutable ledger
    const sql = `
      INSERT INTO audit_logs (
        timestamp, actor_id, actor_username, actor_role, action_type,
        resource_id, ip_address, risk_score, details, prev_hash, current_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.run(sql, [
      timestamp, actorId, actorUsername, actorRole, actionType,
      resourceId, ipAddress, riskScore, details, prevHash, currentHash
    ]);

    return {
      timestamp,
      actorUsername,
      actionType,
      prevHash,
      currentHash
    };
  }

  /**
   * Verify the cryptographic integrity of the entire audit ledger
   * @returns {Object} { isIntact, totalBlocks, tamperedBlockId, details, logs }
   */
  async verifyChainIntegrity() {
    const logs = await db.all(`SELECT * FROM audit_logs ORDER BY id ASC`);
    if (logs.length === 0) {
      return {
        isIntact: true,
        totalBlocks: 0,
        tamperedBlockId: null,
        details: 'Audit ledger is empty. Genesis state.',
        logs: []
      };
    }

    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < logs.length; i++) {
      const block = logs[i];

      // 1. Verify previous hash linkage
      if (block.prev_hash !== expectedPrevHash) {
        return {
          isIntact: false,
          totalBlocks: logs.length,
          tamperedBlockId: block.id,
          details: `Chain broken at Block #${block.id}: prev_hash mismatch. Expected ${expectedPrevHash.substring(0, 12)}... but found ${block.prev_hash.substring(0, 12)}...`,
          logs
        };
      }

      // 2. Recompute payload hash
      const payload = `${block.prev_hash}|${block.timestamp}|${block.actor_id}|${block.action_type}|${block.resource_id}|${block.details}|${block.risk_score}`;
      const recomputedHash = crypto.createHash('sha256').update(payload).digest('hex');

      if (block.current_hash !== recomputedHash) {
        return {
          isIntact: false,
          totalBlocks: logs.length,
          tamperedBlockId: block.id,
          details: `Cryptographic Tampering Detected at Block #${block.id} (${block.action_type})! Stored hash ${block.current_hash.substring(0, 12)}... does not match recomputed payload hash ${recomputedHash.substring(0, 12)}...!`,
          logs
        };
      }

      expectedPrevHash = block.current_hash;
    }

    return {
      isIntact: true,
      totalBlocks: logs.length,
      tamperedBlockId: null,
      details: `Cryptographic chain 100% verified across all ${logs.length} blocks. No tampering or row deletions detected.`,
      logs
    };
  }

  /**
   * Simulate a database attack by altering a log entry directly in SQL
   * @param {number} blockId 
   * @param {string} tamperedDetails 
   */
  async simulateTamper(blockId, tamperedDetails = '[UNAUTHORIZED DB TAMPERING] Altered log payload to conceal suspicious activity.') {
    const log = await db.get(`SELECT * FROM audit_logs WHERE id = ?`, [blockId]);
    if (!log) {
      throw new Error(`Block #${blockId} not found in audit ledger.`);
    }

    // Direct SQL update without recomputing consecutive hashes
    await db.run(`UPDATE audit_logs SET details = ? WHERE id = ?`, [tamperedDetails, blockId]);

    // Log the simulation attack itself
    await this.logEvent({
      actorUsername: 'ATTACK_SIMULATOR',
      actorRole: 'SecurityAuditor',
      actionType: 'SIMULATE_DB_TAMPER',
      resourceId: `Block #${blockId}`,
      details: `Simulated attacker modified details of Block #${blockId} directly in database.`
    });

    return { success: true, tamperedBlockId: blockId };
  }

  /**
   * Get paginated audit logs
   */
  async getLogs(limit = 100, offset = 0) {
    return await db.all(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?`, [limit, offset]);
  }
}

const auditService = new AuditService();
export default auditService;
