# SentinelVault REST API & Microservice Endpoints Specification

## 1. Authentication & Zero-Trust Services (`/api/auth`)

### `POST /api/auth/register`
Enrolls a new user, generates an RSA-2048 key pair, encrypts the private key via PBKDF2, and initializes security clearance.
- **Request Body**:
  ```json
  {
    "username": "alice",
    "email": "alice@sentinelvault.com",
    "password": "securePassword123",
    "role": "EnterpriseUser",
    "clearanceLevel": 2,
    "passphrase": "passphraseToProtectPrivateKey"
  }
  ```
- **Response**: `201 Created` - Returns JWT access & refresh tokens along with public key PEM.

### `POST /api/auth/login`
Authenticates user credentials and queries the Python AI Anomaly Microservice for risk evaluation.
- **Request Headers**: `x-simulated-location`, `x-simulated-attack`
- **Response (Score < 30)**: `200 OK` - `{ status: "SUCCESS", accessToken, refreshToken, user }`
- **Response (30 <= Score < 70)**: `200 OK` - `{ status: "MFA_REQUIRED", mfaToken, riskScore, triggeringFactors }`
- **Response (Score >= 70)**: `403 Forbidden` - `{ status: "BLOCKED", riskScore, recommendation }`

### `POST /api/auth/verify-mfa`
Verifies Step-Up 6-digit OTP challenge when behavioral anomalies are detected.
- **Request Body**: `{ "mfaToken": "jwt_challenge_token", "otpCode": "123456" }`
- **Response**: `200 OK` - Issues authenticated JWT access token.

---

## 2. Secure Vault Storage Pipeline (`/api/vault`)

### `GET /api/vault/files`
Retrieves all vault files owned by or shared with the authenticated user.
- **Headers**: `Authorization: Bearer <token>`

### `POST /api/vault/upload`
Executes real-time hybrid cryptography (AES-256-GCM + RSA-2048 Envelope) and logs to Merkle chain.
- **Request Body**:
  ```json
  {
    "filename": "top_secret_project.txt",
    "fileData": "Confidential text payload...",
    "passphrase": "passphraseToUnlockPrivateKey",
    "clearanceLevel": 3
  }
  ```
- **Response**: `201 Created` - `{ status: "SUCCESS", fileId, authTag, wrappedDek }`

### `POST /api/vault/download/:fileId`
Unwraps DEK using RSA private key, decrypts ciphertext, and verifies AES-GCM Auth Tag.
- **Request Body**: `{ "passphrase": "passphraseToUnlockPrivateKey" }`
- **Response**: `200 OK` - `{ status: "SUCCESS", plaintext, unwrappedDek, authTag }`

### `POST /api/vault/share`
Grants access by wrapping the file's DEK with the target recipient's RSA public key.
- **Request Body**: `{ "fileId": 1, "targetUsername": "bob", "permission": "READ" }`

---

## 3. Immutable Audit Ledger (`/api/audit`)

### `GET /api/audit/logs`
Returns chronological Merkle chain logs.
### `GET /api/audit/verify`
Iterates over the entire database ledger, recomputing SHA-256 block hashes to verify 100% integrity. Returns `{ valid: true, totalBlocks: N }` or flags tampered block IDs.

---

## 4. Python AI Threat Microservice (`http://localhost:8001`)

### `POST /evaluate-risk`
Evaluates transaction metadata against Isolation Forest and heuristic behavioral vectors.
### `POST /simulate-attack`
Injects simulated attack telemetry (`MOSCOW_PROXY_FLOOD`, `IMPOSSIBLE_TRAVEL_TOKYO`, `MIDNIGHT_RANSOMWARE_DEC_SPIKE`) for live educational demonstration.
