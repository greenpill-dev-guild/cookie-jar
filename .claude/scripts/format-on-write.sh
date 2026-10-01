#!/usr/bin/env bash
# PostToolUse hook for Edit|Write: formats the touched file with the repo's Biome so agents never
# leave tab or quote drift behind. Generated and vendored files are skipped.
set -u
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[ -z "$file" ] && exit 0

case "$file" in
	*/node_modules/*|*/.next/*|*/contracts/out/*|*/contracts/broadcast/*|*/client/generated.ts|*/client/config/deployments.auto.ts) exit 0 ;;
esac
case "$file" in
	*.ts|*.tsx|*.js|*.jsx|*.mjs|*.json|*.css) ;;
	*) exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null)}"
biome="$root/node_modules/.bin/biome"
[ -x "$biome" ] || exit 0
(cd "$root" && "$biome" format --write "$file" >/dev/null 2>&1) || true
exit 0
