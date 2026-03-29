// server/generators/sqlGenerator.js
// Generates safe, validated SQL DDL statements from table schema definitions.
// All table names and column names are sanitized before use.

const { mapType } = require('./typeMapper');

/**
 * Sanitize a table or column name.
 * Only allows lowercase letters, numbers, and underscores.
 * Prevents SQL injection in identifiers.
 * @param {string} name
 * @returns {string}
 */
const sanitizeIdentifier = (name) => {
  if (!name || typeof name !== 'string') {
    throw new Error('Identifier must be a non-empty string');
  }

  // Convert to lowercase, replace spaces/hyphens with underscore
  const sanitized = name
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  if (!sanitized) {
    throw new Error(`Invalid identifier: "${name}" — only letters, numbers, and underscores are allowed`);
  }

  if (/^[0-9]/.test(sanitized)) {
    throw new Error(`Invalid identifier: "${name}" — identifiers cannot start with a number`);
  }

  // Block reserved SQL keywords
  const reserved = ['select', 'insert', 'update', 'delete', 'drop', 'create', 'table', 'index', 'from', 'where', 'join'];
  if (reserved.includes(sanitized)) {
    throw new Error(`Invalid identifier: "${sanitized}" is a reserved SQL keyword`);
  }

  return sanitized;
};

/**
 * Generate a CREATE TABLE SQL statement from a schema definition.
 *
 * @param {string} tableName - The name of the table to create
 * @param {Array<{name: string, type: string, nullable?: boolean, unique?: boolean, default?: string}>} columns
 * @returns {string} - The complete CREATE TABLE SQL statement
 *
 * @example
 * generateCreateTableSQL('cars', [
 *   { name: 'name', type: 'text' },
 *   { name: 'price', type: 'integer' },
 *   { name: 'availability', type: 'boolean' }
 * ])
 */
const generateCreateTableSQL = (tableName, columns) => {
  const safeTableName = sanitizeIdentifier(tableName);

  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error('At least one column must be defined');
  }

  const columnDefinitions = [];

  // Always add a UUID primary key as the first column
  columnDefinitions.push(`  id UUID PRIMARY KEY DEFAULT gen_random_uuid()`);

  for (const col of columns) {
    const colName = sanitizeIdentifier(col.name);

    // Skip if user tries to redefine id
    if (colName === 'id') continue;

    const pgType = mapType(col.type);
    let definition = `  ${colName} ${pgType}`;

    if (col.unique) definition += ' UNIQUE';
    if (!col.nullable && col.nullable !== undefined) definition += ' NOT NULL';
    if (col.default !== undefined && col.default !== null) {
      // Only allow simple defaults (strings, numbers, booleans, now())
      const safeDefault = sanitizeDefault(col.default, pgType);
      definition += ` DEFAULT ${safeDefault}`;
    }

    columnDefinitions.push(definition);
  }

  // Add audit timestamps
  columnDefinitions.push(`  created_at TIMESTAMP DEFAULT NOW()`);
  columnDefinitions.push(`  updated_at TIMESTAMP DEFAULT NOW()`);

  const sql = `CREATE TABLE IF NOT EXISTS ${safeTableName} (\n${columnDefinitions.join(',\n')}\n);`;

  return sql;
};

/**
 * Generate DROP TABLE SQL (for cleanup/reset).
 * @param {string} tableName
 * @returns {string}
 */
const generateDropTableSQL = (tableName) => {
  const safeTableName = sanitizeIdentifier(tableName);
  return `DROP TABLE IF EXISTS ${safeTableName} CASCADE;`;
};

/**
 * Sanitize a default value to prevent SQL injection.
 * @param {*} value
 * @param {string} pgType
 * @returns {string}
 */
const sanitizeDefault = (value, pgType) => {
  if (value === 'NOW()' || value === 'now()') return 'NOW()';
  if (value === 'NULL') return 'NULL';
  if (typeof value === 'boolean') return value.toString().toUpperCase();
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') {
    // Escape single quotes
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
  }
  return 'NULL';
};

module.exports = {
  generateCreateTableSQL,
  generateDropTableSQL,
  sanitizeIdentifier,
};
