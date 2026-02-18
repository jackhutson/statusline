#!/bin/bash
# Preview statusline — all states and session pets
# Usage: bash preview.sh

SCRIPT="$(cd "$(dirname "$0")" && pwd)/preview-runner.js"
LEVELS=(0 8 25 45 60 70 80 90 100)
BRANCH=$'\uF418'

make_json() {
  echo "{\"model\":{\"display_name\":\"Opus 4.6\"},\"workspace\":{\"current_dir\":\"/Users/demo/my-project\"},\"session_id\":\"$1\",\"context_window\":{\"remaining_percentage\":$2}}"
}

render() {
  local session="$1" git_env="$2"
  shift 2
  local levels=("$@")
  for used in "${levels[@]}"; do
    printf "  %3d%% → " "$used"
    make_json "$session" "$((100 - used))" | GIT="$git_env" node "$SCRIPT"
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

section "Full progress range (with git)"
render "sess-preview-demo" "$BRANCH main" "${LEVELS[@]}"

section "Different sessions get different pets"
for sid in "sess-abc-001" "sess-xyz-042" "sess-def-099" "sess-ghi-777" "sess-jkl-256" "sess-mno-512"; do
  printf "  %-16s → " "$sid"
  make_json "$sid" 55 | GIT="$BRANCH main" node "$SCRIPT"
  echo ""
done

section "No git (outside a repo)"
render "sess-nogit-demo" "" 0 30 65 85
