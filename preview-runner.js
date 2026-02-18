#!/usr/bin/env node
const path = require('path');

const BAR_WIDTH = 12;
const WARNING_THRESHOLD = 60;
const CRITICAL_THRESHOLD = 80;
const GIT = process.env.GIT || '';

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

const SEG = {
  model: { fg: fg(C.crust), bg: bg(C.red)    },
  dir:   { fg: fg(C.crust), bg: bg(C.peach)  },
  git:   { fg: fg(C.crust), bg: bg(C.yellow) },
  ctx:   { bg: bg(C.surface0) },
  end:   { fg: fg(C.crust), bg: bg(C.mauve)  },
};

const URGENCY = {
  normal:   fg(C.green),
  warning:  fg(C.yellow),
  critical: fg(C.red),
};

const PETS = [
  { icon: '\uEEED',         names: ['Pixel', 'Mochi', 'Luna', 'Nyx', 'Byte', 'Miso', 'Chip', 'Sage'] },
  { icon: '\uDB84\uDF62',   names: ['Rex', 'Bash', 'Spike', 'Ember', 'Chomp', 'Blitz', 'Crunch', 'Fang'] },
  { icon: '\uDB85\uDE5D',   names: ['Boo', 'Wisp', 'Shade', 'Glitch', 'Echo', 'Drift', 'Haze', 'Fog'] },
];

const BAR_EMPTY_L = '\uEE00', BAR_EMPTY_M = '\uEE01', BAR_EMPTY_R = '\uEE02';
const BAR_FULL_L  = '\uEE03', BAR_FULL_M  = '\uEE04', BAR_FULL_R  = '\uEE05';
const ARROW = '\uE0B0', L_PILL = '\uE0B6', R_PILL = '\uE0B4';
const MODEL_ICON = '\uDB82\uDDD1';
const CTX_ICON   = '\uDB81\uDDAF';
const DIR_ICON   = '\uEAF7';

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

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || 'Claude';
    const dir = path.basename(data.workspace?.current_dir || process.cwd());
    const remaining = data.context_window?.remaining_percentage;
    const used = remaining != null ? 100 - Math.round(remaining) : null;
    const git = GIT || null;
    const pet = getPet(data.session_id);

    let out = '';

    out += `\x1b[${fgOf(SEG.model.bg)}m${L_PILL}\x1b[0m`;
    out += `\x1b[${SEG.model.fg};${SEG.model.bg}m ${MODEL_ICON} ${model} \x1b[0m`;
    out += arrow(SEG.model.bg, SEG.dir.bg);
    out += `\x1b[${SEG.dir.fg};${SEG.dir.bg}m ${DIR_ICON} ${dir} \x1b[0m`;

    let prevBg = SEG.dir.bg;
    if (git) {
      out += arrow(SEG.dir.bg, SEG.git.bg);
      out += `\x1b[${SEG.git.fg};${SEG.git.bg}m ${git} \x1b[0m`;
      prevBg = SEG.git.bg;
    }

    if (used != null) {
      const urgency = used >= CRITICAL_THRESHOLD ? 'critical' : used >= WARNING_THRESHOLD ? 'warning' : 'normal';
      const uFg = URGENCY[urgency];
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

      out += arrow(prevBg, SEG.ctx.bg);
      out += `\x1b[${uFg};${SEG.ctx.bg}m ${CTX_ICON} ${used}% \x1b[0m`;
      if (filledChars) out += `\x1b[${uFg};${SEG.ctx.bg}m${filledChars}\x1b[0m`;
      if (emptyChars) out += `\x1b[${uFg};${SEG.ctx.bg}m${emptyChars}\x1b[0m`;
      out += `\x1b[${SEG.ctx.bg}m \x1b[0m`;
    }

    const lastBg = used != null ? SEG.ctx.bg : prevBg;
    out += arrow(lastBg, SEG.end.bg);
    out += `\x1b[${SEG.end.fg};${SEG.end.bg}m ${pet.icon} ${pet.name} \x1b[0m`;
    out += `\x1b[${fgOf(SEG.end.bg)}m${R_PILL}\x1b[0m`;

    process.stdout.write(out);
  } catch (e) { process.stderr.write(e.message); }
});

function arrow(fromBg, toBg) { return `\x1b[${fgOf(fromBg)};${toBg}m${ARROW}\x1b[0m`; }
function fgOf(bg) { return bg.replace(/^48;/, '38;'); }
