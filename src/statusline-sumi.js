#!/usr/bin/env node
// Claude Statusline — Kanagawa Sumi (Minimal + Nerd Font)
// https://github.com/jackhutson/claude-statusline

const { execSync } = require('child_process');
const path = require('path');

// --- Config ---

const BAR_WIDTH = 12;
const WARNING_THRESHOLD = 50;
const CRITICAL_THRESHOLD = 80;

// --- Colors (Kanagawa Sumi — token table in nix-config
//     docs/specs/2026-08-29-desktop-retheme-kanagawa-sumi.md) ---

const hex = h => {
  const [, r, g, b] = h.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return `${parseInt(r, 16)};${parseInt(g, 16)};${parseInt(b, 16)}`;
};

const fgc = h => `\x1b[38;2;${hex(h)}m`;
const bgc = h => `\x1b[48;2;${hex(h)}m`;

const BG_RAISE  = '#282727'; // bg-raise
const BG_BORDER = '#393836'; // bg-border
const SPOT      = '#e6c384'; // spot (seal)
const INK       = '#0d0c0c'; // bg-deep — dark ink on spot
const FG        = '#c5c9c5'; // fg
const FG_DIM    = '#a6a69c'; // fg-dim
const WARN      = '#ffa066'; // warn (surimiOrange — yellow is the spot)
const ERROR     = '#ff5d62'; // error
const SAKURA    = '#d27e99'; // sakuraPink — the brain icon
const INFO      = '#7e9cd8'; // sem-info (crystalBlue) — the branch icon

const RST = '\x1b[0m';

// Color lives in the icons (sakura brain, gold folder); text stays quiet.
// Deliberately no time-based motion — CC's own "Thinking…" line already
// carries the activity signal (animated variant: nix-config
// docs/research/terminal-motion.md).

// Powerline ramp like the starship prompt. If the statusline row ever
// renders bg escapes badly, set FLAT = true for the fg-only fallback.
const FLAT = true;
const SEP = '';

// --- Glyphs (Nerd Font) ---

const BAR_EMPTY_L = '\uEE00';
const BAR_EMPTY_M = '\uEE01';
const BAR_EMPTY_R = '\uEE02';
const BAR_FULL_L  = '\uEE03';
const BAR_FULL_M  = '\uEE04';
const BAR_FULL_R  = '\uEE05';

const BRANCH     = '\uF418';
const MODEL_ICON = '\uDB82\uDDD1';
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
    const cwd   = data.workspace?.current_dir || process.cwd();

    const remaining = data.context_window?.remaining_percentage;
    const used = remaining != null ? 100 - Math.round(remaining) : null;

    const git = getGitInfo(cwd);

    render(model, dir, git, used);
    reportToHerdr(model, git, used);
  } catch {}
});

// Fire-and-forget: mirror statusline data into the herdr sidebar as
// pane metadata tokens ($ctx, $model, $branch). No-op outside herdr.
function reportToHerdr(model, git, used) {
  if (process.env.HERDR_ENV !== '1' || !process.env.HERDR_PANE_ID) return;
  const args = ['pane', 'report-metadata', process.env.HERDR_PANE_ID,
    '--source', 'claude-statusline', '--ttl-ms', '900000',
    '--token', `model=${model}`];
  if (used != null) args.push('--token', `ctx=${used}%`);
  if (git) args.push('--token', `branch=${git.name}${git.dirty}`);
  try {
    require('child_process').spawn('herdr', args, { detached: true, stdio: 'ignore' }).unref();
  } catch {}
}

function ctxBar(used) {
  const filled = Math.round((used / 100) * BAR_WIDTH);
  let chars = '';
  for (let i = 0; i < BAR_WIDTH; i++) {
    if (i === 0) chars += i < filled ? BAR_FULL_L : BAR_EMPTY_L;
    else if (i === BAR_WIDTH - 1) chars += i < filled ? BAR_FULL_R : BAR_EMPTY_R;
    else chars += i < filled ? BAR_FULL_M : BAR_EMPTY_M;
  }
  return chars;
}

// chrome whispers, semantics speak: graphite segments, one spot (directory),
// ctx meter is the only voice that escalates (fg-dim -> warn -> error).
function render(model, dir, git, used) {
  const ctxFg = used == null ? FG_DIM
    : used > CRITICAL_THRESHOLD ? ERROR
    : used > WARNING_THRESHOLD ? WARN : FG_DIM;

  if (FLAT) {
    let out = `${fgc(SAKURA)}${MODEL_ICON} ${fgc(FG_DIM)}${model}${RST}`;
    out += `${PIPE}${fgc(SPOT)}${DIR_ICON} ${fgc(FG)}${dir}${RST}`;
    if (git) out += `${PIPE}${fgc(INFO)}${BRANCH} ${fgc(FG_DIM)}${git.name}${git.dirty}${RST}`;
    if (used != null) out += `${PIPE}${fgc(ctxFg)}${ctxBar(used)} ${used}%${RST}`;
    process.stdout.write(out);
    return;
  }

  const segs = [
    { bg: BG_RAISE, fg: FG, text: `${MODEL_ICON} ${model}` },
    { bg: SPOT, fg: INK, text: `${DIR_ICON} ${dir}` },
  ];
  if (git) segs.push({ bg: BG_BORDER, fg: FG, text: `${BRANCH} ${git.name}${git.dirty}` });
  if (used != null) segs.push({ bg: BG_RAISE, fg: ctxFg, text: `${ctxBar(used)} ${used}%` });

  let out = '';
  segs.forEach((s, i) => {
    out += `${bgc(s.bg)}${fgc(s.fg)} ${s.text} `;
    const next = segs[i + 1];
    out += next ? `${bgc(next.bg)}${fgc(s.bg)}${SEP}` : `${RST}${fgc(s.bg)}${SEP}${RST}`;
  });

  process.stdout.write(out);
}

function getGitInfo(cwd) {
  try {
    const out = execSync('git rev-parse --abbrev-ref HEAD && git status --porcelain -uno', {
      cwd, encoding: 'utf8', timeout: 500,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const [branch, ...statusLines] = out.split('\n');
    return { name: branch, dirty: statusLines.length ? ' *' : '' };
  } catch {
    return null;
  }
}
