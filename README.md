# Claude Statusline

A Catppuccin Mocha powerline statusline for [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
with context window tracking and session pets.

## Features

- **Powerline segments** with chevron separators and pill caps
- **Context window progress bar** using Nerd Font bar glyphs
- **Three urgency states** — green (normal), yellow (warning), red (critical)
- **Git integration** — current branch + dirty indicator
- **Session pets** — every session gets a deterministic companion
- **Catppuccin Mocha** theme with 24-bit truecolor

## Variants

Three statusline styles to match your setup:

| Variant | Style | Font Required | File |
|---------|-------|---------------|------|
| **Powerline** | Catppuccin Mocha segments + pets | Nerd Font | `src/statusline.js` |
| **Default** | Clean minimal with icons | Nerd Font | `src/statusline-default.js` |
| **Compatible** | Plain text, Unicode bar | Any UTF-8 | `src/statusline-compat.js` |

The installer (`bash install.sh`) prompts you to choose.

## Urgency States

The progress bar, empty outline, and percentage text all change color together:

| State | Context Used | Color |
|-------|-------------|-------|
| Normal | 0–59% | Green |
| Warning | 60–79% | Yellow |
| Critical | 80–100% | Red |

## Session Pets

Each Claude Code session gets a deterministic pet companion, hashed from the
session ID. Same session, same pet — every time.

| | Cat | Dino | Ghost |
|---|---|---|---|
| **Names** | Pixel, Mochi, Luna, Nyx, Byte, Miso, Chip, Sage | Rex, Bash, Spike, Ember, Chomp, Blitz, Crunch, Fang | Boo, Wisp, Shade, Glitch, Echo, Drift, Haze, Fog |

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- Node.js (ships with Claude Code)
- A [Nerd Font](https://www.nerdfonts.com/) (v3+ recommended) — Powerline and Default variants
- Terminal with truecolor support
- Compatible variant works on any UTF-8 terminal

## Install

**Quick install:**

```bash
git clone https://github.com/jackhutson/claude-statusline.git
cd claude-statusline
bash install.sh
```

**Manual install:**

1. Copy `src/statusline.js` to `~/.claude/hooks/statusline.js`
2. `chmod +x ~/.claude/hooks/statusline.js`
3. Add to `~/.claude/settings.json`:
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/hooks/statusline.js"
  }
}
```
4. Restart Claude Code

## Uninstall

```bash
bash uninstall.sh
```

## Preview

Run the preview script to see all states and verify your font supports the glyphs:

```bash
bash preview.sh
```

## Customization

Edit the config section at the top of each variant's file:

| Option | Powerline | Default / Compatible | Description |
|--------|-----------|---------------------|-------------|
| `BAR_WIDTH` | `12` | `12` | Number of progress bar characters |
| `WARNING_THRESHOLD` | `60` | `50` | % to trigger yellow |
| `CRITICAL_THRESHOLD` | `80` | `80` | % to trigger red |
| `PETS` | 3 species x 8 names | — | Add your own pets and names (Powerline only) |
| `C` (palette) | Catppuccin Mocha | — | Swap hex values for any theme (Powerline only) |

## Anatomy

```
╭─ model ─╮╭── directory ──╮╭──── git ────╮╭────── context ──────╮╭── pet ──╮
 icon Opus   icon project    branch main   icon 45% ▓▓▓▓▓░░░░░░  cat Pixel
╰──red─────╯╰────peach──────╯╰───yellow────╯╰──────surface0──────╯╰──mauve──╯
```

## How It Works

Claude Code pipes JSON to the statusline script via stdin on each render.
The script reads model info, workspace path, context window usage, and session
ID, then outputs ANSI-formatted powerline segments to stdout.

No files are written. No network calls. No dependencies beyond Node.js and git.

## License

MIT
