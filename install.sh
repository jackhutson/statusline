#!/bin/bash
set -e

DEST="$HOME/.claude/hooks/statusline.js"
SETTINGS="$HOME/.claude/settings.json"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing Claude Statusline..."

# Copy statusline
mkdir -p "$(dirname "$DEST")"
cp "$REPO_DIR/statusline.js" "$DEST"
chmod +x "$DEST"

# Update settings.json
if [ -f "$SETTINGS" ]; then
  if grep -q '"statusLine"' "$SETTINGS"; then
    echo "  statusLine already configured in settings.json"
  else
    node -e "
      const fs = require('fs');
      const p = '$SETTINGS';
      const s = JSON.parse(fs.readFileSync(p, 'utf8'));
      s.statusLine = { type: 'command', command: '~/.claude/hooks/statusline.js' };
      fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
    "
    echo "  Added statusLine to settings.json"
  fi
else
  mkdir -p "$(dirname "$SETTINGS")"
  node -e "
    const fs = require('fs');
    const s = { statusLine: { type: 'command', command: '~/.claude/hooks/statusline.js' } };
    fs.writeFileSync('$SETTINGS', JSON.stringify(s, null, 2) + '\n');
  "
  echo "  Created settings.json"
fi

echo ""
echo "Done! Restart Claude Code to see your statusline."
echo "Run 'bash $REPO_DIR/preview.sh' to preview all states."
