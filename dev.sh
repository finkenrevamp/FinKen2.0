#!/bin/bash

# FinKen 2.0 Development Scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check if .env file exists
check_env() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Please create one based on .env.example"
        return 1
    fi
    return 0
}

# Setup backend
setup_backend() {
    print_header "Setting up Backend"
    
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d ".venv" ]; then
        print_status "Creating virtual environment..."
        python -m venv .venv
    fi
    
    # Activate virtual environment
    print_status "Activating virtual environment..."
    source .venv/bin/activate
    
    # Install dependencies
    print_status "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    
    print_status "Backend setup complete!"
    cd ..
}

# Setup frontend
setup_frontend() {
    print_header "Setting up Frontend"
    
    cd frontend
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    
    print_status "Frontend setup complete!"
    cd ..
}

# Run backend
run_backend() {
    print_header "Starting Backend Server"
    
    if ! check_env; then
        exit 1
    fi
    
    cd backend
    source .venv/bin/activate
    
    print_status "Starting FastAPI server on http://localhost:8000"
    python main.py
}

# Run frontend
run_frontend() {
    print_header "Starting Frontend Server"
    
    cd frontend
    
    print_status "Starting Vite dev server on http://localhost:5173"
    npm run dev
}

# Run both frontend and backend
run_dev() {
    print_header "Starting Development Environment"
    
    if ! check_env; then
        exit 1
    fi
    
    # Check if tmux is available
    if command -v tmux &> /dev/null; then
        print_status "Starting backend and frontend in tmux session..."
        
        # Create tmux session
        tmux new-session -d -s finken
        
        # Split window
        tmux split-window -h
        
        # Run backend in first pane
        tmux send-keys -t finken:0.0 "cd backend && source .venv/bin/activate && python main.py" Enter
        
        # Run frontend in second pane
        tmux send-keys -t finken:0.1 "cd frontend && npm run dev" Enter
        
        # Attach to session
        tmux attach-session -t finken
    else
        print_warning "tmux not found. Please run backend and frontend separately:"
        print_status "Terminal 1: ./dev.sh backend"
        print_status "Terminal 2: ./dev.sh frontend"
    fi
}

# Test backend
test_backend() {
    print_header "Running Backend Tests"
    
    cd backend
    source .venv/bin/activate
    
    print_status "Running pytest..."
    pytest -v
}

# Test frontend
test_frontend() {
    print_header "Running Frontend Tests"
    
    cd frontend
    
    print_status "Running npm test..."
    npm test
}

# Clean up
clean() {
    print_header "Cleaning Project"
    
    print_status "Removing backend cache..."
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true
    
    print_status "Removing frontend cache..."
    rm -rf frontend/node_modules/.cache 2>/dev/null || true
    
    print_status "Clean complete!"
}

# Show help
show_help() {
    echo "FinKen 2.0 Development Helper"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  setup          - Setup both backend and frontend"
    echo "  setup-backend  - Setup backend only"
    echo "  setup-frontend - Setup frontend only"
    echo "  backend        - Run backend server"
    echo "  frontend       - Run frontend server"
    echo "  dev            - Run both backend and frontend (requires tmux)"
    echo "  test           - Run all tests"
    echo "  test-backend   - Run backend tests"
    echo "  test-frontend  - Run frontend tests"
    echo "  clean          - Clean cache and temporary files"
    echo "  help           - Show this help message"
    echo ""
}

# Main script logic
case "$1" in
    "setup")
        setup_backend
        setup_frontend
        ;;
    "setup-backend")
        setup_backend
        ;;
    "setup-frontend")
        setup_frontend
        ;;
    "backend")
        run_backend
        ;;
    "frontend")
        run_frontend
        ;;
    "dev")
        run_dev
        ;;
    "test")
        test_backend
        test_frontend
        ;;
    "test-backend")
        test_backend
        ;;
    "test-frontend")
        test_frontend
        ;;
    "clean")
        clean
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        print_error "No command specified"
        show_help
        exit 1
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac