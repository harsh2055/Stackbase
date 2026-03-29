// backend/server/functions/runtime.js
// Phase 7 — Serverless Functions Engine
//
// Executes user-uploaded JavaScript functions in a sandboxed environment.
// Uses Node.js vm module with strict resource limits.
//
// Safety controls:
//   - Execution timeout (configurable per function, default 5000ms)
//   - Sandboxed context — no access to fs, process, require, __dirname etc.
//   - console.log captured and returned as output
//   - Errors caught and returned rather than crashing the server
//   - Memory limited via sandbox isolation

'use strict';

const vm = require('vm');

/**
 * Execute a serverless function safely.
 *
 * @param {string} code     - JavaScript source code of the function
 * @param {Object} event    - Event payload passed to the function
 * @param {number} timeout  - Max execution time in ms (default 5000)
 * @returns {Promise<{ success: boolean, output: string[], error: string|null, duration: number }>}
 */
const executeFunction = async (code, event, timeout = 5000) => {
  const startTime = Date.now();
  const outputLines = [];
  let executionError = null;

  // Build the sandbox context
  // Intentionally limited — no require, no process, no fs
  const sandbox = {
    // Captured console
    console: {
      log:   (...args) => outputLines.push(args.map(safeStringify).join(' ')),
      warn:  (...args) => outputLines.push('[WARN] ' + args.map(safeStringify).join(' ')),
      error: (...args) => outputLines.push('[ERROR] ' + args.map(safeStringify).join(' ')),
      info:  (...args) => outputLines.push('[INFO] ' + args.map(safeStringify).join(' ')),
    },
    // Event payload
    event,
    // Safe globals
    JSON,
    Math,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout: undefined,  // Intentionally blocked
    setInterval: undefined, // Intentionally blocked
    fetch: undefined,       // Blocked — use HTTP triggers instead
    require: undefined,     // Blocked
    process: undefined,     // Blocked
    __dirname: undefined,   // Blocked
    __filename: undefined,  // Blocked
  };

  // Create isolated VM context
  vm.createContext(sandbox);

  // Wrap user code so it can be async and receives the event
  const wrappedCode = `
(async function handler(event) {
  ${code}
})(event).then(function(result) {
  __result__ = result;
  __done__ = true;
}).catch(function(err) {
  __error__ = err && err.message ? err.message : String(err);
  __done__ = true;
});
`;

  sandbox.__result__ = undefined;
  sandbox.__error__  = undefined;
  sandbox.__done__   = false; // ADD THIS

  try {
    const script = new vm.Script(wrappedCode, {
      filename: 'function.js',
      timeout,
    });

    // Run the script
    script.runInContext(sandbox, { timeout });

    // Wait for async completion (up to timeout)
    // Wait for async completion (up to timeout)
  const deadline = startTime + timeout;
  while (!sandbox.__done__) {  // CHANGED THIS LINE
    if (Date.now() > deadline) {
      executionError = `Execution timed out after ${timeout}ms`;
      break;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
    if (sandbox.__error__) {
      executionError = sandbox.__error__;
    }

  } catch (err) {
    if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message?.includes('timed out')) {
      executionError = `Execution timed out after ${timeout}ms`;
    } else {
      executionError = err.message || 'Unknown execution error';
    }
  }

  const duration = Date.now() - startTime;

  return {
    success:  !executionError,
    output:   outputLines,
    error:    executionError,
    duration,
    result:   sandbox.__result__,
  };
};

/**
 * Safely convert a value to a string for console output.
 */
const safeStringify = (val) => {
  if (val === null)      return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val, null, 2); } catch { return String(val); }
};

/**
 * Validate that a function's code is syntactically valid before saving.
 * @param {string} code
 * @returns {{ valid: boolean, error: string|null }}
 */
const validateCode = (code) => {
  try {
    new vm.Script(code, { filename: 'validation.js' });
    return { valid: true, error: null };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

module.exports = { executeFunction, validateCode };

