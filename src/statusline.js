#!/usr/bin/env node
// ┌──────────────────────────────────────────────────┐
// │  Claude Statusline                               │
// │  Catppuccin Mocha powerline for Claude Code      │
// │  https://github.com/jackhutson/claude-statusline │
// │  MIT License                                     │
// └──────────────────────────────────────────────────┘

const { execSync } = require('child_process');
const path = require('path');

// --- Config ---

const BAR_WIDTH = 12;
const WARNING_THRESHOLD = 60;
const CRITICAL_THRESHOLD = 80;

// --- Catppuccin Mocha palette ---

const hex = h => {
  const [, r, g, b] = h.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return `${parseInt(r, 16)};${parseInt(g, 16)};${parseInt(b, 16)}`;
};

const C = {
  crust:    hex('#11111b'),
  surface0: hex('#313244'),
  red:      hex('#f38ba8'),
  peach:    hex('#fab387'),
  yellow:   hex('#f9e2af'),
  green:    hex('#a6e3a1'),
  mauve:    hex('#cba6f7'),
};

const fg = c => `38;2;${c}`;
const bg = c => `48;2;${c}`;

// Segment color definitions
const SEG = {
  model: { fg: fg(C.crust), bg: bg(C.red)    },
  dir:   { fg: fg(C.crust), bg: bg(C.peach)  },
  git:   { fg: fg(C.crust), bg: bg(C.yellow) },
  ctx:   { bg: bg(C.surface0) },
  end:   { fg: fg(C.crust), bg: bg(C.mauve)  },
};

// Urgency foreground codes
const URGENCY = {
  normal:   fg(C.green),
  warning:  fg(C.yellow),
  critical: fg(C.red),
};

// --- Glyphs ---

const BAR_EMPTY_L = '\uEE00';
const BAR_EMPTY_M = '\uEE01';
const BAR_EMPTY_R = '\uEE02';
const BAR_FULL_L  = '\uEE03';
const BAR_FULL_M  = '\uEE04';
const BAR_FULL_R  = '\uEE05';

const ARROW  = '\uE0B0';
const L_PILL = '\uE0B6';
const R_PILL = '\uE0B4';

const BRANCH     = '\uF418';
const MODEL_ICON = '\uDB82\uDDD1';
const CTX_ICON   = '\uDB81\uDDAF';
const DIR_ICON   = '\uEAF7';

const PETS = [
  { icon: '\uEEED',       names: ['Pixel', 'Mochi', 'Luna', 'Nyx', 'Byte', 'Miso', 'Chip', 'Sage'] },
  { icon: '\uDB84\uDF62', names: ['Rex', 'Bash', 'Spike', 'Ember', 'Chomp', 'Blitz', 'Crunch', 'Fang'] },
  { icon: '\uDB85\uDE5D', names: ['Boo', 'Wisp', 'Shade', 'Glitch', 'Echo', 'Drift', 'Haze', 'Fog'] },
];

// --- Pre-computed styles (all escape work happens here, not at render time) ---

const RST = '\x1b[0m';
const fgOf = bgCode => bgCode.replace(/^48;/, '38;');
const mkArrow = (fromBg, toBg) => `\x1b[${fgOf(fromBg)};${toBg}m${ARROW}${RST}`;

const STYLE = {
  model: `\x1b[${SEG.model.fg};${SEG.model.bg}m`,
  dir:   `\x1b[${SEG.dir.fg};${SEG.dir.bg}m`,
  git:   `\x1b[${SEG.git.fg};${SEG.git.bg}m`,
  ctx:   `\x1b[${SEG.ctx.bg}m`,
  end:   `\x1b[${SEG.end.fg};${SEG.end.bg}m`,
};

const URGENCY_CTX = {
  normal:   `\x1b[${URGENCY.normal};${SEG.ctx.bg}m`,
  warning:  `\x1b[${URGENCY.warning};${SEG.ctx.bg}m`,
  critical: `\x1b[${URGENCY.critical};${SEG.ctx.bg}m`,
};

const ARROWS = {
  model_dir: mkArrow(SEG.model.bg, SEG.dir.bg),
  dir_git:   mkArrow(SEG.dir.bg, SEG.git.bg),
  dir_ctx:   mkArrow(SEG.dir.bg, SEG.ctx.bg),
  git_ctx:   mkArrow(SEG.git.bg, SEG.ctx.bg),
  ctx_end:   mkArrow(SEG.ctx.bg, SEG.end.bg),
  dir_end:   mkArrow(SEG.dir.bg, SEG.end.bg),
  git_end:   mkArrow(SEG.git.bg, SEG.end.bg),
};

const PILL_L = `\x1b[${fgOf(SEG.model.bg)}m${L_PILL}${RST}`;
const PILL_R = `\x1b[${fgOf(SEG.end.bg)}m${R_PILL}${RST}`;

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
    const pet = getPet(data.session_id);

    render(model, dir, git, used, pet);
    reportToHerdr(model, git ? git.replace(`${BRANCH} `, '') : null, used);
  } catch {}
});

// Fire-and-forget: mirror statusline data into the herdr sidebar as
// pane metadata tokens ($ctx, $model, $branch). No-op outside herdr.
function reportToHerdr(model, branch, used) {
  if (process.env.HERDR_ENV !== '1' || !process.env.HERDR_PANE_ID) return;
  const args = ['pane', 'report-metadata', process.env.HERDR_PANE_ID,
    '--source', 'claude-statusline', '--ttl-ms', '900000',
    '--token', `model=${model}`];
  if (used != null) args.push('--token', `ctx=${used}%`);
  if (branch) args.push('--token', `branch=${branch}`);
  try {
    require('child_process').spawn('herdr', args, { detached: true, stdio: 'ignore' }).unref();
  } catch {}
}

function render(model, dir, git, used, pet) {
  let out = '';

  out += PILL_L;
  out += `${STYLE.model} ${MODEL_ICON} ${model} ${RST}`;
  out += ARROWS.model_dir;
  out += `${STYLE.dir} ${DIR_ICON} ${dir} ${RST}`;

  if (git) {
    out += ARROWS.dir_git;
    out += `${STYLE.git} ${git} ${RST}`;
  }

  if (used != null) {
    const urgency = used >= CRITICAL_THRESHOLD ? 'critical' : used >= WARNING_THRESHOLD ? 'warning' : 'normal';
    const uCtx = URGENCY_CTX[urgency];
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

    out += git ? ARROWS.git_ctx : ARROWS.dir_ctx;
    out += `${uCtx} ${CTX_ICON} ${used}% ${RST}`;
    if (filledChars) out += `${uCtx}${filledChars}${RST}`;
    if (emptyChars) out += `${uCtx}${emptyChars}${RST}`;
    out += `${STYLE.ctx} ${RST}`;
  }

  out += used != null ? ARROWS.ctx_end : git ? ARROWS.git_end : ARROWS.dir_end;
  out += `${STYLE.end} ${pet.icon} ${pet.name} ${RST}`;
  out += PILL_R;

  process.stdout.write(out);
}

function getGitInfo(cwd) {
  try {
    const out = execSync('git rev-parse --abbrev-ref HEAD && git status --porcelain -uno', {
      cwd, encoding: 'utf8', timeout: 500,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const [branch, ...statusLines] = out.split('\n');
    return `${BRANCH} ${branch}${statusLines.length ? ' *' : ''}`;
  } catch {
    return null;
  }
}

function getPet(sessionId) {
  const str = sessionId || 'default';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);
  const pet = PETS[hash % PETS.length];
  const name = pet.names[hash % pet.names.length];
  return { icon: pet.icon, name };
}
