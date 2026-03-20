import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockPrisma = vi.hoisted(() => ({
  scenario: {
    findUnique: vi.fn(),
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
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
}));

import { scenarioRouter } from '../routes/scenarios';

const app = express();
app.use(express.json());
app.use('/scenarios', scenarioRouter);

describe('Scenario Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /scenarios', () => {
    it('should return list of scenarios', async () => {
      const mockScenarios = [{
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'At the Restaurant',
        description: 'Practice ordering food',
        category: 'TRAVEL',
        difficulty: 'B1',
        locale: 'en-US',
        thumbnailUrl: null,
        estimatedMinutes: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { dialogues: 5, vocabulary: 20 },
      }];

      mockPrisma.scenario.findMany.mockResolvedValue(mockScenarios);
      mockPrisma.scenario.count.mockResolvedValue(1);

      const response = await request(app).get('/scenarios');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should filter by category', async () => {
      mockPrisma.scenario.findMany.mockResolvedValue([]);
      mockPrisma.scenario.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/scenarios')
        .query({ category: 'travel', page: 1, limit: 10 });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /scenarios/:id', () => {
    it('should return 404 for non-existent scenario', async () => {
      mockPrisma.scenario.findUnique.mockResolvedValue(null);
      const response = await request(app).get('/scenarios/550e8400-e29b-41d4-a716-446655440099');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /scenarios/:id/start', () => {
    it('should start a scenario session', async () => {
      const mockScenario = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'At Restaurant',
        _count: { dialogues: 5 },
      };

      mockPrisma.scenario.findUnique.mockResolvedValue(mockScenario);
      mockPrisma.learningSession.create.mockResolvedValue({
        id: 'session-1',
        startedAt: new Date(),
      });
      mockPrisma.userProgress.upsert.mockResolvedValue({});

      const response = await request(app)
        .post('/scenarios/550e8400-e29b-41d4-a716-446655440001/start');

      expect(response.status).toBe(201);
      expect(response.body.data.sessionId).toBe('session-1');
    });
  });
});
