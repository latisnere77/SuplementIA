#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const input = fs.readFileSync(0, 'utf8');
let payload = {};

try {
  payload = input.trim() ? JSON.parse(input) : {};
} catch {
  payload = { raw: input };
}

const command = [
  payload.command,
  payload.cmd,
  payload.tool_input?.command,
  payload.tool_input?.cmd,
  payload.arguments?.command,
  payload.arguments?.cmd,
  payload.raw,
]
  .filter(Boolean)
  .join('\n');

const normalizedCommand = normalizeCommand(command);

if (!normalizedCommand) {
  process.exit(0);
}

const maxIdentical = readDebounceLimit(process.env.GSD_DEBOUNCE_MAX_IDENTICAL);
const session = sessionKey();

if (!session) {
  console.error('GSD_TOOL_BUDGET_BLOCK: missing session key for tool budget policy');
  process.exit(2);
}

const state = readState();
const nextCount = (state.commands[normalizedCommand] || 0) + 1;
state.commands[normalizedCommand] = nextCount;
writeState(state);

if (nextCount > maxIdentical) {
  console.error(
    `GSD_TOOL_BUDGET_BLOCK: repeated command exceeded max ${maxIdentical}: ${normalizedCommand}`
  );
  process.exit(2);
}

process.exit(0);

function normalizeCommand(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function readDebounceLimit(value) {
  const hardMax = 2;
  const parsed = readPositiveInt(value, hardMax);
  return Math.min(parsed, hardMax);
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function statePath() {
  const root = process.env.GSD_TOOL_BUDGET_STATE_DIR
    || path.join(os.tmpdir(), 'suplementai-gsd-tool-budget');
  const sessionId = crypto.createHash('sha256').update(session).digest('hex').slice(0, 16);
  return path.join(root, `${sessionId}.json`);
}

function sessionKey() {
  return process.env.GSD_TOOL_BUDGET_SESSION
    || process.env.CODEX_SESSION_ID
    || process.env.CODEX_THREAD_ID
    || process.env.CLAUDE_SESSION_ID
    || '';
}

function readState() {
  const filePath = statePath();
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      commands: parsed && typeof parsed.commands === 'object' && parsed.commands ? parsed.commands : {},
    };
  } catch {
    return { commands: {} };
  }
}

function writeState(state) {
  const filePath = statePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
}
