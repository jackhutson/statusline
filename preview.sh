#!/bin/bash
# Preview statusline — all variants and states
# Usage: bash preview.sh

DIR="$(cd "$(dirname "$0")" && pwd)"

SCRIPT_POWERLINE="$DIR/preview-runner.js"
SCRIPT_DEFAULT="$DIR/preview-runner-default.js"
SCRIPT_COMPAT="$DIR/preview-runner-compat.js"

LEVELS=(0 8 25 45 60 70 80 90 100)
BRANCH=$'\uF418'

make_json() {
  echo "{\"model\":{\"display_name\":\"Opus 4.6\"},\"workspace\":{\"current_dir\":\"/Users/demo/my-project\"},\"session_id\":\"$1\",\"context_window\":{\"remaining_percentage\":$2}}"
}

render() {
  local script="$1" session="$2" git_env="$3"
  shift 3
  local levels=("$@")
  for used in "${levels[@]}"; do
    printf "  %3d%% → " "$used"
    make_json "$session" "$((100 - used))" | GIT="$git_env" node "$script"
    echo ""
  done
}

section() {
  echo ""
  echo "  $1"
  echo "  ─────────────────────────────────────────────────────────────"
}

echo ""
echo "  Claude Statusline Preview"
echo "  ═══════════════════════════════════════════════════════════════"

# --- Powerline ---

section "Powerline (statusline.js)"
render "$SCRIPT_POWERLINE" "sess-preview-demo" "$BRANCH main" "${LEVELS[@]}"

section "Different sessions get different pets"
for sid in "sess-abc-001" "sess-xyz-042" "sess-def-099" "sess-ghi-777" "sess-jkl-256" "sess-mno-512"; do
  printf "  %-16s → " "$sid"
  make_json "$sid" 55 | GIT="$BRANCH main" node "$SCRIPT_POWERLINE"
  echo ""
done

section "No git (outside a repo)"
render "$SCRIPT_POWERLINE" "sess-nogit-demo" "" 0 30 65 85

# --- Default (Minimal + Nerd Font) ---

section "Default (statusline-default.js)"
render "$SCRIPT_DEFAULT" "sess-preview-demo" "$BRANCH main" "${LEVELS[@]}"

section "No git (outside a repo)"
render "$SCRIPT_DEFAULT" "sess-nogit-demo" "" 0 30 65 85

# --- Compatible (No Nerd Font) ---

section "Compatible (statusline-compat.js)"
render "$SCRIPT_COMPAT" "sess-preview-demo" "main" "${LEVELS[@]}"

section "No git (outside a repo)"
render "$SCRIPT_COMPAT" "sess-nogit-demo" "" 0 30 65 85
