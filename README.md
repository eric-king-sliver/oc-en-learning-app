# English Learning App - Multi-modal English Scenario Learning Platform

## Overview

A mobile-first English learning application featuring scenario-based learning with multi-modal interactions (voice, text, video, AR).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native (Expo) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 15+ with Prisma ORM |
| Cache | Redis |
| Storage | S3-compatible (MinIO for local) |
| Real-time | Socket.io |
| Voice AI | Google Cloud Speech-to-Text + Whisper |

## Project Structure

```
english-learning-app/
├── apps/
│   ├── mobile/              # React Native (Expo) mobile app
│   └── api/                  # Express.js REST API
├── packages/
│   ├── shared/               # Shared types and utilities
│   └── ui-components/        # Shared UI components
├── services/
│   └── speech-service/       # Python ML service for voice analysis
└── docs/                     # Design documents
```

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/eric-king-sliver/oc-en-learning-app.git
cd oc-en-learning-app
npm install
```

### 2. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- MinIO S3 (port 9000/9001)
- Mailhog (port 1025/8025) - for email testing

### 3. Setup Backend

```bash
cd apps/api
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with sample data
npm run db:seed

# Start development server
npm run dev
```

API runs on http://localhost:3000

### 4. Setup Mobile (Optional)

```bash
cd apps/mobile
npm install
npx expo start
```

## API Documentation

Once the backend is running, access:
- Swagger UI: http://localhost:3000/api-docs
- Health Check: http://localhost:3000/health

### Key Endpoints

| Category | Endpoint | Description |
|----------|----------|-------------|
| Auth | POST /api/v1/auth/register | User registration |
| Auth | POST /api/v1/auth/login | User login |
| Auth | POST /api/v1/auth/refresh | Refresh token |
| Users | GET /api/v1/users/me | Get user profile |
| Scenarios | GET /api/v1/scenarios | List scenarios |
| Scenarios | GET /api/v1/scenarios/:id | Get scenario details |
| Sessions | POST /api/v1/sessions | Start learning session |
| Progress | GET /api/v1/progress | Get user progress |
| Recordings | POST /api/v1/recordings | Upload voice recording |

## Development

### Running Tests

```bash
cd apps/api
npm test
```

### Database Management

```bash
# Open Prisma Studio
npx prisma studio

# Create migration
npx prisma migrate dev --name "add_feature"

# Reset database
npx prisma migrate reset
```

### Git Workflow

1. Create feature branch from `develop`
2. Make changes and commit
3. Push to `origin/develop`
4. Create Pull Request on GitHub

```bash
git checkout -b feature/my-feature
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

## Environment Variables

### Backend (.env)

```env
DATABASE_URL="postgresql://english_learning:english_learning_dev@localhost:5432/english_learning_dev"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="english_learning"
S3_SECRET_KEY="english_learning_dev_secret"
S3_BUCKET="english-learning-dev"
```

## Demo Credentials

After running the seed script:

```
Email: demo@example.com
Password: Password123!
```

## Features

### Implemented (Phase 1 MVP)

- User authentication (register, login, JWT tokens)
- Password reset flow
- Scenario-based learning content
- 10 pre-loaded English scenarios
- Dialogue practice with AI characters
- Voice recording and pronunciation scoring
- Progress tracking and statistics
- Learning streak system
- Daily goals

### Planned (Phase 2+)

- Video integration
- Chatbot conversations
- Offline mode
- Social features
- AR scenarios
- Live practice sessions
- Content marketplace

## Documentation

- [API Contracts](./docs/api-contracts.md)
- [Database Schema](./docs/database-schema.md)
- [Component Architecture](./docs/component-architecture.md)
- [Phase 1 MVP Tasks](./docs/phase1-mvp-tasks.md)
- [Design Review Summary](./docs/design-review-summary.md)
- [UAT Test Plan](./docs/uat-test-plan.md)

## Building APK

### Prerequisites

1. Node.js 18+
2. EAS CLI: `npm install -g eas-cli`
3. Expo account (for EAS Build)

### Build Commands

```bash
cd apps/mobile

# Build for Android (APK)
eas build --platform android --profile preview --non-interactive

# Build for Android (AAB - for Play Store)
eas build --platform android --profile production --non-interactive

# Build locally
eas build --platform android --local --profile preview
```

### APK Location

After build completes, download the APK from:
1. EAS Dashboard: https://expo.dev/console
2. Or via CLI: `eas build:list`

### Development Build (Faster Iteration)

For development with hot reload:
```bash
npx expo start
# Scan QR code with Expo Go app
```

### Configuration

Edit `eas.json` to modify build profiles:
- `preview`: For internal testing (APK)
- `production`: For release (AAB)

## License

Private - All rights reserved
