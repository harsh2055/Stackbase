// backend/config/db.js
'use strict';

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('[DB] FATAL: DATABASE_URL is not set');
  process.exit(1);
}

// Supabase Transaction Pooler (port 5432) requires SSL but uses a self-signed cert.
// We must set rejectUnauthorized: false AND pass sslmode via the connection string.
// The DATABASE_URL should use: ?sslmode=require  (NOT verify-ca or verify-full)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,  // Required for Supabase pooler self-signed cert
    checkServerIdentity: () => undefined, // Skip hostname verification
  },
  max: 3,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('connect', () => console.log('[DB] PostgreSQL connection established'));
pool.on('error',   (err) => console.error('[DB] Idle client error:', err.message));

const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    console.log(`[DB] ${Date.now() - start}ms — ${result.rowCount} rows`);
    return result;
  } catch (err) {
    console.error('[DB] Query error:', err.message);
    throw err;
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
