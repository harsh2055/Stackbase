// backend/server/services/aiService.js
// Phase 5 — AI Backend Generator (Updated for NVIDIA NIM / Llama 3)

'use strict';

// 1. Use the OpenAI SDK, which is standard for NVIDIA NIM
const { OpenAI } = require('openai');

// Set Llama 3 70B as the default model
const AI_MODEL = process.env.AI_MODEL || 'meta/llama3-70b-instruct';
const MAX_TABLES = parseInt(process.env.AI_MAX_TABLES || '10');

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior backend database architect for Stackbase, a backend-as-a-service platform.

Your job is to convert a natural language app description into a precise database schema definition.

RULES:
1. Return ONLY a valid JSON object — no explanation, no markdown, no code fences.
2. Table names must be lowercase snake_case (e.g. "user_profiles", "car_listings").
3. Column names must be lowercase snake_case.
4. Do NOT include "id", "created_at", or "updated_at" columns — they are auto-added.
5. Supported column types: text, string, integer, number, bigint, float, decimal, boolean, date, timestamp, uuid, json.
6. Maximum ${MAX_TABLES} tables per schema.
7. Include a "relationships" array to define foreign key links between tables.
8. Every relationship must reference actual tables defined in the schema.
9. Generate realistic, production-quality column names for the domain.

OUTPUT FORMAT (strict):
{
  "tables": [
    {
      "name": "table_name",
      "description": "What this table stores",
      "columns": [
        { "name": "col_name", "type": "text", "nullable": true, "unique": false }
      ]
    }
  ],
  "relationships": [
    {
      "fromTable": "orders",
      "fromColumn": "user_id",
      "toTable": "users",
      "toColumn": "id",
      "type": "many-to-one"
    }
  ]
}`;

/**
 * Generate a backend schema from a natural language prompt.
 *
 * @param {string} prompt
 * @returns {Promise<{ tables: Array, relationships: Array }>}
 */
const generateSchema = async (prompt) => {
  // 2. Check for NVIDIA API Key instead of Anthropic
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not configured. Add it to your environment variables.');
  }

  // 3. Initialize the client to point to NVIDIA's endpoint
  const client = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  console.log(`[AI] Requesting schema from ${AI_MODEL}...`);

  // 4. Send the request using the OpenAI chat completions format
  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 4096,
    temperature: 0.2, // Keep temperature low so it doesn't get creative with the JSON formatting
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Generate a complete backend schema for this application:\n\n${prompt.trim()}\n\nReturn only the JSON object.`,
      },
    ],
  });

  // Extract the text from the response
  const rawText = response.choices[0].message.content;

  return parseSchemaResponse(rawText, prompt);
};

/**
 * Parse and validate the AI response.
 */
const parseSchemaResponse = (rawText, originalPrompt) => {
  let cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  let schema;
  try {
    schema = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`AI returned invalid JSON. Raw response: ${rawText.slice(0, 200)}`);
  }

  if (!schema.tables || !Array.isArray(schema.tables)) {
    throw new Error('AI response missing "tables" array');
  }

  if (schema.tables.length > MAX_TABLES) {
    schema.tables = schema.tables.slice(0, MAX_TABLES);
  }

  return {
    tables: schema.tables || [],
    relationships: schema.relationships || [],
  };
};

const getSamplePrompts = () => [
  'Build a car rental platform where users can register, browse available cars, and make bookings. Admins can manage the fleet.',
  'Create a marketplace for freelancers where clients post jobs, freelancers submit proposals, and payments are tracked.',
  'Build an e-commerce backend with products, categories, orders, customers, and inventory management.',
  'Create a restaurant reservation system with menus, tables, reservations, and customer reviews.',
  'Build a SaaS project management tool with workspaces, projects, tasks, comments, and team members.',
];

module.exports = { generateSchema, getSamplePrompts };