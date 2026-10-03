# SentinelVault User & Deployment Guide (Final Year Capstone)

## 1. Project Overview

**SentinelVault** is a production-grade, modular cloud storage platform designed for a Computer Science Engineering final-year capstone project. It runs 100% locally without requiring any paid cloud subscriptions (AWS/GCP/Azure), utilizing an embedded SQLite WASM database, Node.js cryptography engine, and Python FastAPI AI microservice.

---

## 2. System Prerequisites

To run SentinelVault locally, ensure your machine has:
- **Node.js**: v18.0.0 or higher (with `npm`)
- **Python**: v3.10.0 or higher (with `pip`)
- **OS**: Windows, macOS, or Linux

---

## 3. Quickstart Deployment Instructions

### Step 1: Start the Backend Keystore & API Server (Port 5000)
Open a terminal, navigate to the `/backend` directory, install dependencies, and start the server:
```bash
cd backend
npm install
node server.js
```
*Expected Output*: Notice `[Database] Migrations completed successfully.` and `🚀 SentinelVault Backend Server listening on port 5000`.

### Step 2: Start the Python AI Anomaly Microservice (Port 8001)
Open a second terminal, navigate to the `/ai-engine` directory, install Python packages, and launch FastAPI:
```bash
cd ai-engine
pip install -r requirements.txt
python app.py
```
*Expected Output*: Notice `[ONLINE] Listening on http://0.0.0.0:8001`.

### Step 3: Launch the Glassmorphism Frontend UI (Port 5173)
Open a third terminal, navigate to `/frontend`, install packages, and start the Vite development server:
```bash
cd frontend
npm install
npm run dev
```
Open your web browser and navigate to: **`http://localhost:5173`**

---

## 4. Evaluator Verification Walkthrough (For Grading)

When presenting SentinelVault to project evaluators or professors, follow this structured demo checklist:

### Demo 1: Hybrid Envelope Cryptography in Action
1. On the **Command Center**, click **"Open Vault Explorer"** or select the **Secure Vault** tab.
2. Click **"Encrypt & Upload File"**. Enter a document name and secret text payload.
3. Observe the real-time **Cryptographic Visualizer** step through:
   - Generating ephemeral 256-bit AES DEK + 96-bit IV.
   - Encrypting payload via AES-256-GCM + generating 128-bit Auth Tag.
   - Unlocking RSA-2048 Public Key and wrapping the DEK into an RSA Envelope.
4. Once saved, click **"Decrypt & View"** on the file card. Enter passphrase `password123` to prove real-time RSA unwrapping and Auth Tag integrity verification.

### Demo 2: Zero-Trust Impossible Travel & Adaptive MFA Step-Up
1. Navigate to the **Zero-Trust Simulator** tab.
2. Click **"2. Impossible Travel Velocity Jump (Tokyo, Japan)"**.
3. Observe the AI Threat Engine calculate an elevated Risk Score (e.g., `80/100`) and trigger the **Step-Up MFA Challenge**.
4. Enter demo OTP code **`123456`** and click **"Verify OTP"** to demonstrate adaptive step-up authentication.
5. Next, click **"3. Untrusted Zone Proxy Attack (Moscow, Russia)"** to show immediate Zero-Trust account lockdown (`HIGH_BLOCKED`).

### Demo 3: Shamir's Secret Sharing over Galois Prime Field
1. Navigate to the **Crypto Studio** tab.
2. Under **Shamir's Secret Sharing (1025-bit Prime Field)**, enter any recovery key (e.g. `MASTER_VAULT_RECOVERY_KEY_77889900`).
3. Leave Total Shares at $N=5$ and Threshold at $K=3$. Click **"Generate Polynomial Shares"**.
4. Check the boxes next to any **3 shares** and click **"Reconstruct Secret"**. Notice the mathematical Lagrange interpolation reconstructs the exact string!

### Demo 4: Immutable Merkle Blockchain & Tamper Detection
1. Navigate to the **Audit Ledger** tab.
2. Click **"Verify Merkle Chain"** to verify that all block hashes match their SHA-256 digests (`100% Intact`).
3. Click the red **"Simulate DB Tamper Attack"** button. This injects a malicious SQL modification directly into Block #1.
4. Notice the system immediately catches the breach and displays a bright red cryptographic tamper alert:
   > **CRYPTOGRAPHIC TAMPERING DETECTED IN LEDGER! Block #1 stored hash does not match recomputed payload hash!**
