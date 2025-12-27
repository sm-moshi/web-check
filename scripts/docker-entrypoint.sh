#!/bin/bash
set -euo pipefail

term_handler() {
    trap - SIGTERM SIGINT
    kill 0
}

trap term_handler SIGTERM SIGINT

/usr/local/bin/wappalyzergo &
WAPP_PID=$!

node /app/server.js &
NODE_PID=$!

wait -n "$WAPP_PID" "$NODE_PID"
EXIT_CODE=$?

kill "$WAPP_PID" "$NODE_PID" 2>/dev/null || true
wait 2>/dev/null || true

exit "$EXIT_CODE"
