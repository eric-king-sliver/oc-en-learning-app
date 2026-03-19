# English Learning App - Multi-modal English Scenario Learning Platform

## Overview

A mobile-first English learning application featuring scenario-based learning with multi-modal interactions (voice, text, video, AR).

## Tech Stack

- **Mobile**: React Native (Expo)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis
- **Storage**: S3-compatible (MinIO for local)
- **Real-time**: Socket.io
- **Voice AI**: Google Cloud Speech-to-Text + Whisper

## Project Structure

```
english-learning-app/
├── apps/
│   ├── mobile/          # React Native app
│   └── api/              # Express.js backend
├── packages/
│   ├── shared/           # Shared types and utilities
│   └── ui-components/    # Shared UI components
├── services/
│   └── speech-service/   # Python ML service for voice analysis
└── docs/                 # Design documents
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- pnpm (recommended) or npm

### Local Development

```bash
# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Redis, MinIO)
docker-compose up -d

# Run migrations
npm run db:migrate

# Start development
npm run dev
```

## Documentation

- [API Contracts](./docs/api-contracts.md)
- [Database Schema](./docs/database-schema.md)
- [Component Architecture](./docs/component-architecture.md)
- [Phase 1 MVP Tasks](./docs/phase1-mvp-tasks.md)

## License

Private - All rights reserved
