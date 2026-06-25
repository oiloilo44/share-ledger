#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.devserver"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
BACKEND_LOG="$PID_DIR/backend.log"
FRONTEND_LOG="$PID_DIR/frontend.log"

mkdir -p "$PID_DIR"

BACKEND_CMD=("env" "PYTHONPATH=$ROOT_DIR/backend" "$ROOT_DIR/backend/.venv/bin/python" "-m" "uvicorn" "app.main:app" "--reload" "--host" "0.0.0.0" "--port" "8000")
FRONTEND_CMD=("pnpm" "--filter" "frontend" "dev" "--" "--host" "0.0.0.0" "--port" "5173")

print_usage() {
  cat <<'EOF'
사용법: ./dev-servers.sh <start|stop|status|logs>

  start   백엔드(uvicorn)와 프론트엔드(Vite) 개발 서버를 백그라운드에서 시작합니다.
  stop    실행 중인 개발 서버를 종료합니다.
  status  현재 실행 상태를 확인합니다.
  logs    최근 로그 파일(.devserver/*.log)을 확인합니다.
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "필수 명령어 '$1' 을(를) 찾을 수 없습니다. PATH를 확인하거나 설치해주세요." >&2
    exit 1
  fi
}

is_process_running() {
  local pid_file="$1"
  if [[ ! -f "$pid_file" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$pid_file")"
  if ps -p "$pid" >/dev/null 2>&1; then
    return 0
  fi

  rm -f "$pid_file"
  return 1
}

ensure_backend_env() {
  if [[ ! -x "$ROOT_DIR/backend/.venv/bin/python" ]]; then
    cat >&2 <<'EOF'
backend/.venv 이 준비되어 있지 않습니다. 아래 명령으로 가상환경과 의존성을 먼저 설치해주세요:
  uv venv backend/.venv --python 3.11
  (cd backend && uv sync --python .venv/bin/python --extra dev)
EOF
    exit 1
  fi
}

start_backend() {
  if is_process_running "$BACKEND_PID_FILE"; then
    echo "백엔드 서버가 이미 실행 중입니다. (pid: $(cat "$BACKEND_PID_FILE"))"
    return 0
  fi

  ensure_backend_env

  echo "백엔드 서버를 시작합니다..."
  (
    cd "$ROOT_DIR"
    nohup "${BACKEND_CMD[@]}" >"$BACKEND_LOG" 2>&1 &
    echo $! >"$BACKEND_PID_FILE"
  )
  echo "백엔드 로그: $BACKEND_LOG"
}

start_frontend() {
  if is_process_running "$FRONTEND_PID_FILE"; then
    echo "프론트엔드 서버가 이미 실행 중입니다. (pid: $(cat "$FRONTEND_PID_FILE"))"
    return 0
  fi

  require_command pnpm

  echo "프론트엔드 서버를 시작합니다..."
  (
    cd "$ROOT_DIR"
    nohup "${FRONTEND_CMD[@]}" >"$FRONTEND_LOG" 2>&1 &
    echo $! >"$FRONTEND_PID_FILE"
  )
  echo "프론트엔드 로그: $FRONTEND_LOG"
}

stop_process() {
  local pid_file="$1"
  local name="$2"

  if ! is_process_running "$pid_file"; then
    echo "$name 서버는 실행 중이 아닙니다."
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"
  echo "$name 서버(pid: $pid)를 종료합니다..."

  if kill "$pid" >/dev/null 2>&1; then
    for _ in {1..10}; do
      if ps -p "$pid" >/dev/null 2>&1; then
        sleep 0.5
      else
        break
      fi
    done
    rm -f "$pid_file"
    echo "$name 서버가 종료되었습니다."
  else
    echo "$name 서버 종료에 실패했습니다. 수동 확인이 필요합니다." >&2
    return 1
  fi
}

stop_port_processes() {
  local port="$1"
  local description="$2"

  mapfile -t pids < <(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [[ ${#pids[@]} -eq 0 ]]; then
    return 0
  fi

  local known_pids=()
  [[ -f "$FRONTEND_PID_FILE" ]] && known_pids+=("$(cat "$FRONTEND_PID_FILE")")
  [[ -f "$BACKEND_PID_FILE" ]] && known_pids+=("$(cat "$BACKEND_PID_FILE")")

  echo "${description} 포트($port)를 점유한 잔여 프로세스를 정리합니다..."
  for pid in "${pids[@]}"; do
    local skip=false
    for known_pid in "${known_pids[@]}"; do
      if [[ "$pid" == "$known_pid" ]]; then
        skip=true
        break
      fi
    done
    if [[ "$skip" == true ]]; then
      continue
    fi
    if kill "$pid" >/dev/null 2>&1; then
      echo " - 추가 프로세스(pid: $pid) 종료"
    fi
  done
}

show_status() {
  if is_process_running "$BACKEND_PID_FILE"; then
    echo "백엔드: 실행 중 (pid: $(cat "$BACKEND_PID_FILE"))"
  else
    echo "백엔드: 정지됨"
  fi

  if is_process_running "$FRONTEND_PID_FILE"; then
    echo "프론트엔드: 실행 중 (pid: $(cat "$FRONTEND_PID_FILE"))"
  else
    echo "프론트엔드: 정지됨"
  fi
}

print_log() {
  local label="$1"
  local path="$2"

  if [[ -f "$path" ]]; then
    echo "=== ${label} 로그 (최근 50줄) ==="
    tail -n 50 "$path"
  else
    echo "${label} 로그 파일이 없습니다."
  fi
}

show_logs() {
  local target="${1-}"
  case "$target" in
    backend)
      print_log "백엔드" "$BACKEND_LOG"
      ;;
    frontend)
      print_log "프론트엔드" "$FRONTEND_LOG"
      ;;
    ""|all)
      print_log "백엔드" "$BACKEND_LOG"
      echo
      print_log "프론트엔드" "$FRONTEND_LOG"
      ;;
    *)
      echo "logs 명령은 backend | frontend | all 중 하나를 사용할 수 있습니다." >&2
      return 1
      ;;
  esac
}

if [[ $# -lt 1 ]]; then
  print_usage
  exit 1
fi

case "$1" in
  start)
    stop_port_processes 8000 "백엔드 개발 서버"
    stop_port_processes 5173 "프론트엔드 개발 서버"
    require_command nohup
    require_command ps
    start_backend
    start_frontend
    ;;
  stop)
    stop_process "$BACKEND_PID_FILE" "백엔드"
    stop_process "$FRONTEND_PID_FILE" "프론트엔드"
    stop_port_processes 8000 "백엔드 개발 서버"
    stop_port_processes 5173 "프론트엔드 개발 서버"
    ;;
  status)
    show_status
    ;;
  logs)
    show_logs "${2-}"
    ;;
  *)
    print_usage
    exit 1
    ;;
esac
