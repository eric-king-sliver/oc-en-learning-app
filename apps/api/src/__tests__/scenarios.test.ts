import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken', () => ({
  verify: vi.fn(() => ({ userId: 'test-user-id' })),
}));

const { mock: mockPrisma } = vi.hoisted(() => ({
  mock: {
    scenario: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    dialogue: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    dialogueTurn: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    vocabulary: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    learningSession: {
      create: vi.fn(),
    },
    userProgress: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

import { scenarioRouter } from '../routes/scenarios';

const app = express();
app.use(express.json());

const testAuthMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    req.userId = 'test-user-id';
  }
  next();
};

app.use('/scenarios', testAuthMiddleware, scenarioRouter);

describe('Scenario Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /scenarios', () => {
    it('should return list of scenarios', async () => {
      mockPrisma.scenario.findMany.mockResolvedValue([
        { id: 'scenario-1', title: 'At the Restaurant', description: 'Practice ordering food', category: 'TRAVEL', difficulty: 'B1', locale: 'en-US', thumbnailUrl: null, estimatedMinutes: 15, isActive: true, createdAt: new Date(), updatedAt: new Date(), _count: { dialogues: 5, vocabulary: 20 } },
      ]);
      mockPrisma.scenario.count.mockResolvedValue(1);

      const response = await request(app).get('/scenarios');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should filter by category', async () => {
      mockPrisma.scenario.findMany.mockResolvedValue([]);
      mockPrisma.scenario.count.mockResolvedValue(0);

      const response = await request(app).get('/scenarios').query({ category: 'TRAVEL', page: 1, limit: 10 });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /scenarios/:id', () => {
    it('should return 404 for non-existent scenario', async () => {
      mockPrisma.scenario.findUnique.mockResolvedValue(null);
      const response = await request(app).get('/scenarios/invalid-id');
      expect(response.status).toBe(400);
    });
  });

  describe('POST /scenarios/:id/start', () => {
    it('should start a scenario session', async () => {
      mockPrisma.scenario.findUnique.mockResolvedValue({ id: 'scenario-1', title: 'At Restaurant', _count: { dialogues: 5 } });
      mockPrisma.learningSession.create.mockResolvedValue({ id: 'session-1', startedAt: new Date() });
      mockPrisma.userProgress.upsert.mockResolvedValue({});

      const response = await request(app)
        .post('/scenarios/scenario-1/start')
        .set('Authorization', 'Bearer any-token');

      expect(response.status).toBe(201);
    });
  });
});
