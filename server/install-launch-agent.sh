#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script requires macOS." >&2
  exit 1
fi

server_dir="$(cd "$(dirname "$0")" && pwd -P)"
node_path="$(command -v node || true)"
if [[ -z "$node_path" || "$node_path" != /* ]]; then
  echo "Node.js was not found. Install Node.js 22.18 or newer first." >&2
  exit 1
fi
if ! "$node_path" -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 18) ? 0 : 1)'; then
  echo "Node.js 22.18 or newer is required." >&2
  exit 1
fi
if [[ ! -f "$server_dir/.env" || ! -d "$server_dir/node_modules" ]]; then
  echo "Set up server/.env and install dependencies before running this script." >&2
  exit 1
fi

label="nl.julienkolkman.jiralogger"
agent_dir="$HOME/Library/LaunchAgents"
agent_file="$agent_dir/$label.plist"
domain="gui/$(id -u)"
mkdir -p "$agent_dir"
temp_file="$(mktemp "$agent_dir/.jiralogger.XXXXXX")"
trap 'rm -f "$temp_file"' EXIT

# Escape paths for XML, including spaces and characters such as &.
xml_escape() {
  printf '%s' "$1" | sed -e 's/\&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g' -e "s/'/\&apos;/g"
}

cat > "$temp_file" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key><array>
    <string>$(xml_escape "$node_path")</string>
    <string>--env-file=.env</string>
    <string>server.ts</string>
  </array>
  <key>WorkingDirectory</key><string>$(xml_escape "$server_dir")</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/jiralogger.log</string>
  <key>StandardErrorPath</key><string>/tmp/jiralogger.err</string>
</dict></plist>
EOF

plutil -lint "$temp_file" >/dev/null
if launchctl print "$domain/$label" >/dev/null 2>&1; then
  launchctl bootout "$domain/$label"
fi
mv -f "$temp_file" "$agent_file"
launchctl bootstrap "$domain" "$agent_file"
echo "Jira logger installed and started. Logs: /tmp/jiralogger.log and /tmp/jiralogger.err"
