# File Upload Feature - User Guide

## Overview
Users can now upload their own files to SentinelVault with full encryption and zero-trust protection.

---

## 🚀 How to Upload Files

### Option 1: Drag & Drop
1. Navigate to **Vault Explorer** tab
2. Click **"Encrypt & Upload File"** button
3. **Drag your files** directly onto the upload area

### Option 2: Browse Files
1. Navigate to **Vault Explorer** tab
2. Click **"Encrypt & Upload File"** button
3. Click **"Browse Files"** button
4. Select files from your computer

### Option 3: Enter Text Content
1. Navigate to **Vault Explorer** tab
2. Click **"Encrypt & Upload File"** button
3. Enter text directly in the **"Confidential Content"** textarea
4. Give it a filename

---

## 📋 Supported File Types
- **All file types** are supported
- **Max file size:** 50MB per file
- Files are encrypted with AES-256-GCM before storage

---

## 🔐 Encryption Process

When you upload a file, SentinelVault performs:

1. **Step 1:** Generate 256-bit AES Data Encryption Key (DEK)
2. **Step 2:** Encrypt file with AES-256-GCM + Authentication Tag
3. **Step 3:** Wrap DEK with your RSA-2048 Public Key (Envelope)
4. **Step 4:** Store in immutable audit ledger with Merkle hash chain

---

## 📁 File Management

### View Uploaded Files
1. Go to **Vault Explorer**
2. All uploaded files appear in the grid
3. Each file shows:
   - Filename
   - Encryption status
   - Upload timestamp
   - Size

### Download/Decrypt Files
1. Click **"Decrypt & View"** button on any file
2. Enter your RSA passphrase: `password123`
3. File is decrypted and displayed

### Share Files
1. Click **"Share"** (chain icon) on any file
2. Select recipient username (bob, alice, auditor, admin)
3. Set permission level (READ)
4. Recipient gets access via their own encrypted DEK

### Delete Files
1. Click **"Delete"** (trash icon) on any file
2. File is permanently removed from vault

---

## 🔑 Security Details

- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Derivation:** PBKDF2 from passphrase
- **RSA Wrapping:** RSA-2048 OAEP
- **Auth Verification:** 128-bit Authentication Tag
- **Audit Trail:** Merkle-chained immutable logs

---

## 📊 File Upload Example

```
Your File: document.pdf (2.3 MB)
         ↓
    [AES-256-GCM Encryption]
         ↓
    Encrypted Ciphertext + IV + Auth Tag
         ↓
    [RSA-2048 Envelope Wrapping]
         ↓
    Stored in: /backend/data/vault_storage/
    Metadata in: SQLite Database
         ↓
    [Merkle Hash Chain Added to Audit Ledger]
         ↓
    Ready for secure download/sharing
```

---

## ⚙️ Configuration

### Backend Upload Limits
- **Max Size:** 50MB (configurable in backend/src/routes/index.js)
- **Storage Path:** `backend/data/vault_storage/`
- **Database:** SQLite in `backend/data/sentinelvault.db`

### Frontend Upload Component
- **Location:** `frontend/src/components/FileUpload.jsx`
- **Styling:** `frontend/src/styles/FileUpload.css`
- **Usage:** Drag-drop enabled, file browser support

---

## 🐛 Troubleshooting

### File upload fails
- Check file size (max 50MB)
- Verify passphrase is correct
- Ensure you're logged in

### Can't decrypt file
- Verify RSA passphrase: `password123`
- Check file owner permissions
- Try refreshing vault

### Upload too slow
- File is being encrypted, this is normal
- Large files (>10MB) take longer
- Check network connectivity

---

## 📝 Demo Users & Passphrases

| Username | Clearance | Passphrase | Role |
|----------|-----------|------------|------|
| alice | Level 2 | password123 | Enterprise User |
| bob | Level 2 | password123 | Enterprise User |
| auditor | Level 4 | password123 | Security Auditor |
| admin | Level 5 | password123 | SuperAdmin |

---

## API Endpoints

### Upload File
```
POST /api/vault/upload
Content-Type: application/json

{
  "filename": "document.txt",
  "fileData": "file content here",
  "passphrase": "password123",
  "clearanceLevel": 2
}
```

### Download/Decrypt File
```
POST /api/vault/download/:fileId

{
  "passphrase": "password123"
}
```

### List Files
```
GET /api/vault/files
```

### Share File
```
POST /api/vault/share

{
  "fileId": 1,
  "recipientUsername": "bob",
  "permissionLevel": "READ"
}
```

---

## 🎯 Next Steps

- Upload your first file and watch the cryptographic pipeline visualizer
- Try sharing files with other users
- Explore the Audit Ledger to see immutable transaction logs
- Use CryptoStudio to create Shamir secret shares for key backup

