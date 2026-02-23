#!/usr/bin/env node
// Claude Statusline — Default (Minimal + Nerd Font) — Preview Runner
// https://github.com/jackhutson/claude-statusline

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

// --- Glyphs (Nerd Font) ---

const BAR_EMPTY_L = '\uEE00';
const BAR_EMPTY_M = '\uEE01';
const BAR_EMPTY_R = '\uEE02';
const BAR_FULL_L  = '\uEE03';
const BAR_FULL_M  = '\uEE04';
const BAR_FULL_R  = '\uEE05';

const BRANCH     = '\uF418';
const MODEL_ICON = '\uDB82\uDDD1';
const CTX_ICON   = '\uDB81\uDDAF';
const DIR_ICON   = '\uEAF7';

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

    const remaining = data.context_window?.remaining_percentage;
    const used = remaining != null ? 100 - Math.round(remaining) : null;

    const git = process.env.GIT || null;

    render(model, dir, git, used);
  } catch {}
});

function render(model, dir, git, used) {
  let out = '';

  out += `${MODEL_ICON} ${model}`;
  out += `${PIPE}${DIR_ICON} ${dir}`;

  if (git) {
    out += `${PIPE}${git}`;
  }

  if (used != null) {
    const color = used > CRITICAL_THRESHOLD ? RED : used > WARNING_THRESHOLD ? YELLOW : '';
    const filled = Math.round((used / 100) * BAR_WIDTH);

    let filledChars = '';
    let emptyChars = '';
    for (let i = 0; i < BAR_WIDTH; i++) {
      if (i < filled) {
        if (i === 0) filledChars += BAR_FULL_L;
        else if (i === BAR_WIDTH - 1) filledChars += BAR_FULL_R;
        else filledChars += BAR_FULL_M;
      } else {
        if (i === 0) emptyChars += BAR_EMPTY_L;
        else if (i === BAR_WIDTH - 1) emptyChars += BAR_EMPTY_R;
        else emptyChars += BAR_EMPTY_M;
      }
    }

    out += `${PIPE}${color}${CTX_ICON} ${used}% ${filledChars}${emptyChars}${color ? RST : ''}`;
  }

  process.stdout.write(out);
}
