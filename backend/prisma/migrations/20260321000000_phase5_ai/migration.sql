-- Phase 5: AI Backend Generator
-- Creates the ai_requests table to track AI schema generation history

CREATE TABLE "ai_requests" (
    "id"               TEXT NOT NULL,
    "project_id"       TEXT NOT NULL,
    "user_id"          TEXT NOT NULL,
    "prompt"           TEXT NOT NULL,
    "generated_schema" JSONB,
    "status"           TEXT NOT NULL DEFAULT 'pending',
    "error_message"    TEXT,
    "tables_created"   INTEGER NOT NULL DEFAULT 0,
    "deployed"         BOOLEAN NOT NULL DEFAULT false,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "ai_requests"
    ADD CONSTRAINT "ai_requests_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_requests"
    ADD CONSTRAINT "ai_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for fast lookup by project
CREATE INDEX "ai_requests_project_id_idx" ON "ai_requests"("project_id");
CREATE INDEX "ai_requests_user_id_idx"    ON "ai_requests"("user_id");
