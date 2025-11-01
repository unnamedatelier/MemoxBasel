#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting MemoxBasel servers...${NC}"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start backend server
echo -e "${GREEN}Starting backend server...${NC}"
cd "$SCRIPT_DIR/backend"
uvicorn server:app --reload &
BACKEND_PID=$!

# Start frontend server
echo -e "${GREEN}Installing frontend dependencies...${NC}"
cd "$SCRIPT_DIR/frontend"
npm i

echo -e "${GREEN}Starting frontend server...${NC}"
npm run start &
FRONTEND_PID=$!

# Wait 1 second then open browser
sleep 1
echo -e "${GREEN}Opening browser...${NC}"

# Try different commands to open browser depending on OS
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000
elif command -v open > /dev/null; then
    open http://localhost:3000
elif command -v start > /dev/null; then
    start http://localhost:3000
else
    echo "Please open http://localhost:3000 in your browser"
fi

echo -e "${BLUE}Servers are running!${NC}"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
wait
