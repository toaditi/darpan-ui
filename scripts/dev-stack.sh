#!/bin/sh

set -u

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
UI_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
DEFAULT_BACKEND_DIR="$UI_DIR/../darpan-backend"
BACKEND_DIR=${DARPAN_BACKEND_DIR:-$DEFAULT_BACKEND_DIR}
BACKEND_TASK=${DARPAN_BACKEND_TASK:-run}
BACKEND_COMMAND=${DARPAN_BACKEND_COMMAND:-}
BACKEND_PORT=${DARPAN_BACKEND_PORT:-8080}
FRONTEND_PORT=${DARPAN_FRONTEND_PORT:-5173}
BACKEND_PID=""
FRONTEND_PID=""

stop_process() {
  pid="$1"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  trap - INT TERM EXIT
  stop_process "$FRONTEND_PID"
  stop_process "$BACKEND_PID"
}

find_listener_pids() {
  port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

clear_port() {
  port="$1"
  pids=$(find_listener_pids "$port")
  if [ -z "$pids" ]; then
    return 0
  fi

  echo "Stopping existing listener(s) on port $port: $pids"
  for pid in $pids; do
    kill "$pid" 2>/dev/null || true
  done

  attempts=0
  while [ "$attempts" -lt 5 ]; do
    remaining=$(find_listener_pids "$port")
    if [ -z "$remaining" ]; then
      return 0
    fi
    sleep 1
    attempts=$((attempts + 1))
  done

  remaining=$(find_listener_pids "$port")
  if [ -n "$remaining" ]; then
    echo "Force stopping lingering listener(s) on port $port: $remaining"
    for pid in $remaining; do
      kill -9 "$pid" 2>/dev/null || true
    done
    sleep 1
  fi

  remaining=$(find_listener_pids "$port")
  if [ -n "$remaining" ]; then
    echo "darpan-ui dev stack error: unable to clear listener(s) on port $port: $remaining" >&2
    exit 1
  fi
}

trap 'cleanup' INT TERM EXIT

if [ ! -d "$BACKEND_DIR" ]; then
  echo "darpan-ui dev stack error: backend directory not found at $BACKEND_DIR" >&2
  echo "Set DARPAN_BACKEND_DIR to the darpan-backend checkout before running npm run dev:stack." >&2
  exit 1
fi

if [ -z "$BACKEND_COMMAND" ] && [ ! -x "$BACKEND_DIR/gradlew" ]; then
  echo "darpan-ui dev stack error: expected executable gradlew at $BACKEND_DIR/gradlew" >&2
  echo "Set DARPAN_BACKEND_COMMAND to override the backend startup command if needed." >&2
  exit 1
fi

clear_port "$BACKEND_PORT"
clear_port "$FRONTEND_PORT"

echo "Starting backend from $BACKEND_DIR"
if [ -n "$BACKEND_COMMAND" ]; then
  (
    cd "$BACKEND_DIR" || exit 1
    exec sh -lc "$BACKEND_COMMAND"
  ) &
else
  (
    cd "$BACKEND_DIR" || exit 1
    exec ./gradlew --no-daemon "$BACKEND_TASK"
  ) &
fi
BACKEND_PID=$!

echo "Starting frontend from $UI_DIR"
(
  cd "$UI_DIR" || exit 1
  exec npm run dev -- --port "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

while :; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    wait "$BACKEND_PID"
    STATUS=$?
    echo "Backend process exited with status $STATUS." >&2
    exit "$STATUS"
  fi

  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    wait "$FRONTEND_PID"
    STATUS=$?
    echo "Frontend process exited with status $STATUS." >&2
    exit "$STATUS"
  fi

  sleep 1
done
