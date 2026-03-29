// backend/server/services/functionService.js
// Phase 7 — Serverless Functions Service
//
// Business logic for function management and execution.
// Controllers are thin — all logic lives here.

'use strict';

const prisma = require('../../config/prisma');
const { executeFunction, validateCode } = require('../functions/runtime');

/**
 * Execute a function and persist the execution log.
 *
 * @param {Function} fn        - Prisma Function record
 * @param {Object}  event      - Event payload passed to the function
 * @param {string}  trigger    - Human-readable trigger description
 * @returns {Promise<FunctionLog>}
 */
const executeAndLog = async (fn, event, trigger) => {
  console.log(`[Functions] Executing "${fn.name}" (trigger: ${trigger})`);

  const result = await executeFunction(fn.code, event, fn.timeout || 5000);

  // Persist the execution log
  const log = await prisma.functionLog.create({
    data: {
      functionId: fn.id,
      trigger,
      status:     result.success ? 'success' : (result.error?.includes('timed out') ? 'timeout' : 'error'),
      duration:   result.duration,
      output:     result.output.join('\n') || null,
      error:      result.error || null,
    },
  });

  if (!result.success) {
    console.error(`[Functions] "${fn.name}" failed: ${result.error}`);
  } else {
    console.log(`[Functions] "${fn.name}" completed in ${result.duration}ms`);
  }

  return log;
};

/**
 * Create a new function after validating its code.
 */
const createFunction = async (projectId, userId, { name, description, triggerType, tableName, httpPath, schedule, code, timeout }) => {
  // Validate code syntax
  const validation = validateCode(code);
  if (!validation.valid) {
    throw new Error(`Syntax error in function code: ${validation.error}`);
  }

  // Validate trigger type
  const VALID_TRIGGERS = ['onInsert', 'onUpdate', 'onDelete', 'http', 'schedule'];
  if (!VALID_TRIGGERS.includes(triggerType)) {
    throw new Error(`Invalid trigger type "${triggerType}". Must be one of: ${VALID_TRIGGERS.join(', ')}`);
  }

  // Require tableName for DB triggers
  if (['onInsert', 'onUpdate', 'onDelete'].includes(triggerType) && !tableName) {
    throw new Error(`tableName is required for trigger type "${triggerType}"`);
  }

  // Require httpPath for http trigger
  if (triggerType === 'http' && !httpPath) {
    throw new Error('httpPath is required for http trigger type');
  }

  // Require schedule for schedule trigger
  if (triggerType === 'schedule' && !schedule) {
    throw new Error('schedule is required for schedule trigger type (e.g. "30s", "5m", "1h")');
  }

  const fn = await prisma.function.create({
    data: {
      projectId,
      name: name.trim(),
      description: description?.trim() || null,
      triggerType,
      tableName: tableName?.trim() || null,
      httpPath: httpPath?.trim() || null,
      schedule: schedule?.trim() || null,
      code,
      timeout: timeout || 5000,
    },
  });

  // If it's a schedule trigger, start the timer immediately
  if (triggerType === 'schedule') {
    const { startSchedule } = require('../functions/triggerManager');
    startSchedule(fn);
  }

  return fn;
};

/**
 * Update function code/config.
 */
const updateFunction = async (functionId, projectId, updates) => {
  if (updates.code) {
    const validation = validateCode(updates.code);
    if (!validation.valid) {
      throw new Error(`Syntax error: ${validation.error}`);
    }
  }

  const fn = await prisma.function.update({
    where: { id: functionId },
    data: {
      ...(updates.name        !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.code        !== undefined && { code: updates.code }),
      ...(updates.enabled     !== undefined && { enabled: updates.enabled }),
      ...(updates.timeout     !== undefined && { timeout: updates.timeout }),
      ...(updates.tableName   !== undefined && { tableName: updates.tableName }),
    },
  });

  return fn;
};

/**
 * Delete a function and stop any active schedules.
 */
const deleteFunction = async (functionId, projectId) => {
  const fn = await prisma.function.findFirst({ where: { id: functionId, projectId } });
  if (!fn) throw new Error('Function not found');

  if (fn.triggerType === 'schedule') {
    const { stopSchedule } = require('../functions/triggerManager');
    stopSchedule(functionId);
  }

  await prisma.function.delete({ where: { id: functionId } });
};

/**
 * Get execution logs for a function with pagination.
 */
const getFunctionLogs = async (functionId, projectId, limit = 50) => {
  // Verify function belongs to this project
  const fn = await prisma.function.findFirst({ where: { id: functionId, projectId } });
  if (!fn) throw new Error('Function not found');

  return prisma.functionLog.findMany({
    where: { functionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};

module.exports = { executeAndLog, createFunction, updateFunction, deleteFunction, getFunctionLogs };
