# Food on the Stove (FOTS) Web Application

A modern web application built on the AT Protocol, providing a client-side focused architecture for a seamless and responsive user experience.

## Overview

FOTS-web is a Remix-based application that leverages the AT Protocol (Authenticated Transfer Protocol) for decentralized identity and social data. It uses a unique client-side architecture with PGlite for browser-based data persistence and caching.

### Key Features

- **AT Protocol Integration**: Full authentication and identity management using the AT Protocol (Bluesky)
- **Client-Side Database**: Browser-based PostgreSQL instance using PGlite and WebAssembly
- **Offline Capability**: Continue using the application even when offline with local data persistence
- **Real-time Synchronization**: Sync data seamlessly between client and server 
- **Modern UI**: Built with Tailwind CSS and Radix UI components

## Technology Stack

- **Framework**: [Remix](https://remix.run/docs)
- **AT Protocol**: [@atproto/api](https://github.com/bluesky-social/atproto)
- **Client-Side DB**: [PGlite](https://electric-sql.com/docs/usage/pglite)
- **Data Layer**: [Drizzle ORM](https://orm.drizzle.team/)
- **API**: [GraphQL](https://graphql.org/) with Apollo Client
- **UI**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)

## Architecture

The application uses a unique architecture that moves much of the data processing to the client:

1. **AT Protocol Authentication**: User identity and authentication via AT Protocol (Bluesky)
2. **Client-Side PostgreSQL**: PGlite runs in the browser via WebAssembly
3. **Efficient Syncing**: Background synchronization with server data
4. **Performance Optimizations**: Local caching and processing for faster user experience

## Development

Run the development server:

```shell
bun run dev
```

### PGlite WASM Setup

The application requires PGlite WebAssembly files. Before building:

```shell
npm run copy-pglite-wasm
```

## Building for Production

```shell
npm run build
npm start
```

## Deployment

When deploying, ensure you include both server and client builds:

- `build/server`
- `build/client`

## Docker Deployment

The application can be deployed using Docker and Docker Compose.

### Quick Start with Docker

Use our deployment script to easily manage the Docker environment:

```shell
# Show available commands
./scripts/docker-deploy.sh help

# Deploy the application
./scripts/docker-deploy.sh deploy

# Check status
./scripts/docker-deploy.sh status

# View logs
./scripts/docker-deploy.sh logs
```

Or use Docker Compose directly:

```shell
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f webapp
```

### Container Structure

- **Base image**: Bun slim image
- **Multistage build**: Optimized for smaller production images
- **Included services**: Webapp, Supabase PostgreSQL, Redis

See [Docker Deployment Guide](docs/docker-deployment.md) for more detailed instructions.

## Environment Setup

The application requires several environment variables for AT Protocol integration. See `.env.local` for examples.

## Learn More

- [AT Protocol Documentation](https://atproto.com/docs)
- [PGlite Documentation](https://electric-sql.com/docs/usage/pglite)
- [Remix Documentation](https://remix.run/docs)
