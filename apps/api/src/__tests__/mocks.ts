import { vi } from 'vitest';

// Mock Prisma Client
const mockPrisma = {
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
  $transaction: vi.fn((callback) => callback(mockPrisma)),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
};

// Mock bcrypt
vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
  compare: vi.fn().mockResolvedValue(true),
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn().mockReturnValue('mocked_token'),
  verify: vi.fn().mockReturnValue({ userId: 'test-user-id', type: 'access' }),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mocked-uuid'),
}));

// Mock console.log to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

export { mockPrisma };
