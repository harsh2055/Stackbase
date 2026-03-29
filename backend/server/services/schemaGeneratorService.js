// backend/server/services/schemaGeneratorService.js
// Phase 5 — Schema Generator
// Takes the raw AI-generated schema and:
//   1. Validates table names and column types
//   2. Sanitizes identifiers (no SQL injection)
//   3. Maps AI types to supported Stackbase types
//   4. Returns a clean, ready-to-execute schema

'use strict';

const { sanitizeIdentifier } = require('../generators/sqlGenerator');
const { isValidType, getSupportedTypes } = require('../generators/typeMapper');

// Loose type mapping — AI sometimes uses slightly different type names
const TYPE_ALIASES = {
  'string':     'text',
  'str':        'text',
  'varchar':    'text',
  'char':       'text',
  'int':        'integer',
  'number':     'integer',
  'num':        'integer',
  'bigint':     'bigint',
  'float':      'float',
  'double':     'float',
  'real':       'float',
  'numeric':    'decimal',
  'money':      'decimal',
  'bool':       'boolean',
  'datetime':   'timestamp',
  'date_time':  'timestamp',
  'time':       'timestamp',
  'json':       'json',
  'jsonb':      'json',
  'object':     'json',
  'array':      'json',
  'uuid':       'uuid',
  'id':         'uuid',
};

/**
 * Normalise a type string from AI output to a valid Stackbase type.
 * Falls back to 'text' for unrecognised types.
 */
const normaliseType = (rawType) => {
  if (!rawType) return 'text';
  const lower = rawType.toLowerCase().trim();
  if (isValidType(lower)) return lower;
  if (TYPE_ALIASES[lower]) return TYPE_ALIASES[lower];
  // Last resort: fall back to text and log warning
  console.warn(`[SchemaGen] Unknown type "${rawType}" — defaulting to text`);
  return 'text';
};

/**
 * Validate and sanitize a complete AI-generated schema.
 * Returns a clean schema ready for table creation.
 *
 * @param {{ tables: Array, relationships: Array }} rawSchema
 * @returns {{ tables: Array, relationships: Array, warnings: string[] }}
 */
const validateAndCleanSchema = (rawSchema) => {
  const warnings = [];
  const cleanTables = [];
  const tableNames = new Set();

  for (const table of rawSchema.tables) {
    // Sanitize table name
    let safeName;
    try {
      safeName = sanitizeIdentifier(table.name);
    } catch (err) {
      warnings.push(`Skipped table "${table.name}": ${err.message}`);
      continue;
    }

    // Deduplicate table names
    if (tableNames.has(safeName)) {
      warnings.push(`Skipped duplicate table "${safeName}"`);
      continue;
    }
    tableNames.add(safeName);

    // Validate columns
    if (!Array.isArray(table.columns) || table.columns.length === 0) {
      warnings.push(`Table "${safeName}" has no columns — skipping`);
      continue;
    }

    const cleanColumns = [];
    for (const col of table.columns) {
      // Skip auto-managed columns if AI accidentally included them
      if (['id', 'created_at', 'updated_at'].includes(col.name?.toLowerCase())) {
        continue;
      }

      let safeColName;
      try {
        safeColName = sanitizeIdentifier(col.name);
      } catch (err) {
        warnings.push(`Skipped column "${col.name}" in "${safeName}": ${err.message}`);
        continue;
      }

      cleanColumns.push({
        name:     safeColName,
        type:     normaliseType(col.type),
        nullable: col.nullable !== false,  // default nullable = true
        unique:   col.unique === true,
      });
    }

    if (cleanColumns.length === 0) {
      warnings.push(`Table "${safeName}" has no valid columns after filtering`);
      continue;
    }

    cleanTables.push({
      name:        safeName,
      description: table.description || '',
      columns:     cleanColumns,
    });
  }

  // Validate relationships — only keep ones that reference real tables
  const cleanRelationships = [];
  for (const rel of (rawSchema.relationships || [])) {
    if (!tableNames.has(rel.fromTable) || !tableNames.has(rel.toTable)) {
      warnings.push(`Skipped relationship ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}: table not in schema`);
      continue;
    }
    cleanRelationships.push(rel);
  }

  return {
    tables:        cleanTables,
    relationships: cleanRelationships,
    warnings,
  };
};

/**
 * Generate a human-readable preview of what will be created.
 */
const buildPreviewSummary = (schema) => {
  const tableList = schema.tables.map((t) =>
    `  • ${t.name} (${t.columns.length} columns: ${t.columns.map((c) => c.name).join(', ')})`
  ).join('\n');

  const relList = schema.relationships.length > 0
    ? schema.relationships.map((r) => `  • ${r.fromTable}.${r.fromColumn} → ${r.toTable}.${r.toColumn}`).join('\n')
    : '  (none)';

  return `Tables (${schema.tables.length}):\n${tableList}\n\nRelationships:\n${relList}`;
};

module.exports = { validateAndCleanSchema, buildPreviewSummary, normaliseType };
