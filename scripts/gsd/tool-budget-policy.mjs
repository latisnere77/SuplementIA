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
const countedTools = toolKeys(payload, normalizedCommand);

if (!normalizedCommand && countedTools.length === 0) {
  process.exit(0);
}

const maxIdentical = readDebounceLimit(process.env.GSD_DEBOUNCE_MAX_IDENTICAL);
const toolLimits = readToolLimits(process.env.GSD_TOOL_COUNT_LIMITS);
const session = sessionKey();

if (!session) {
  console.error('GSD_TOOL_BUDGET_BLOCK: missing session key for tool budget policy');
  process.exit(2);
}

const state = readState();
let nextCommandCount = 0;

if (normalizedCommand) {
  nextCommandCount = (state.commands[normalizedCommand] || 0) + 1;
  state.commands[normalizedCommand] = nextCommandCount;
}

const exceededToolLimits = [];

for (const tool of countedTools) {
  const nextToolCount = (state.tools[tool] || 0) + 1;
  state.tools[tool] = nextToolCount;

  if (nextToolCount > toolLimits[tool]) {
    exceededToolLimits.push(`${tool} exceeded max ${toolLimits[tool]} (${nextToolCount})`);
  }
}

writeState(state);

if (nextCommandCount > maxIdentical) {
  console.error(
    `GSD_TOOL_BUDGET_BLOCK: repeated command exceeded max ${maxIdentical}: ${normalizedCommand}`
  );
  process.exit(2);
}

if (exceededToolLimits.length) {
  console.error(`GSD_TOOL_BUDGET_BLOCK: ${exceededToolLimits.join(', ')}`);
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

function readToolLimits(value) {
  const hardLimits = {
    exec: 24,
    apply_patch: 8,
    git: 4,
  };
  const limits = { ...hardLimits };

  for (const item of String(value || '').split(',')) {
    const match = item.trim().match(/^([a-z_]+)\s*(?:<=|=)\s*(\d+)$/i);
    if (!match) {
      continue;
    }

    const key = normalizeToolName(match[1]);
    if (!Object.prototype.hasOwnProperty.call(hardLimits, key)) {
      continue;
    }

    limits[key] = Math.min(readPositiveInt(match[2], hardLimits[key]), hardLimits[key]);
  }

  return limits;
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toolKeys(payload, normalizedCommand) {
  const keys = new Set();
  const toolName = normalizeToolName(
    payload.tool_name
      || payload.tool
      || payload.name
      || payload.matcher
      || payload.hook_event_name
      || ''
  );

  if (normalizedCommand) {
    keys.add('exec');

    if (/^git(?:\s|$)/i.test(normalizedCommand)) {
      keys.add('git');
    }
  }

  if (toolName) {
    if (['bash', 'shell', 'exec', 'exec_command'].includes(toolName)) {
      keys.add('exec');
    }

    if (['apply_patch', 'edit', 'write', 'multi_edit'].includes(toolName)) {
      keys.add('apply_patch');
    }

    if (toolName === 'git') {
      keys.add('git');
    }
  }

  return [...keys];
}

function normalizeToolName(value) {
  return String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
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
      tools: parsed && typeof parsed.tools === 'object' && parsed.tools ? parsed.tools : {},
    };
  } catch {
    return { commands: {}, tools: {} };
  }
}

function writeState(state) {
  const filePath = statePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
}
