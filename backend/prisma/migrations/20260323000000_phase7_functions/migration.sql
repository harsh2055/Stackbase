-- Phase 7: Serverless Functions Engine
-- Creates functions and function_logs tables

CREATE TABLE "functions" (
    "id"           TEXT NOT NULL,
    "project_id"   TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "trigger_type" TEXT NOT NULL,
    "table_name"   TEXT,
    "http_path"    TEXT,
    "schedule"     TEXT,
    "code"         TEXT NOT NULL,
    "enabled"      BOOLEAN NOT NULL DEFAULT true,
    "timeout"      INTEGER NOT NULL DEFAULT 5000,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "functions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "function_logs" (
    "id"          TEXT NOT NULL,
    "function_id" TEXT NOT NULL,
    "trigger"     TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'success',
    "duration"    INTEGER,
    "output"      TEXT,
    "error"       TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "function_logs_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one name per project
CREATE UNIQUE INDEX "functions_project_id_name_key" ON "functions"("project_id", "name");

-- Foreign keys
ALTER TABLE "functions"
    ADD CONSTRAINT "functions_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "function_logs"
    ADD CONSTRAINT "function_logs_function_id_fkey"
    FOREIGN KEY ("function_id") REFERENCES "functions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "functions_project_id_idx"      ON "functions"("project_id");
CREATE INDEX "functions_trigger_type_idx"    ON "functions"("trigger_type");
CREATE INDEX "function_logs_function_id_idx" ON "function_logs"("function_id");
