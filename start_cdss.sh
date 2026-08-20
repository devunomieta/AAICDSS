#!/usr/bin/env bash
echo "=========================================="
echo "   Starting AffiongAI Full-Stack System   "
echo "=========================================="

# Ensure NVM and PATH prioritize updated Node version
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$HOME/.local/bin:$PATH"

# Check and start Ollama service if available
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "[+] Ollama service is active on port 11434."
elif command -v ollama > /dev/null 2>&1; then
    echo "[+] Starting local Ollama service daemon..."
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    sleep 2
    echo "[+] Ollama started on port 11434."
else
    echo "[!] Notice: Ollama binary not found. Start 'ollama run llama3' if you need AI Report Generation."
fi
echo ""

# Free ports if previously in use
fuser -k 8686/tcp 5173/tcp > /dev/null 2>&1

# Start backend
echo "[+] Starting Python FastAPI Backend on port 8686..."
.venv/bin/python main.py &
BACKEND_PID=$!

# Start frontend
echo "[+] Starting React UI Server on port 5173..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "=========================================="
echo "System is online."
echo "Press Ctrl+C to shut down all servers."
echo "=========================================="

cleanup() {
    echo "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    [ -n "$OLLAMA_PID" ] && kill $OLLAMA_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

wait
