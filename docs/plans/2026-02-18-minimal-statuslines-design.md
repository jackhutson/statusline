# Minimal Statusline Variants — Design

## Context

The existing powerline statusline (Catppuccin Mocha, chevron separators, background colors, session pets) can feel loud. Two new variants provide quieter options at different font-compatibility levels.

All three variants live in the same repo. Users pick one at install time.

## Variant 1: Default (Minimal + Nerd Font)

**File:** `statusline-default.js`

**Layout:**
```
 󰧑 Opus 4.6 |  my-project |  main | 󰖯 45%
```

**Design:**
- Pipe (`|`) separators — no background colors, no chevrons, no pill caps
- Nerd Font icons: MODEL_ICON, DIR_ICON, BRANCH, CTX_ICON (same codepoints as powerline version)
- Nerd Font progress bar glyphs EE00-EE05 (same as powerline version)
- All text in default terminal foreground color
- Context section (% + bar) turns yellow (catppuccin `#f9e2af`) when >50%, red (`#f38ba8`) when >80%
- No pet segment
- No git dirty indicator change needed — same `*` suffix as powerline version
- Git segment skipped when not in a repo (same behavior)

**Urgency thresholds (different from powerline):**
| State | Context Used | Color |
|-------|-------------|-------|
| Normal | 0–50% | Default terminal fg |
| Warning | >50% | Yellow `#f9e2af` |
| Critical | >80% | Red `#f38ba8` |

## Variant 2: Compatibility (No Nerd Font)

**File:** `statusline-compat.js`

**Layout:**
```
 Opus 4.6 | my-project | main | 45% ▓▓▓▓▓░░░░░░░
```

**Design:**
- Pipe (`|`) separators — same as Default
- No icons at all — just text (no MODEL_ICON, DIR_ICON, BRANCH icon, CTX_ICON)
- Progress bar uses standard Unicode block characters: `▓` (U+2593) for filled, `░` (U+2591) for empty
- Same urgency coloring as Default (yellow >50%, red >80%)
- No pet segment
- Works on any UTF-8 terminal (Debian 12 default, Proxmox console, SSH)
- Git segment skipped when not in a repo

## Shared Behavior (Both Variants)

- Same stdin JSON contract as powerline version
- Same git detection (single `execSync` with `&&`-chained commands)
- Same pet hash function exists but is not called (kept for code sharing potential)
- Actually: no pet hash needed at all — these are standalone files
- Same `BAR_WIDTH = 12`
- Same graceful error handling (silent catch on bad input)

## Repo Structure Change

```
claude-statusline/
├── statusline.js              # Original powerline (unchanged)
├── statusline-default.js      # NEW: Minimal + Nerd Font
├── statusline-compat.js       # NEW: Compatibility (no Nerd Font)
├── install.sh                 # Updated: variant selection
├── uninstall.sh               # Unchanged
├── preview.sh                 # Updated: show all three variants
├── preview-runner.js          # May need variant-aware mode or separate runners
├── README.md                  # Updated: document all three variants
└── ...
```

## Install Flow Change

`install.sh` should let the user pick a variant:
```
Which statusline variant?
  1) Powerline  — full Catppuccin Mocha powerline with pets (requires Nerd Font)
  2) Default    — clean minimal with icons (requires Nerd Font)
  3) Compatible — works on any UTF-8 terminal
```

Selected variant gets copied to `~/.claude/hooks/statusline.js`.

## What NOT to Change

- Original `statusline.js` stays exactly as-is
- No changes to uninstall.sh (it just removes whatever is installed)
- No new dependencies
