import crypto from 'crypto';

/**
 * Enterprise Hybrid Cryptography Engine
 * Provides AES-256-GCM bulk encryption, RSA-2048 Envelope Key Wrapping,
 * PBKDF2 private key protection, and Shamir's Secret Sharing.
 */
class CryptoEngine {
  /**
   * Encrypt a data buffer using AES-256-GCM
   * @param {Buffer} buffer - Plaintext file data
   * @returns {Object} { encryptedBuffer, dek: base64, iv: base64, authTag: base64 }
   */
  encryptBuffer(buffer) {
    const dek = crypto.randomBytes(32); // 256-bit Data Encryption Key
    const iv = crypto.randomBytes(12);  // 96-bit Initialization Vector for GCM

    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    const encryptedBuffer = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedBuffer,
      dek: dek.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }

  /**
   * Decrypt an AES-256-GCM encrypted buffer
   * @param {Buffer} encryptedBuffer 
   * @param {string} dekBase64 
   * @param {string} ivBase64 
   * @param {string} authTagBase64 
   * @returns {Buffer} Plaintext buffer
   */
  decryptBuffer(encryptedBuffer, dekBase64, ivBase64, authTagBase64) {
    const dek = Buffer.from(dekBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
    decipher.setAuthTag(authTag);

    try {
      const plaintextBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
      return plaintextBuffer;
    } catch (err) {
      throw new Error('Cryptographic verification failed: Ciphertext or AuthTag has been tampered with.');
    }
  }

  /**
   * Generate an RSA-2048 key pair for asymmetric envelope wrapping
   * @returns {Object} { publicKeyPem, privateKeyPem, fingerprint }
   */
  generateRSAKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Compute SHA-256 fingerprint of public key
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
    const fingerprint = hash.match(/.{1,2}/g).slice(0, 16).join(':');

    return {
      publicKeyPem: publicKey,
      privateKeyPem: privateKey,
      fingerprint
    };
  }

  /**
   * Encrypt user's private key using PBKDF2 passphrase derivation + AES-256-GCM
   * @param {string} privateKeyPem 
   * @param {string} passphrase 
   * @returns {string} JSON string containing salt, iv, authTag, and ciphertext
   */
  encryptPrivateKey(privateKeyPem, passphrase) {
    const salt = crypto.randomBytes(16);
    const derivedKey = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
    let ciphertext = cipher.update(privateKeyPem, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      ciphertext
    });
  }

  /**
   * Decrypt protected private key using passphrase
   * @param {string} encryptedJson 
   * @param {string} passphrase 
   * @returns {string} Plaintext privateKeyPem
   */
  decryptPrivateKey(encryptedJson, passphrase) {
    try {
      const data = JSON.parse(encryptedJson);
      const salt = Buffer.from(data.salt, 'base64');
      const iv = Buffer.from(data.iv, 'base64');
      const authTag = Buffer.from(data.authTag, 'base64');
      const ciphertext = data.ciphertext;

      const derivedKey = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
      const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
      decipher.setAuthTag(authTag);

      let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
      plaintext += decipher.final('utf8');
      return plaintext;
    } catch (err) {
      throw new Error('Invalid passphrase or corrupted private key vault.');
    }
  }

  /**
   * Wrap (encrypt) an AES DEK using an RSA Public Key (RSA-OAEP with SHA-256)
   * @param {string} dekBase64 
   * @param {string} publicKeyPem 
   * @returns {string} Base64 wrapped DEK
   */
  wrapDEK(dekBase64, publicKeyPem) {
    const bufferToEncrypt = Buffer.from(dekBase64, 'base64');
    const wrappedBuffer = crypto.publicEncrypt({
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    }, bufferToEncrypt);
    return wrappedBuffer.toString('base64');
  }

  /**
   * Unwrap (decrypt) an AES DEK using an RSA Private Key
   * @param {string} wrappedDekBase64 
   * @param {string} privateKeyPem 
   * @returns {string} Base64 DEK
   */
  unwrapDEK(wrappedDekBase64, privateKeyPem) {
    const bufferToDecrypt = Buffer.from(wrappedDekBase64, 'base64');
    const unwrappedBuffer = crypto.privateDecrypt({
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    }, bufferToDecrypt);
    return unwrappedBuffer.toString('base64');
  }

  // ==========================================
  // Shamir's Secret Sharing (1025-bit Prime Field)
  // ==========================================

  /**
   * Split a hex secret into N shares with threshold K
   * @param {string} secretHex 
   * @param {number} totalShares (N)
   * @param {number} threshold (K)
   * @returns {Array<{ x: string, y: string }>} Shares
   */
  splitSecret(secretHex, totalShares = 5, threshold = 3) {
    if (threshold > totalShares) throw new Error('Threshold cannot exceed total shares.');
    
    // 1025-bit prime number: 2^1024 + 643
    const PRIME = BigInt('0x10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000283');
    const secretBigInt = BigInt('0x' + secretHex);
    if (secretBigInt >= PRIME) {
      throw new Error('Secret exceeds 1024-bit maximum length for single-field Shamir sharing.');
    }

    // Generate random coefficients a_1, a_2, ..., a_{k-1}
    const coeffs = [secretBigInt];
    for (let i = 1; i < threshold; i++) {
      const randHex = crypto.randomBytes(100).toString('hex');
      coeffs.push(BigInt('0x' + randHex) % PRIME);
    }

    // Evaluate polynomial f(x) at x = 1, 2, ..., N
    const shares = [];
    for (let x = 1; x <= totalShares; x++) {
      const xBig = BigInt(x);
      let yBig = BigInt(0);
      for (let i = coeffs.length - 1; i >= 0; i--) {
        yBig = (yBig * xBig + coeffs[i]) % PRIME;
      }
      shares.push({
        x: x.toString(),
        y: yBig.toString(16)
      });
    }

    return shares;
  }

  /**
   * Reconstruct secret from K shares using Lagrange interpolation
   * @param {Array<{ x: string, y: string }>} shares 
   * @returns {string} Plaintext secret
   */
  reconstructSecret(shares) {
    const PRIME = BigInt('0x10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000283');
    let secret = BigInt(0);

    for (let i = 0; i < shares.length; i++) {
      const xi = BigInt(shares[i].x);
      const yi = BigInt('0x' + shares[i].y);

      let num = BigInt(1);
      let den = BigInt(1);

      for (let j = 0; j < shares.length; j++) {
        if (i === j) continue;
        const xj = BigInt(shares[j].x);
        num = (num * (-xj)) % PRIME;
        den = (den * (xi - xj)) % PRIME;
      }

      // Compute modular inverse of den modulo PRIME using Fermat's Little Theorem
      const invDen = this._modInverse(den, PRIME);
      const term = (yi * num % PRIME * invDen) % PRIME;
      secret = (secret + term) % PRIME;
    }

    if (secret < BigInt(0)) secret = (secret + PRIME) % PRIME;

    const hexStr = secret.toString(16);
    const paddedHex = hexStr.length % 2 === 0 ? hexStr : '0' + hexStr;
    return Buffer.from(paddedHex, 'hex').toString('utf8');
  }

  _modInverse(a, m) {
    let [m0, x0, x1] = [m, BigInt(0), BigInt(1)];
    if (m === BigInt(1)) return BigInt(0);
    let currA = (a % m + m) % m;
    while (currA > BigInt(1)) {
      const q = currA / m0;
      let t = m0;
      m0 = currA % m0;
      currA = t;
      t = x0;
      x0 = x1 - q * x0;
      x1 = t;
    }
    if (x1 < BigInt(0)) x1 += m;
    return x1;
  }
}

const cryptoEngine = new CryptoEngine();
export default cryptoEngine;
