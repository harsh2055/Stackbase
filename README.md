# Stackbase — Phase 7: Serverless Functions Engine

Write JavaScript that runs automatically on database events,
HTTP calls, or scheduled intervals. No server management required.

## What Phase 7 Adds

| Feature | Description |
|---------|-------------|
| Function Runtime | Sandboxed JS execution via Node.js vm module |
| onInsert/Update/Delete | Fire on database table events from Phase 6 |
| HTTP Trigger | POST /functions/:projectId/:path → execute function |
| Schedule Trigger | Run code every 30s / 1m / 5m / 1h / etc. |
| Code Validation | Syntax check before saving |
| Execution Logs | Every run logged: status, duration, output, errors |
| Enable/Disable toggle | Pause functions without deleting them |
| Manual Test | Run any function with custom event payload |
| Code Editor | Monaco-style editor with Tab key support |

## New Files

Backend:
  server/functions/runtime.js          — sandboxed JS executor (vm module)
  server/functions/triggerManager.js   — routes DB events to matching functions
  server/services/functionService.js   — create/update/delete/execute/log
  server/controllers/functionController.js — HTTP handlers
  server/routes/functionRoutes.js      — /projects/:id/functions/*

Updated:
  server/routes/projectRoutes.js       — adds function routes
  server/server.js                     — mounts http trigger + initSchedules
  server/services/realtimeService.js   — calls triggerManager on every DB event
  prisma/schema.prisma                 — Function, FunctionLog models

Frontend:
  components/Functions/CodeEditor.jsx     — textarea code editor
  components/Functions/FunctionCard.jsx   — function display card with toggle
  components/Functions/FunctionForm.jsx   — create/edit modal with trigger config
  components/Functions/ExecutionLogs.jsx  — execution history viewer
  pages/functions.js                      — main Functions page

## API Endpoints

POST   /projects/:pid/functions                     Create function
GET    /projects/:pid/functions                     List functions
GET    /projects/:pid/functions/:fid                Get function + logs
PUT    /projects/:pid/functions/:fid                Update function
DELETE /projects/:pid/functions/:fid                Delete function
POST   /projects/:pid/functions/:fid/execute        Manual execute
GET    /projects/:pid/functions/:fid/logs           Execution logs

POST   /functions/:projectId/:httpPath              HTTP trigger endpoint

## Trigger Types

onInsert  fires when a record is inserted into the watched table
onUpdate  fires when a record is updated
onDelete  fires when a record is deleted
http      fires on POST /functions/:projectId/:httpPath
schedule  fires every N seconds/minutes/hours

## Function Code Examples

// onInsert example
console.log('New record:', event.data.id);
console.log('Table:', event.table);

// HTTP trigger example
const { name } = event.body;
console.log('Hello', name);

// Schedule example
console.log('Running at:', event.timestamp);

## Setup

1. Run migration: npx prisma migrate deploy
2. Deploy backend — functions start automatically
3. Go to Functions page in the dashboard

No new environment variables required.
