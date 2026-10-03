import cryptoEngine from './src/crypto/cryptoEngine.js';
import auditService from './src/audit/auditService.js';
import db from './src/config/database.js';

console.log('===============================================================');
console.log('🛡️  SENTINELVAULT CRYPTOGRAPHIC & AUDIT VERIFICATION SUITE');
console.log('===============================================================\n');

const runTests = async () => {
  try {
    await db.init();
    console.log('[Test 1] SQLite WASM Database initialize ... PASS');

    // Test AES-256-GCM Bulk Encryption
    const sampleText = 'CONFIDENTIAL ENTERPRISE REPORT: Q3 ZERO-TRUST METRICS AND ARCHITECTURE.';
    const sampleBuffer = Buffer.from(sampleText, 'utf8');
    const { encryptedBuffer, dek, iv, authTag } = cryptoEngine.encryptBuffer(sampleBuffer);
    
    console.log(`[Test 2] AES-256-GCM Encryption ... PASS (Ciphertext size: ${encryptedBuffer.length} bytes)`);

    // Test AES-256-GCM Decryption
    const decryptedBuffer = cryptoEngine.decryptBuffer(encryptedBuffer, dek, iv, authTag);
    if (decryptedBuffer.toString('utf8') !== sampleText) {
      throw new Error('AES-256-GCM Decryption mismatch');
    }
    console.log('[Test 3] AES-256-GCM Decryption & AuthTag Verification ... PASS');

    // Test RSA Key Generation & Envelope Wrapping
    const { publicKeyPem, privateKeyPem, fingerprint } = cryptoEngine.generateRSAKeyPair();
    console.log(`[Test 4] RSA-2048 Key Pair Generation ... PASS (Fingerprint: ${fingerprint})`);

    const wrappedDek = cryptoEngine.wrapDEK(dek, publicKeyPem);
    console.log(`[Test 5] RSA Envelope Key Wrapping (DEK -> Ciphertext) ... PASS (Wrapped size: ${wrappedDek.length} chars)`);

    const unwrappedDek = cryptoEngine.unwrapDEK(wrappedDek, privateKeyPem);
    if (unwrappedDek !== dek) {
      throw new Error('RSA Envelope Unwrapping mismatch');
    }
    console.log('[Test 6] RSA Envelope Key Unwrapping (Ciphertext -> DEK) ... PASS');

    // Test PBKDF2 Private Key Encryption
    const passphrase = 'secure_user_passphrase_2026';
    const encryptedPrivateKeyJson = cryptoEngine.encryptPrivateKey(privateKeyPem, passphrase);
    const decryptedPrivateKey = cryptoEngine.decryptPrivateKey(encryptedPrivateKeyJson, passphrase);
    if (decryptedPrivateKey !== privateKeyPem) {
      throw new Error('PBKDF2 Private key protection mismatch');
    }
    console.log('[Test 7] PBKDF2 + AES-GCM Private Key Protection & Unlocking ... PASS');

    // Test Shamir's Secret Sharing (SSS)
    const secretMessage = 'MASTER_VAULT_RECOVERY_KEY_77889900';
    const secretHex = Buffer.from(secretMessage, 'utf8').toString('hex');
    const shares = cryptoEngine.splitSecret(secretHex, 5, 3);
    console.log(`[Test 8] Shamir's Secret Sharing Split (N=5, K=3) ... PASS (Generated ${shares.length} shares)`);

    const selectedShares = [shares[0], shares[2], shares[4]]; // Any 3 of 5
    const reconstructedSecret = cryptoEngine.reconstructSecret(selectedShares);
    if (reconstructedSecret !== secretMessage) {
      throw new Error(`Shamir reconstruction failed: Expected "${secretMessage}", got "${reconstructedSecret}"`);
    }
    console.log('[Test 9] Shamir Lagrange Polynomial Reconstruction (K=3) ... PASS');

    // Test Immutable Audit Ledger Merkle Chaining
    await auditService.logEvent({
      actorUsername: 'TEST_USER_1',
      actionType: 'TEST_ACTION_A',
      details: 'First test audit block'
    });
    await auditService.logEvent({
      actorUsername: 'TEST_USER_2',
      actionType: 'TEST_ACTION_B',
      details: 'Second test audit block'
    });

    const verifyBefore = await auditService.verifyChainIntegrity();
    if (!verifyBefore.isIntact) {
      throw new Error('Audit ledger check failed on intact chain: ' + verifyBefore.details);
    }
    console.log(`[Test 10] Immutable Merkle Chain Integrity Verification ... PASS (${verifyBefore.totalBlocks} blocks intact)`);

    // Simulate Attack / DB Tamper
    const logs = await auditService.getLogs(10, 0);
    if (logs.length > 0) {
      const targetBlockId = logs[logs.length - 1].id; // Older block
      await auditService.simulateTamper(targetBlockId, '[MALICIOUS HACKER TAMPERED WITH RECORD]');
      console.log(`[Test 11] Simulated SQL Tamper Attack injected into Block #${targetBlockId} ... PASS`);

      const verifyAfter = await auditService.verifyChainIntegrity();
      if (verifyAfter.isIntact) {
        throw new Error('Audit ledger failed to catch tampered DB record!');
      }
      console.log(`[Test 12] Merkle Chain Tamper Detection Triggered ... PASS! (Caught error: "${verifyAfter.details}")`);
    }

    console.log('\n===============================================================');
    console.log('✅ ALL 12 CRYPTOGRAPHIC & AUDIT LEDGER UNIT TESTS PASSED!');
    console.log('===============================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILURE:', err);
    process.exit(1);
  }
};

runTests();
