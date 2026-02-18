#!/bin/bash
set -e

DEST="$HOME/.claude/hooks/statusline.js"
SETTINGS="$HOME/.claude/settings.json"

echo "Uninstalling Claude Statusline..."

if [ -f "$DEST" ]; then
  rm "$DEST"
  echo "  Removed $DEST"
else
  echo "  $DEST not found (already removed?)"
fi

if [ -f "$SETTINGS" ] && grep -q '"statusLine"' "$SETTINGS"; then
  node -e "
    const fs = require('fs');
    const p = '$SETTINGS';
    const s = JSON.parse(fs.readFileSync(p, 'utf8'));
    delete s.statusLine;
    fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
  "
  echo "  Removed statusLine from settings.json"
fi

echo "Done. Restart Claude Code to apply."
