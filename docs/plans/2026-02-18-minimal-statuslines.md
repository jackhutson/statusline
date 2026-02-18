# Minimal Statusline Variants — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two new statusline variants (Default minimal + Nerd Font, Compatible no-Nerd-Font) alongside the existing powerline version, with variant selection in the installer.

**Architecture:** Each variant is a standalone JS file with its own render logic. The installer prompts the user to pick one. Preview tooling shows all three. No shared modules — each file is self-contained.

**Tech Stack:** Node.js, bash, Nerd Font glyphs (default), Unicode block chars (compat)

---

### Task 1: Create statusline-default.js

**Files:**
- Create: `statusline-default.js`

**Step 1: Create the file**

```js
#!/usr/bin/env node
// Claude Statusline — Default (Minimal + Nerd Font)
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
    const cwd   = data.workspace?.current_dir || process.cwd();

    const remaining = data.context_window?.remaining_percentage;
    const used = remaining != null ? 100 - Math.round(remaining) : null;

    const git = getGitInfo(cwd);

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
```

**Step 2: Make executable and verify**

Run: `chmod +x statusline-default.js`

Then test:
```bash
echo '{"model":{"display_name":"Opus 4.6"},"workspace":{"current_dir":"/tmp"},"session_id":"t","context_window":{"remaining_percentage":55}}' | node statusline-default.js
```

Expected: plain text output with Nerd Font icons, pipe separators, no background colors. Context section should have NO color (45% < 50%).

**Step 3: Test urgency boundaries**

```bash
# 51% used — should be yellow
echo '{"model":{"display_name":"Opus 4.6"},"workspace":{"current_dir":"/tmp"},"session_id":"t","context_window":{"remaining_percentage":49}}' | node statusline-default.js | xxd | grep '38;2;249;226;175'

# 81% used — should be red
echo '{"model":{"display_name":"Opus 4.6"},"workspace":{"current_dir":"/tmp"},"session_id":"t","context_window":{"remaining_percentage":19}}' | node statusline-default.js | xxd | grep '38;2;243;139;168'

# 50% used — should be NO color
echo '{"model":{"display_name":"Opus 4.6"},"workspace":{"current_dir":"/tmp"},"session_id":"t","context_window":{"remaining_percentage":50}}' | node statusline-default.js | xxd | grep -c '38;2'
# Expected: 0 (no color codes)
```

**Step 4: Commit**

```bash
git add statusline-default.js
git commit -m "feat: add Default (minimal + Nerd Font) statusline variant"
```

---

### Task 2: Create statusline-compat.js

**Files:**
- Create: `statusline-compat.js`

**Step 1: Create the file**

```js
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
```

**Step 2: Make executable and verify**

Run: `chmod +x statusline-compat.js`

Then test:
```bash
echo '{"model":{"display_name":"Opus 4.6"},"workspace":{"current_dir":"/tmp"},"session_id":"t","context_window":{"remaining_percentage":55}}' | node statusline-compat.js
```

Expected: plain text, no icons, pipe separators, Unicode `▓░` progress bar. No Nerd Font glyphs anywhere in output.

**Step 3: Verify no Nerd Font codepoints in output**

```bash
# Pipe output through xxd and check there are no Private Use Area codepoints
echo '{"model":{"display_name":"Opus 4.6"},"workspace":{"current_dir":"/tmp"},"session_id":"t","context_window":{"remaining_percentage":30}}' | node statusline-compat.js | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    for(let i=0;i<d.length;i++){
      const cp=d.codePointAt(i);
      if(cp>=0xE000&&cp<=0xF8FF || cp>=0xF0000) { console.log('FAIL: Nerd Font glyph found at',i,'codepoint',cp.toString(16)); process.exit(1); }
    }
    console.log('PASS: No Nerd Font glyphs');
  });
"
```

**Step 4: Commit**

```bash
git add statusline-compat.js
git commit -m "feat: add Compatible (no Nerd Font) statusline variant"
```

---

### Task 3: Create preview runners for new variants

**Files:**
- Create: `preview-runner-default.js`
- Create: `preview-runner-compat.js`

These mirror the logic of their respective statusline files but accept `GIT` as an env var instead of running `execSync`.

**Step 1: Create preview-runner-default.js**

Same as `statusline-default.js` but replace `getGitInfo()` with:
```js
const GIT = process.env.GIT || '';
// ... in the stdin handler:
const git = GIT || null;
```

Remove `const { execSync } = require('child_process');` and the `getGitInfo` function.

**Step 2: Create preview-runner-compat.js**

Same as `statusline-compat.js` but replace `getGitInfo()` with env var approach. Same pattern as above.

**Step 3: Verify both runners**

```bash
echo '{"model":{"display_name":"Opus 4.6"},"workspace":{"current_dir":"/tmp"},"session_id":"t","context_window":{"remaining_percentage":55}}' | GIT=$'\uF418 main' node preview-runner-default.js
echo '{"model":{"display_name":"Opus 4.6"},"workspace":{"current_dir":"/tmp"},"session_id":"t","context_window":{"remaining_percentage":55}}' | GIT="main" node preview-runner-compat.js
```

**Step 4: Commit**

```bash
git add preview-runner-default.js preview-runner-compat.js
git commit -m "feat: add preview runners for default and compat variants"
```

---

### Task 4: Update preview.sh

**Files:**
- Modify: `preview.sh`

**Step 1: Rewrite preview.sh to show all three variants**

The script needs three runner paths and three sections. Keep the unified `make_json` and `render` helpers. Add a `VARIANT_LEVELS` for default/compat (no pet parade section).

Structure:
```
  Claude Statusline Preview
  ═══════════════════════════════════════════════════════════════

  Powerline (statusline.js)
  ─────────────────────────────────────────────────────────────
  [progress range with git]
  [pet parade]
  [no git]

  Default (statusline-default.js)
  ─────────────────────────────────────────────────────────────
  [progress range with git]
  [no git]

  Compatible (statusline-compat.js)
  ─────────────────────────────────────────────────────────────
  [progress range with git]
  [no git]
```

The render function already accepts a git_env param (empty = no git). Add a `SCRIPT_*` var per variant. For the compat variant, the GIT env var should NOT include the Nerd Font branch icon — just the branch name.

**Step 2: Verify**

Run: `bash preview.sh`

Expected: all three sections render with correct glyphs/chars per variant.

**Step 3: Commit**

```bash
git add preview.sh
git commit -m "feat: update preview to show all three variants"
```

---

### Task 5: Update install.sh

**Files:**
- Modify: `install.sh`

**Step 1: Add variant selection menu**

Before the copy step, prompt the user:
```bash
echo ""
echo "  Select a statusline variant:"
echo ""
echo "    1) Powerline   — Catppuccin Mocha powerline with pets (requires Nerd Font)"
echo "    2) Default     — clean minimal with icons (requires Nerd Font)"
echo "    3) Compatible  — works on any UTF-8 terminal"
echo ""
printf "  Choice [1-3]: "
read -r choice

case "$choice" in
  2) SRC="$REPO_DIR/statusline-default.js" ;;
  3) SRC="$REPO_DIR/statusline-compat.js" ;;
  *) SRC="$REPO_DIR/statusline.js" ;;
esac
```

Then replace `cp "$REPO_DIR/statusline.js" "$DEST"` with `cp "$SRC" "$DEST"`.

**Step 2: Test**

Run `bash install.sh` and select each option. Verify the correct file is copied to `~/.claude/hooks/statusline.js`.

**Step 3: Commit**

```bash
git add install.sh
git commit -m "feat: add variant selection to installer"
```

---

### Task 6: Update README.md

**Files:**
- Modify: `README.md`

**Step 1: Add Variants section**

After the existing "Features" section, add:

```markdown
## Variants

Three statusline styles to match your setup:

| Variant | Style | Font Required | File |
|---------|-------|---------------|------|
| **Powerline** | Catppuccin Mocha segments + pets | Nerd Font | `statusline.js` |
| **Default** | Clean minimal with icons | Nerd Font | `statusline-default.js` |
| **Compatible** | Plain text, Unicode bar | Any UTF-8 | `statusline-compat.js` |

The installer (`bash install.sh`) prompts you to choose.
```

**Step 2: Update Requirements section**

Change from requiring Nerd Font unconditionally to noting it depends on variant:

```markdown
## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- Node.js (ships with Claude Code)
- A [Nerd Font](https://www.nerdfonts.com/) (v3+ recommended) — Powerline and Default variants
- Terminal with truecolor support
- Compatible variant works on any UTF-8 terminal
```

**Step 3: Update Customization table**

Add note that Default and Compatible use different thresholds (50/80 vs 60/80).

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add variant documentation to README"
```

---

### Task 7: Final verification

**Step 1: Run full preview**

```bash
bash preview.sh
```

All three sections should render correctly.

**Step 2: Test each install variant**

Back up `~/.claude/hooks/statusline.js` first. Run `bash install.sh` three times, selecting each variant. After each, pipe test JSON through the installed file and verify output.

**Step 3: Edge cases for both new variants**

Test each of `statusline-default.js` and `statusline-compat.js` with:
- Empty stdin
- Malformed JSON
- Missing fields (`{}`)
- No context data
- No git (use `/tmp`)
- 0% and 100% used
- Boundary values (50%, 51%, 80%, 81%)

**Step 4: Verify uninstall still works**

```bash
bash uninstall.sh
```

Should cleanly remove whichever variant was installed.

**Step 5: Commit any fixes, verify clean tree**

```bash
git status
```
