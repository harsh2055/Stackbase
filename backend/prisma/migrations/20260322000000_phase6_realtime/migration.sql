-- Phase 6: Real-Time Data Engine
-- No new DB tables required — WebSocket state is in-memory.
-- This migration is a no-op marker for tracking purposes.

-- The realtime engine uses:
--   PostgreSQL LISTEN/NOTIFY is NOT used (we intercept at the API layer instead)
--   All subscriptions are managed in-memory in subscriptionManager.js
--   Events are emitted directly after INSERT/UPDATE/DELETE in apiGenerator.js

SELECT 1; -- no-op
