import { vi } from 'vitest';

export const createMockPrisma = () => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  emailVerificationToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  passwordResetToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
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
    count: vi.fn(),
  },
  vocabulary: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  vocabularyItem: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  learningSession: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  userProgress: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
  },
  video: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  chatbotConversation: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  chatbotMessage: {
    create: vi.fn(),
  },
  friend: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  sharedProgress: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  liveSession: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  sessionMessage: {
    create: vi.fn(),
  },
  matchHistory: {
    create: vi.fn(),
  },
  aRObject: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  scannedObject: {
    upsert: vi.fn(),
  },
  scanHistory: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  voiceRecording: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn((callback: any) => callback({})),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
});

export const mockPrisma = createMockPrisma();

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));
