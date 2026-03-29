// server/generators/typeMapper.js
// Maps user-friendly column type names to actual PostgreSQL data types.
// This is the single source of truth for all supported column types.

const TYPE_MAP = {
  // String types
  text: 'TEXT',
  string: 'TEXT',
  varchar: 'VARCHAR(255)',

  // Numeric types
  integer: 'INTEGER',
  int: 'INTEGER',
  number: 'INTEGER',
  bigint: 'BIGINT',
  float: 'FLOAT',
  decimal: 'DECIMAL(10, 2)',
  numeric: 'NUMERIC',

  // Boolean
  boolean: 'BOOLEAN',
  bool: 'BOOLEAN',

  // Date & Time
  date: 'DATE',
  timestamp: 'TIMESTAMP',
  datetime: 'TIMESTAMP',
  time: 'TIME',

  // UUID
  uuid: 'UUID',

  // JSON
  json: 'JSONB',
  jsonb: 'JSONB',

  // Binary
  bytea: 'BYTEA',
};

/**
 * Convert a user-provided type string to a valid PostgreSQL type.
 * @param {string} userType - Type string from the API request (e.g. "text", "integer")
 * @returns {string} - PostgreSQL type (e.g. "TEXT", "INTEGER")
 * @throws {Error} - If the type is not supported
 */
const mapType = (userType) => {
  const normalized = userType.toLowerCase().trim();
  const pgType = TYPE_MAP[normalized];

  if (!pgType) {
    const supported = Object.keys(TYPE_MAP).join(', ');
    throw new Error(
      `Unsupported column type: "${userType}". Supported types: ${supported}`
    );
  }

  return pgType;
};

/**
 * Check if a type string is valid without throwing.
 * @param {string} userType
 * @returns {boolean}
 */
const isValidType = (userType) => {
  return !!TYPE_MAP[userType?.toLowerCase()?.trim()];
};

/**
 * Return all supported type names.
 * @returns {string[]}
 */
const getSupportedTypes = () => Object.keys(TYPE_MAP);

module.exports = { mapType, isValidType, getSupportedTypes, TYPE_MAP };
