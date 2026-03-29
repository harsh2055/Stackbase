-- database/schema.sql
-- Stackbase Phase 1 — Initial Database Setup
--
-- Run this script ONCE to initialize the database before running the server.
-- Prisma handles the table_schemas table via migrations.
-- This script handles PostgreSQL extensions needed by the dynamic tables.
--
-- Usage:
--   psql -U postgres -d stackbase_db -f database/schema.sql

-- Enable UUID generation extension (required for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The table_schemas table is managed by Prisma migrations.
-- After running this script, run: npx prisma migrate dev

-- Example: Manually verify setup
-- SELECT version();
-- SELECT extname FROM pg_extension;
