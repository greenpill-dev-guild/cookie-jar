#!/usr/bin/env bash
# PreToolUse hook for Bash. Blocks the mistakes that have cost this repo time and asks for a
# confirmation before anything that can touch a live network.
# Contract: stdin carries the tool input JSON; exit 2 blocks the call and sends stderr to the
# agent; a JSON permissionDecision on stdout forces a confirmation prompt.
set -u
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
[ -z "$cmd" ] && exit 0

block() {
	printf 'Blocked by .claude/scripts/guard-bash.sh: %s\n' "$1" >&2
	exit 2
}

# 1. "bun test" runs Bun's own runner, which ignores vitest.config. Use "bun run test".
if printf '%s' "$cmd" | grep -Eq '(^|[;&| ])bun test([ ;&|]|$)'; then
	block "'bun test' uses Bun's runner and ignores the Vitest config. Use 'bun run test' (or 'cd client && bun run test')."
fi

# 2. Secret files stay out of agent sessions. example.env is documentation and stays readable.
q="'"
scrubbed=$(printf '%s' "$cmd" | sed -E 's/(\.env\.example|example\.env)//g')
if printf '%s' "$scrubbed" | grep -Eq "(^|[ /=\"$q])\\.env(\\.[A-Za-z0-9_-]+)?([ ;&|\"$q]|\$)"; then
	block "commands that read or reference dotenv files are not allowed here. Ask the user for the value you need."
fi
if printf '%s' "$cmd" | grep -Eq "(^|[ /=\"$q])[^ ]*keystores?/|\\.pem([ ;&|]|\$)"; then
	block "keystore and key files must not be read in an agent session."
fi

# 3. The shared branches are never rewritten.
if printf '%s' "$cmd" | grep -Eq 'git[^;&|]*push[^;&|]*(--force|-f)[^;&|]*(main|dev)([ ;&|]|$)'; then
	block "rewriting main or dev is not allowed."
fi

# 4. Anything that can spend real funds or change a live deployment asks for confirmation.
if printf '%s' "$cmd" | grep -Eq 'deploy:arbitrum|create-jar:arbitrum|forge script[^;&|]*--broadcast|vercel[^;&|]*--prod|cast send'; then
	cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"This command can broadcast to a live network or move funds. Confirm the user asked for exactly this in the current turn and that a dry run was reviewed."}}
JSON
fi
exit 0
