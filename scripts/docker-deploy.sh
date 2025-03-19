#!/bin/bash
# Docker deployment script for FOTS Web Application
# Usage: ./scripts/docker-deploy.sh [command]

set -e

# Default command
COMMAND=${1:-help}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
function check_env_file() {
  if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found. Creating sample file...${NC}"
    cat > .env << EOF
# App settings
APP_BASE_URL=http://localhost:3000

# Supabase connection
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# AT Protocol settings
ATPROTO_SERVICE=https://bsky.social
ATPROTO_FEED_HANDLE=your-atproto-feed-handle
ATPROTO_FEED_PASSWORD=your-atproto-feed-password

# Database (for local Supabase)
POSTGRES_PASSWORD=postgres
POSTGRES_USER=postgres
POSTGRES_DB=fots
EOF
    echo -e "${YELLOW}Please update the .env file with your actual values before proceeding.${NC}"
    exit 1
  fi
}

function build() {
  echo -e "${GREEN}Building FOTS Web Docker image...${NC}"
  docker-compose build
  echo -e "${GREEN}Build completed!${NC}"
}

function deploy() {
  check_env_file
  echo -e "${GREEN}Deploying FOTS Web application...${NC}"
  docker-compose up -d
  echo -e "${GREEN}Deployment completed! Application is running at http://localhost:3000${NC}"
}

function stop() {
  echo -e "${GREEN}Stopping FOTS Web application...${NC}"
  docker-compose down
  echo -e "${GREEN}Application stopped!${NC}"
}

function restart() {
  echo -e "${GREEN}Restarting FOTS Web application...${NC}"
  docker-compose restart
  echo -e "${GREEN}Application restarted!${NC}"
}

function logs() {
  echo -e "${GREEN}Showing logs for FOTS Web application...${NC}"
  docker-compose logs -f
}

function status() {
  echo -e "${GREEN}Checking status of FOTS Web application...${NC}"
  docker-compose ps
}

function help() {
  echo -e "${GREEN}FOTS Web Docker Deployment Script${NC}"
  echo -e "Usage: ./scripts/docker-deploy.sh [command]"
  echo -e ""
  echo -e "Commands:"
  echo -e "  ${YELLOW}build${NC}    - Build the Docker image"
  echo -e "  ${YELLOW}deploy${NC}   - Deploy the application (build and start containers)"
  echo -e "  ${YELLOW}stop${NC}     - Stop the application"
  echo -e "  ${YELLOW}restart${NC}  - Restart the application"
  echo -e "  ${YELLOW}logs${NC}     - Show container logs"
  echo -e "  ${YELLOW}status${NC}   - Check container status"
  echo -e "  ${YELLOW}help${NC}     - Show this help message"
}

# Execute the command
case $COMMAND in
  build)
    build
    ;;
  deploy)
    build
    deploy
    ;;
  stop)
    stop
    ;;
  restart)
    restart
    ;;
  logs)
    logs
    ;;
  status)
    status
    ;;
  help|*)
    help
    ;;
esac 