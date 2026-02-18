#!/usr/bin/env node
// Claude Statusline — Compatible (No Nerd Font)
// https://github.com/jackhutson/claude-statusline

const { execSync } = require('child_process');
const path = require('path');

// --- Config ---

const BAR_WIDTH = 12;
const WARNING_THRESHOLD = 50;
const CRITICAL_THRESHOLD = 80;

// --- Colors (Catppuccin Mocha, used only for urgency) ---

const hex = h => {
  const [, r, g, b] = h.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return `${parseInt(r, 16)};${parseInt(g, 16)};${parseInt(b, 16)}`;
};

const YELLOW = `\x1b[38;2;${hex('#f9e2af')}m`;
const RED    = `\x1b[38;2;${hex('#f38ba8')}m`;
const RST    = '\x1b[0m';

// --- Bar characters (standard Unicode, no Nerd Font) ---

const BAR_FILLED = '\u2593'; // ▓
const BAR_EMPTY  = '\u2591'; // ░

const PIPE = ' | ';

// ═══════════════════════════════════════════════

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const dir   = path.basename(data.workspace?.current_dir || process.cwd());
    const cwd   = data.workspace?.current_dir || process.cwd();

    const remaining = data.context_window?.remaining_percentage;
    const used = remaining != null ? 100 - Math.round(remaining) : null;

    const git = getGitInfo(cwd);

    render(model, dir, git, used);
  } catch {}
});

function render(model, dir, git, used) {
  let out = '';

  out += model;
  out += `${PIPE}${dir}`;

  if (git) {
    out += `${PIPE}${git}`;
  }

  if (used != null) {
    const color = used > CRITICAL_THRESHOLD ? RED : used > WARNING_THRESHOLD ? YELLOW : '';
    const filled = Math.round((used / 100) * BAR_WIDTH);
    const bar = BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(BAR_WIDTH - filled);

    out += `${PIPE}${color}${used}% ${bar}${color ? RST : ''}`;
  }

  process.stdout.write(out);
}

function getGitInfo(cwd) {
  try {
    const out = execSync('git rev-parse --abbrev-ref HEAD && git status --porcelain -uno', {
      cwd, encoding: 'utf8', timeout: 500,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const [branch, ...statusLines] = out.split('\n');
    return `${branch}${statusLines.length ? ' *' : ''}`;
  } catch {
    return null;
  }
}
