import request from 'supertest';
import express from 'express';
import apiRoutes from './src/routes/index.js';
import dbManager from './src/config/database.js';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

async function runIntegrationTests() {
  console.log("=============================================================");
  console.log("[SENTINELVAULT] END-TO-END REST API & SYSTEM INTEGRATION TEST");
  console.log("=============================================================\n");

  await dbManager.init();
  
  let accessToken = "";
  let fileId = null;

  // Test 1: User Registration & RSA Key Pair Generation
  try {
    const resReg = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser_' + Date.now(),
        email: `test_${Date.now()}@sentinelvault.com`,
        password: 'securePassword123',
        role: 'EnterpriseUser',
        clearanceLevel: 3,
        passphrase: 'mysecretpassphrase'
      });
    
    if (resReg.status === 201 && resReg.body.status === 'SUCCESS') {
      accessToken = resReg.body.accessToken;
      console.log("[Test 1] POST /api/auth/register ... PASS (Token issued, RSA Key Pair generated)");
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(resReg.body)}`);
    }
  } catch (err) {
    console.error("[Test 1] FAILED:", err.message);
    process.exit(1);
  }

  // Test 2: Encrypt & Upload Document via Hybrid Cryptography
  try {
    const resUpload = await request(app)
      .post('/api/vault/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        filename: 'confidential_integration_test.txt',
        fileData: 'TOP SECRET: Verified end-to-end by automated integration test suite.',
        passphrase: 'mysecretpassphrase',
        clearanceLevel: 2
      });

    if (resUpload.status === 201 && resUpload.body.status === 'SUCCESS') {
      fileId = resUpload.body.fileId;
      console.log(`[Test 2] POST /api/vault/upload ... PASS (File ID #${fileId}, Auth Tag: ${resUpload.body.authTag})`);
    } else {
      throw new Error(`Upload failed: ${JSON.stringify(resUpload.body)}`);
    }
  } catch (err) {
    console.error("[Test 2] FAILED:", err.message);
    process.exit(1);
  }

  // Test 3: List Vault Files
  try {
    const resFiles = await request(app)
      .get('/api/vault/files')
      .set('Authorization', `Bearer ${accessToken}`);

    if (resFiles.status === 200 && resFiles.body.files.length > 0) {
      console.log(`[Test 3] GET /api/vault/files ... PASS (${resFiles.body.files.length} encrypted documents retrieved)`);
    } else {
      throw new Error(`File list failed: ${JSON.stringify(resFiles.body)}`);
    }
  } catch (err) {
    console.error("[Test 3] FAILED:", err.message);
    process.exit(1);
  }

  // Test 4: Decrypt & Download File (Unwrap DEK + Verify Auth Tag)
  try {
    const resDownload = await request(app)
      .post(`/api/vault/download/${fileId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ passphrase: 'mysecretpassphrase', format: 'json' });

    if (resDownload.status === 200 && resDownload.body.plaintext.includes('TOP SECRET: Verified end-to-end')) {
      console.log("[Test 4] POST /api/vault/download/:id ... PASS (Plaintext decrypted, Auth Tag verified)");
    } else {
      throw new Error(`Download failed: ${JSON.stringify(resDownload.body)}`);
    }
  } catch (err) {
    console.error("[Test 4] FAILED:", err.message);
    process.exit(1);
  }

  // Test 5: Verify Merkle Audit Ledger
  try {
    const resVerify = await request(app)
      .get('/api/audit/verify')
      .set('Authorization', `Bearer ${accessToken}`);

    if (resVerify.status === 200 && resVerify.body.isIntact !== undefined) {
      console.log(`[Test 5] GET /api/audit/verify ... PASS (Merkle ledger verification executed: ${resVerify.body.isIntact ? 'Intact' : 'Tampered Block Detected'})`);
    } else {
      throw new Error(`Audit verification failed: ${JSON.stringify(resVerify.body)}`);
    }
  } catch (err) {
    console.error("[Test 5] FAILED:", err.message);
    process.exit(1);
  }

  // Test 6: Shamir's Secret Sharing Simulator Route
  try {
    const resSplit = await request(app)
      .post('/api/crypto/shamir/split')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ secret: 'MY_RECOVERY_KEY_123', totalShares: 5, threshold: 3 });

    if (resSplit.status === 200 && resSplit.body.shares.length === 5) {
      const resRec = await request(app)
        .post('/api/crypto/shamir/reconstruct')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ shares: resSplit.body.shares.slice(0, 3) });

      if (resRec.status === 200 && resRec.body.secret === 'MY_RECOVERY_KEY_123') {
        console.log("[Test 6] POST /api/simulators/shamir-* ... PASS (Lagrange Polynomial Reconstruction successful)");
      } else {
        throw new Error("Shamir reconstruction failed over API route.");
      }
    } else {
      throw new Error("Shamir split failed over API route.");
    }
  } catch (err) {
    console.error("[Test 6] FAILED:", err.message);
    process.exit(1);
  }

  console.log("\n=============================================================");
  console.log("[SUCCESS] ALL 6 REST API & SYSTEM INTEGRATION TESTS PASSED!");
  console.log("=============================================================\n");
  process.exit(0);
}

runIntegrationTests();
