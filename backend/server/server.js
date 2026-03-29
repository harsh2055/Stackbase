// backend/server/server.js
'use strict';

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

const { pool }   = require('../config/db');
const prisma     = require('../config/prisma');
const routeRegistry = require('./routes/routeRegistry');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const systemRoutes  = require('./routes/systemRoutes');
const deploymentInstanceRoutes = require('./routes/deploymentInstanceRoutes');
const aiRoutes                 = require('./routes/aiRoutes');
const { attachWebSocketServer, startHeartbeat } = require('./realtime/websocketServer');
const { handleHttpTrigger } = require('./controllers/functionController');
const { initSchedules } = require('./functions/triggerManager');
const { buildPgTableName } = require('./controllers/projectTableController');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-api-key'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));

// CRITICAL: Render/Vercel/Railway all sit behind a reverse proxy.
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set('trust proxy', 1);

app.use(rateLimit({
  windowMs: 60000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  // Use the real IP forwarded by Render's proxy
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
}));

app.use('/',            systemRoutes);
app.use('/auth',        authRoutes);
app.use('/projects',    projectRoutes);
app.use('/deployments', deploymentInstanceRoutes);
app.use('/ai',          aiRoutes);
// Phase 7: HTTP-triggered serverless functions
app.all('/functions/:projectId/:httpPath', handleHttpTrigger);
app.use('/api',         routeRegistry.router);

app.get('/api/project/:projectId/:table', async (req, res) => {
  try {
    const { projectId, table } = req.params;
    const pgTable = `prj_${projectId.replace(/-/g,'').slice(0,8)}_${table}`;
    const result = await pool.query(`SELECT * FROM ${pgTable} LIMIT 20`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ success: false, error: `${req.method} ${req.originalUrl} not found` }));
app.use((err, req, res, next) => {
  console.error('[Server]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Retry helper ─────────────────────────────────────────────────────────────
const retry = async (fn, label, maxAttempts = 10, delayMs = 5000) => {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await fn();
      console.log(`[Bootstrap] ✓ ${label}`);
      return true;
    } catch (err) {
      console.error(`[Bootstrap] ✗ ${label} (attempt ${i}/${maxAttempts}): ${err.message}`);
      if (i < maxAttempts) {
        console.log(`[Bootstrap] Retrying ${label} in ${delayMs / 1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  console.error(`[Bootstrap] ✗ ${label} failed after ${maxAttempts} attempts — continuing anyway`);
  return false;
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const bootstrap = async () => {
  console.log('[Bootstrap] Starting...');
  console.log('[Bootstrap] DATABASE_URL prefix:', process.env.DATABASE_URL?.slice(0, 40));

  // ✅ Bind port FIRST so Render detects the service immediately
  // Use http.createServer so we can share the port with WebSockets
  const http = require('http');
  const httpServer = http.createServer(app);

  await new Promise(resolve => {
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Bootstrap] ✓ Server listening on 0.0.0.0:${PORT}`);
      resolve();
    });
  });

  // Attach WebSocket server to the same port at /realtime
  attachWebSocketServer(httpServer);
  startHeartbeat();
  console.log(`[Bootstrap] ✓ WebSocket server ready at ws://0.0.0.0:${PORT}/realtime`);

  // Then connect to DB with retry — free tier Supabase can be slow to wake
  await retry(() => pool.query('SELECT 1'), 'PostgreSQL');
  await retry(() => prisma.$connect(), 'Prisma');

  // Register existing table routes
  try {
    const pts = await prisma.projectTable.findMany({ select: { projectId: true, tableName: true } });
    for (const pt of pts) routeRegistry.registerTable(buildPgTableName(pt.projectId, pt.tableName));
    console.log(`[Bootstrap] ✓ Registered ${pts.length} project table routes`);
  } catch (err) {
    console.error('[Bootstrap] Route registration error:', err.message);
  }

  // Check Docker (non-fatal)
  try {
    const { isDockerAvailable } = require('./services/containerService');
    const dockerOk = await isDockerAvailable();
    console.log(`[Bootstrap] ${dockerOk ? '✓' : '✗'} Docker ${dockerOk ? 'available' : 'not available — simulated mode'}`);
  } catch {}

  console.log('[Bootstrap] ✓ Ready');

  // Phase 7: Start scheduled functions
  await initSchedules();
};

process.on('SIGINT',  async () => { await prisma.$disconnect(); await pool.end(); process.exit(0); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); await pool.end(); process.exit(0); });

bootstrap();
