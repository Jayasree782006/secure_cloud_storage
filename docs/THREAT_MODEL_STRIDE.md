# STRIDE Threat Modeling & Risk Mitigation Report

## 1. Introduction & Methodology

This report presents the formal security threat modeling for the **SentinelVault Intelligent Zero-Trust Secure Cloud Storage System** using Microsoft's **STRIDE** framework. The evaluation identifies potential attack vectors across all system interfaces and outlines the engineered defenses embedded within the SentinelVault architecture.

---

## 2. STRIDE Threat Matrix & Architectural Defenses

| Threat Category | Potential Attack Vector in Cloud Storage | SentinelVault Engineered Mitigation | Verification & Audit Mechanism |
| :--- | :--- | :--- | :--- |
| **S** - Spoofing | Credential stuffing, stolen JWT access tokens, or session hijacking via compromised endpoints. | **Continuous Zero-Trust & Adaptive MFA**: Sessions are continuously monitored by the AI anomaly engine. If IP routing or geographic velocity shifts anomalously, active tokens are challenged with step-up 6-digit OTP verification or revoked immediately. | `zeroTrustMiddleware.js` & `/api/auth/verify-mfa` |
| **T** - Tampering | Malicious insider or compromised DB admin alters stored ciphertexts, permissions, or audit log entries. | **128-bit AES-GCM Auth Tags & Merkle Chaining**: File payloads cannot be modified without invalidating the GCM auth tag. Audit logs are chained via SHA-256 (`current_hash = SHA256(prev_hash + payload)`). Any SQL update breaks consecutive chaining. | `auditService.verifyIntegrity()` & test suite Block #1 tamper check |
| **R** - Repudiation | An authenticated user performs unauthorized file downloads or shares and denies executing the action. | **Immutable Chained Audit Logs**: Every API request generates a Merkle-linked audit record containing timestamp, IP address, user ID, and action hash. Because records cannot be deleted or altered without detection, non-repudiation is mathematically guaranteed. | `/api/audit/logs` & real-time UI blockchain viewer |
| **I** - Information Disclosure | Data breach resulting from raw database exfiltration, cloud storage bucket leakage, or man-in-the-middle attacks. | **Hybrid Envelope Cryptography**: Files are encrypted at rest with ephemeral AES-256-GCM keys. The DEK is encrypted via RSA-2048 OAEP using the owner's public key. Even if the database is exfiltrated, ciphertexts are unreadable without the private key passphrase. | `cryptoEngine.encryptEnvelope()` & `/api/vault/download` |
| **D** - Denial of Service | Automated botnets flooding authentication endpoints or ransomware bursting decryption attempts to exhaust resources. | **AI Behavioral Spikes & Rate Throttling**: The Python FastAPI AI microservice tracks rolling 60-second request velocity. Decryption bursts (>15 requests/min) or IP reputation anomalies trigger automatic session blocking and account lockout. | `anomaly_model.py` & SIMULATED_ATTACK_FLOOD tests |
| **E** - Elevation of Privilege | An enterprise user attempts to bypass clearance checks to access Top Secret Level 5 executive vault documents. | **Attribute-Based Access Control (ABAC)**: Access control is enforced not just by role, but by numerical clearance levels (`clearance_level >= file.clearance_level`) evaluated at both middleware and controller layers prior to DEK unwrapping. | `authService.verifyClearance()` & RBAC/ABAC route guards |

---

## 3. Deep-Dive: Protection Against Ransomware & Insider Threats

### 3.1 Ransomware Decryption Spike Mitigation
Ransomware attacks typically attempt to read, encrypt, and exfiltrate mass files in short time windows. SentinelVault mitigates this via:
- **Velocity Heuristics**: The AI engine calculates standard deviation Z-scores on transaction timestamps.
- **Immediate Circuit Breaker**: When decryption failure velocity exceeds Gaussian baselines (e.g., during brute-force key attacks), the system issues a `HIGH_BLOCKED` directive, instantly severing database connections for that user identity.

### 3.2 Master Vault Key Recovery via Shamir's Secret Sharing
If an executive or administrator loses their primary RSA private key passphrase, traditional systems face catastrophic data loss. SentinelVault solves this via **Shamir's Secret Sharing**:
- The root master recovery key is split into $N=5$ polynomial shares distributed to 5 distinct C-level executives.
- No individual share contains any bits of the key.
- Only when a threshold of $K=3$ executives combine their shares in the **Crypto Studio Lab** can the Lagrange polynomial interpolation algorithm reconstruct the master secret over the $1025$-bit prime field.
