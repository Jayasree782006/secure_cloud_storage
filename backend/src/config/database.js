import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'sentinelvault.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class DatabaseManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    try {
      const SQL = await initSqlJs();
      if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        this.db = new SQL.Database(fileBuffer);
        console.log('[Database] Loaded existing database from:', DB_PATH);
      } else {
        this.db = new SQL.Database();
        console.log('[Database] Created new SQLite WASM database.');
      }
      this.isInitialized = true;
      await this.runMigrations();
      this.save();
    } catch (error) {
      console.error('[Database] Initialization error:', error);
      throw error;
    }
  }

  save() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (err) {
      console.error('[Database] Failed to persist database:', err);
    }
  }

  async run(sql, params = []) {
    if (!this.isInitialized) await this.init();
    try {
      this.db.run(sql, params);
      this.save();
      return { success: true };
    } catch (err) {
      console.error('[Database Run Error]', err.message, '| SQL:', sql);
      throw err;
    }
  }

  async get(sql, params = []) {
    if (!this.isInitialized) await this.init();
    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      const hasRow = stmt.step();
      let row = null;
      if (hasRow) {
        row = stmt.getAsObject();
      }
      stmt.free();
      return row;
    } catch (err) {
      console.error('[Database Get Error]', err.message, '| SQL:', sql);
      throw err;
    }
  }

  async all(sql, params = []) {
    if (!this.isInitialized) await this.init();
    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    } catch (err) {
      console.error('[Database All Error]', err.message, '| SQL:', sql);
      throw err;
    }
  }

  async runMigrations() {
    console.log('[Database] Running database migrations...');
    
    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'EnterpriseUser',
        clearance_level INTEGER DEFAULT 1,
        mfa_secret TEXT,
        is_locked INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // User Keys (RSA Public & Encrypted Private Key for Envelope Encryption)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_keys (
        user_id INTEGER PRIMARY KEY,
        public_key_pem TEXT NOT NULL,
        encrypted_private_key_pem TEXT NOT NULL,
        key_fingerprint TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Vault Files (AES-256-GCM Encrypted files + RSA Wrapped DEK)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS vault_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        encrypted_dek TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );
    `);

    // File Shares (For sharing encrypted DEKs with other users)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS file_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        grantor_id INTEGER NOT NULL,
        grantee_id INTEGER NOT NULL,
        recipient_encrypted_dek TEXT NOT NULL,
        permission_level TEXT DEFAULT 'DOWNLOAD',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(file_id) REFERENCES vault_files(id) ON DELETE CASCADE,
        FOREIGN KEY(grantor_id) REFERENCES users(id),
        FOREIGN KEY(grantee_id) REFERENCES users(id)
      );
    `);

    // Immutable Audit Logs (SHA-256 Merkle Chain)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        actor_id INTEGER,
        actor_username TEXT,
        actor_role TEXT,
        action_type TEXT NOT NULL,
        resource_id TEXT,
        ip_address TEXT,
        risk_score REAL DEFAULT 0.0,
        details TEXT,
        prev_hash TEXT NOT NULL,
        current_hash TEXT NOT NULL
      );
    `);

    // Security Incidents
    this.db.run(`
      CREATE TABLE IF NOT EXISTS security_incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        actor_id INTEGER,
        incident_type TEXT NOT NULL,
        severity TEXT DEFAULT 'HIGH',
        risk_score REAL DEFAULT 0.0,
        ip_address TEXT,
        details TEXT,
        status TEXT DEFAULT 'OPEN'
      );
    `);

    // Simulation Results (Zero-Trust Attack Simulations)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS simulation_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        username TEXT,
        attack_type TEXT NOT NULL,
        risk_score REAL DEFAULT 0.0,
        risk_level TEXT,
        triggering_factors TEXT,
        recommendation TEXT,
        vectors TEXT
      );
    `);

    this.save();
    console.log('[Database] Migrations completed successfully.');
  }
}

const db = new DatabaseManager();
export default db;
