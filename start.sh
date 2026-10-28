#!/usr/bin/env bash
# ==============================================================================
# Maruti Suzuki Marketing Intelligence & Showroom Analytics Platform
# Quickstart Script (Docker Runner)
# ==============================================================================

set -eo pipefail

# Text formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Determine script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Parse fast-exit flags before heavy checks
for arg in "$@"; do
    case $arg in
        --help|-h)
            echo "Usage: ./start.sh [options]"
            echo ""
            echo "Options:"
            echo "  --attach, -a     Run in foreground (attached mode)"
            echo "  --build, -b      Rebuild Docker images (default)"
            echo "  --no-build       Skip container image build step"
            echo "  --stop, down     Stop and remove containers"
            echo "  --restart        Restart existing containers"
            echo "  --logs, -l       Follow container logs"
            echo "  --help, -h       Display this help message"
            exit 0
            ;;
    esac
done

echo -e "${CYAN}${BOLD}"
cat << "EOF"
  __  __                  _   _   ____                _     _ 
 |  \/  | __ _ _ __ _   _| |_(_) / ___| _   _ _____ _| | __(_)
 | |\/| |/ _` | '__| | | | __| | \___ \| | | |_  / | | |/ /| |
 | |  | | (_| | |  | |_| | |_| |  ___) | |_| |/ // |_|   < | |
 |_|  |_|\__,_|_|   \__,_|\__|_| |____/ \__,_/___|___|_|\_\|_|
 Marketing Intelligence & Showroom Analytics Platform
EOF
echo -e "${NC}"

echo -e "${BOLD}[1/4] Checking prerequisites...${NC}"

# Check Docker CLI
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed or not found in PATH.${NC}"
    echo "Please install Docker Desktop or engine from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Daemon
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker daemon is not running.${NC}"
    echo "Please launch Docker Desktop or start the Docker service and try again."
    exit 1
fi

# Check Docker Compose (v2 plugin or v1 standalone)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}Error: Neither 'docker compose' nor 'docker-compose' was found.${NC}"
    echo "Please install the Docker Compose plugin or CLI."
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are ready.${NC}"

# Handle action flags that need Docker Compose
for arg in "$@"; do
    case $arg in
        --stop|stop|down)
            echo -e "${CYAN}Stopping running containers...${NC}"
            $DOCKER_COMPOSE down
            echo -e "${GREEN}✓ Containers stopped.${NC}"
            exit 0
            ;;
        --restart|restart)
            echo -e "${CYAN}Restarting containers...${NC}"
            $DOCKER_COMPOSE restart
            echo -e "${GREEN}✓ Containers restarted.${NC}"
            exit 0
            ;;
        --logs|logs|-l)
            $DOCKER_COMPOSE logs -f
            exit 0
            ;;
    esac
done

# Environment File Check
echo -e "\n${BOLD}[2/4] Verifying environment configuration...${NC}"
ENV_FILE=""
if [ -f ".env.local" ]; then
    ENV_FILE=".env.local"
    echo -e "${GREEN}✓ Found .env.local configuration file.${NC}"
elif [ -f ".env" ]; then
    ENV_FILE=".env"
    echo -e "${GREEN}✓ Found .env configuration file.${NC}"
else
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}! No .env or .env.local found. Creating .env.local from .env.example...${NC}"
        cp .env.example .env.local
        ENV_FILE=".env.local"
        echo -e "${GREEN}✓ Created .env.local.${NC}"
    else
        echo -e "${YELLOW}! No .env file found. Proceeding with default environment settings.${NC}"
    fi
fi

# Load variables from env file if present
if [ -n "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE" 2>/dev/null || true
    set +a
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
    echo -e "${YELLOW}ℹ Notice: GEMINI_API_KEY is not set in environment or ${ENV_FILE:-.env.local}.${NC}"
    echo -e "  The platform will run in offline / deterministic SQL mode with local mock fallbacks."
    echo -e "  To enable full Gemini AI synthesis, add your GEMINI_API_KEY to .env.local."
fi

# Build & Run Containers
echo -e "\n${BOLD}[3/4] Building and starting Docker containers...${NC}"

DETACHED=true
REBUILD="auto"

for arg in "$@"; do
    case $arg in
        --attach|-a)
            DETACHED=false
            ;;
        --no-build)
            REBUILD=false
            ;;
        --build|-b)
            REBUILD=true
            ;;
    esac
done

# Always build unless --no-build: Docker's layer cache makes an unchanged build fast,
# while reusing an existing image would silently keep serving old code
if [ "$REBUILD" = "auto" ]; then
    REBUILD=true
fi

COMPOSE_ARGS=("-f" "docker-compose.yml" "up")
if [ "$REBUILD" = true ]; then
    COMPOSE_ARGS+=("--build")
fi

if [ "$DETACHED" = true ]; then
    COMPOSE_ARGS+=("-d")
    $DOCKER_COMPOSE "${COMPOSE_ARGS[@]}"
else
    $DOCKER_COMPOSE "${COMPOSE_ARGS[@]}"
    exit 0
fi

# Health / Readiness Verification
echo -e "\n${BOLD}[4/4] Verifying service readiness...${NC}"
MAX_RETRIES=30
COUNT=0
READY=false

echo -n "Waiting for frontend service to initialize..."
while [ $COUNT -lt $MAX_RETRIES ]; do
    if curl -s -f http://localhost:3000/api/health &> /dev/null || curl -s -f http://localhost:3000 &> /dev/null; then
        READY=true
        break
    fi
    echo -n "."
    sleep 2
    COUNT=$((COUNT + 1))
done
echo ""

if [ "$READY" = true ]; then
    echo -e "\n${GREEN}${BOLD}======================================================${NC}"
    echo -e "${GREEN}${BOLD} 🚀 Maruti Suzuki Platform is running successfully!  ${NC}"
    echo -e "${GREEN}${BOLD}======================================================${NC}"
    echo -e "  🌐 Web App URL : ${CYAN}${BOLD}http://localhost:3000${NC}"
    echo -e "  📊 Redis Cache : ${CYAN}localhost:6379${NC}"
    echo -e ""
    echo -e "Useful Commands:"
    echo -e "  • View live logs : ${YELLOW}./start.sh --logs${NC} (or ${YELLOW}$DOCKER_COMPOSE logs -f${NC})"
    echo -e "  • Stop app       : ${YELLOW}./start.sh --stop${NC} (or ${YELLOW}$DOCKER_COMPOSE down${NC})"
    echo -e "  • Restart app    : ${YELLOW}./start.sh --restart${NC}"
    echo -e "${GREEN}${BOLD}======================================================${NC}\n"
else
    echo -e "\n${YELLOW}Containers started, but healthcheck is still warming up.${NC}"
    echo -e "You can inspect the startup logs using:"
    echo -e "  ${CYAN}./start.sh --logs${NC}\n"
fi
