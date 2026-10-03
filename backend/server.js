import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import db from './src/config/database.js';
import routes from './src/routes/index.js';
import authService from './src/services/authService.js';
import auditService from './src/audit/auditService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Utility Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-simulated-location', 'x-simulated-attack', 'x-key-passphrase']
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// API Routes
app.use('/api', routes);

// System Health & Status
app.get('/api/health', async (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'SentinelVault Enterprise Zero-Trust Cloud Storage API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Default Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Exception]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected cryptographic or system fault occurred.'
  });
});

// Initialize Database & Default Accounts
const initializeServer = async () => {
  try {
    await db.init();
    console.log('[SentinelVault] SQLite WASM Database online.');

    // Seed default demo accounts if database is empty
    const adminCheck = await db.get(`SELECT id FROM users WHERE email = ?`, ['admin@sentinelvault.com']);
    if (!adminCheck) {
      console.log('[SentinelVault] Seeding default enterprise accounts for evaluation...');
      
      await authService.register({
        username: 'admin',
        email: 'admin@sentinelvault.com',
        password: 'password123',
        role: 'SuperAdmin',
        clearanceLevel: 5,
        passphrase: 'password123'
      });

      await authService.register({
        username: 'auditor',
        email: 'auditor@sentinelvault.com',
        password: 'password123',
        role: 'SecurityAuditor',
        clearanceLevel: 4,
        passphrase: 'password123'
      });

      await authService.register({
        username: 'alice',
        email: 'alice@sentinelvault.com',
        password: 'password123',
        role: 'EnterpriseUser',
        clearanceLevel: 2,
        passphrase: 'password123'
      });

      await authService.register({
        username: 'bob',
        email: 'bob@sentinelvault.com',
        password: 'password123',
        role: 'EnterpriseUser',
        clearanceLevel: 2,
        passphrase: 'password123'
      });

      await auditService.logEvent({
        actorUsername: 'SYSTEM_BOOT',
        actionType: 'SYSTEM_INITIALIZATION',
        details: 'SentinelVault initialized with 4 enterprise evaluation accounts (admin, auditor, alice, bob). Default password: password123'
      });

      console.log('[SentinelVault] Seed accounts successfully generated.');
    }

    app.listen(PORT, '0.0.0.0', () => {
      const ifaces = os.networkInterfaces();
      let localIP = 'localhost';
      for (const name of Object.keys(ifaces)) {
        for (const iface of ifaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
            break;
          }
        }
      }
      console.log(`\n=============================================================`);
      console.log(`🛡️  SENTINELVAULT ENTERPRISE SECURITY API RUNNING ON PORT ${PORT}`);
      console.log(`🔗  Local: http://localhost:${PORT}/api/health`);
      console.log(`🔗  External: http://${localIP}:${PORT}/api/health`);
      console.log(`=============================================================\n`);
    });
  } catch (err) {
    console.error('[System Boot Fatal Error]', err);
    process.exit(1);
  }
};

initializeServer();
