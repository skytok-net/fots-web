# Docker Deployment Guide

This guide explains how to deploy the Food on the Stove (FOTS) web application using Docker and Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your system
- Environment variables configured (see below)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
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
POSTGRES_PASSWORD=your-secure-password
```

## Deployment Options

### Option 1: Full Stack with Local Database

Run the full application stack including Supabase and Redis:

```bash
docker-compose up -d
```

### Option 2: Web App Only (Using External Services)

If you're using external Supabase services, you can run just the web app:

```bash
docker-compose up -d webapp
```

## Building Custom Images

To build and tag a custom Docker image:

```bash
docker build -t your-registry/fots-web:version .
```

## Production Deployment

For production deployment, consider:

1. Using a reverse proxy like Nginx or Traefik for SSL termination
2. Setting up proper logging and monitoring
3. Managing environment variables securely via Docker secrets or environment management systems

Example production compose file section:

```yaml
webapp:
  image: your-registry/fots-web:version
  restart: always
  environment:
    - NODE_ENV=production
    # Other environment variables...
  deploy:
    replicas: 2
    update_config:
      parallelism: 1
      delay: 10s
    restart_policy:
      condition: on-failure
  networks:
    - web
    - internal
```

## Troubleshooting

### Health Check Failures

If the health check fails, check:
- Application logs: `docker-compose logs webapp`
- Ensure all environment variables are set correctly
- Verify connectivity to Supabase and other external services

### Container Restart Issues

If containers keep restarting:
- Check the logs for error messages
- Ensure sufficient system resources are available
- Verify network connectivity between containers 