#!/bin/bash
# Run from repo root: ./start.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Ollama (embeddings / LLM API) ==="
if ! command -v ollama &>/dev/null; then
  echo "Installing Ollama via official script (may prompt for sudo)..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

if ! curl -sf "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
  echo "Starting ollama serve in the background..."
  ollama serve &
  READY=0
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
      READY=1
      break
    fi
    sleep 1
  done
  if [[ "$READY" -ne 1 ]]; then
    echo "Warning: Ollama did not respond on http://127.0.0.1:11434 within 30s." >&2
  fi
else
  echo "Ollama already listening on http://127.0.0.1:11434"
fi

echo "=== Backend (FastAPI) ==="
cd "$ROOT/apps/services" || exit 1
if [[ ! -x bin/python ]]; then
  python3 -m venv .
fi
# shellcheck source=/dev/null
source ./bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 &

echo "=== Frontend ==="
cd "$ROOT/apps/frontend" || exit 1
npm install
npm run build &
npm run start &

echo "Done. Backend: http://127.0.0.1:8000  Ollama: http://127.0.0.1:11434"
