import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Use vi.hoisted() to properly hoist mocks
const { mockPrisma, mockUserMethods, mockTokenMethods } = vi.hoisted(() => {
  const mockUserMethods = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockTokenMethods = {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  };

  const mockPrisma = {
    user: mockUserMethods,
    emailVerificationToken: mockTokenMethods,
    passwordResetToken: { ...mockTokenMethods, update: vi.fn() },
    $transaction: vi.fn((callback: (prisma: any) => Promise<any>) => callback(mockPrisma)),
  };

  return { mockPrisma, mockUserMethods, mockTokenMethods };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// Import after mock setup
import { authRouter } from '../routes/auth';

const app = express();
app.use(express.json());
app.use('/auth', authRouter);

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        nativeLanguage: 'en',
        emailVerified: false,
        accountStatus: 'active',
      };

      mockUserMethods.findUnique.mockResolvedValue(null);
      mockUserMethods.create.mockResolvedValue(mockUser);
      mockTokenMethods.create.mockResolvedValue({});

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          displayName: 'Test User',
          nativeLanguage: 'en',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return 400 if email already registered', async () => {
      mockUserMethods.findUnique.mockResolvedValue({ id: 'existing-user' });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password123',
          displayName: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123',
          displayName: 'Test User',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        passwordHash: 'hashed_password',
        accountStatus: 'active',
        avatarUrl: null,
        nativeLanguage: 'en',
        currentProficiency: 'B1',
        emailVerified: true,
      };

      mockUserMethods.findUnique.mockResolvedValue(mockUser);
      mockUserMethods.update.mockResolvedValue({});

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should return 401 for invalid credentials', async () => {
      mockUserMethods.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 for suspended account', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        accountStatus: 'suspended',
      };

      mockUserMethods.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const mockUser = {
        id: 'user-123',
        accountStatus: 'active',
      };

      mockUserMethods.findUnique.mockResolvedValue(mockUser);

      const validRefreshToken = jwt.sign(
        { userId: 'user-123', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: validRefreshToken,
        });

      expect(response.status).toBe(200);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockUserMethods.findUnique.mockResolvedValue(mockUser);
      mockPrisma.passwordResetToken.create.mockResolvedValue({});

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(200);
    });

    it('should return same message for non-existent user', async () => {
      mockUserMethods.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const mockTokenRecord = {
        id: 'token-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: null,
      };

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(mockTokenRecord);
      mockUserMethods.update.mockResolvedValue({});
      mockPrisma.passwordResetToken.update.mockResolvedValue({});

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          resetToken: 'valid-token',
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          resetToken: 'invalid-token',
          newPassword: 'NewPassword123',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const mockTokenRecord = {
        id: 'token-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: { id: 'user-123' },
      };

      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(mockTokenRecord);
      mockUserMethods.update.mockResolvedValue({});
      mockPrisma.emailVerificationToken.delete.mockResolvedValue({});

      const response = await request(app)
        .post('/auth/verify-email')
        .send({
          token: 'valid-verification-token',
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });
});
