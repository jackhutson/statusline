---
name: statusline
description: Use when the user asks to install, set up, switch, or preview their Claude Code statusline (powerline, default, or compatible variant). Copies the chosen variant to ~/.claude/hooks/statusline.js and wires statusLine into settings.json.
---

# Statusline Setup

Installs one of three statusline variants shipped with this plugin:

| Variant | Style | Font required | Source file |
|---------|-------|---------------|-------------|
| Powerline | Catppuccin Mocha segments + session pets | Nerd Font | `src/statusline.js` |
| Default | Clean minimal with icons | Nerd Font | `src/statusline-default.js` |
| Compatible | Plain text, Unicode bar | Any UTF-8 | `src/statusline-compat.js` |

Ask which variant the user wants if they haven't said. Default to Powerline.

## Install steps

1. Copy the chosen variant (paths relative to this plugin's root):

   ```bash
   mkdir -p ~/.claude/hooks
   cp "${CLAUDE_PLUGIN_ROOT}/src/statusline.js" ~/.claude/hooks/statusline.js
   chmod +x ~/.claude/hooks/statusline.js
   ```

   Substitute `statusline-default.js` or `statusline-compat.js` for the other
   variants — the destination filename is always `statusline.js`.

2. Wire it into `~/.claude/settings.json` only if `statusLine` is not already
   configured:

   ```bash
   python3 - <<'EOF'
   import json, os
   p = os.path.expanduser('~/.claude/settings.json')
   s = json.load(open(p)) if os.path.exists(p) else {}
   if 'statusLine' in s:
       print('statusLine already configured — leaving it unchanged')
   else:
       s['statusLine'] = {'type': 'command', 'command': '~/.claude/hooks/statusline.js'}
       json.dump(s, open(p, 'w'), indent=2)
       print('statusLine added')
   EOF
   ```

3. Tell the user to restart Claude Code to see the statusline.

## Preview

`bash "${CLAUDE_PLUGIN_ROOT}/preview.sh"` renders all states of every variant
without installing anything.

## Switching variants

Re-run step 1 with a different source file. Settings need no change.
