import { api } from '../../src/services/api';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve('mock-token')),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
  };
});

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHomeFeed', () => {
    it('fetches home feed data successfully', async () => {
      const mockResponse = { data: { feed: 'test-feed' } };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await api.getHomeFeed();

      expect(mockGet).toHaveBeenCalledWith('/home/feed');
      expect(result).toEqual(mockResponse);
    });

    it('throws error when fetch fails', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.getHomeFeed()).rejects.toThrow('Network error');
    });
  });

  describe('getScenarios', () => {
    it('fetches scenarios without params', async () => {
      const mockResponse = { data: { scenarios: [] } };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await api.getScenarios();

      expect(mockGet).toHaveBeenCalledWith('/scenarios', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('fetches scenarios with category filter', async () => {
      const mockResponse = { data: { scenarios: [{ id: '1' }] } };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await api.getScenarios({ category: 'business' });

      expect(mockGet).toHaveBeenCalledWith('/scenarios', {
        params: { category: 'business' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('fetches scenarios with difficulty filter', async () => {
      const mockResponse = { data: { scenarios: [] } };
      mockGet.mockResolvedValueOnce(mockResponse);

      await api.getScenarios({ difficulty: 'B1' });

      expect(mockGet).toHaveBeenCalledWith('/scenarios', {
        params: { difficulty: 'B1' },
      });
    });

    it('fetches scenarios with search query', async () => {
      const mockResponse = { data: { scenarios: [] } };
      mockGet.mockResolvedValueOnce(mockResponse);

      await api.getScenarios({ search: 'restaurant' });

      expect(mockGet).toHaveBeenCalledWith('/scenarios', {
        params: { search: 'restaurant' },
      });
    });

    it('combines multiple query params', async () => {
      const mockResponse = { data: { scenarios: [] } };
      mockGet.mockResolvedValueOnce(mockResponse);

      await api.getScenarios({
        category: 'travel',
        difficulty: 'A2',
        search: 'airport',
        page: 1,
        limit: 10,
      });

      expect(mockGet).toHaveBeenCalledWith('/scenarios', {
        params: {
          category: 'travel',
          difficulty: 'A2',
          search: 'airport',
          page: 1,
          limit: 10,
        },
      });
    });
  });

  describe('getScenario', () => {
    it('fetches single scenario by id', async () => {
      const mockScenario = { id: 'scenario-1', title: 'Test' };
      const mockResponse = { data: mockScenario };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await api.getScenario('scenario-1');

      expect(mockGet).toHaveBeenCalledWith('/scenarios/scenario-1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('startSession', () => {
    it('starts a learning session', async () => {
      const mockResponse = { data: { sessionId: 'session-1' } };
      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await api.startSession('scenario-1');

      expect(mockPost).toHaveBeenCalledWith('/sessions', { scenarioId: 'scenario-1' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('completeSession', () => {
    it('completes a session', async () => {
      const mockResponse = { data: { success: true } };
      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await api.completeSession('session-1');

      expect(mockPost).toHaveBeenCalledWith('/sessions/session-1/complete');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getProgress', () => {
    it('fetches user progress', async () => {
      const mockResponse = { data: { progress: 50 } };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await api.getProgress();

      expect(mockGet).toHaveBeenCalledWith('/progress', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('fetches progress with filters', async () => {
      const mockResponse = { data: { progress: 30 } };
      mockGet.mockResolvedValueOnce(mockResponse);

      await api.getProgress({ category: 'business', difficulty: 'B1' });

      expect(mockGet).toHaveBeenCalledWith('/progress', {
        params: { category: 'business', difficulty: 'B1' },
      });
    });
  });

  describe('getUserProfile', () => {
    it('fetches user profile', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const mockResponse = { data: mockUser };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await api.getUserProfile();

      expect(mockGet).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateUserProfile', () => {
    it('updates user profile', async () => {
      const updateData = { displayName: 'John Doe' };
      const mockResponse = { data: { ...updateData, id: '1' } };
      mockPut.mockResolvedValueOnce(mockResponse);

      const result = await api.updateUserProfile(updateData);

      expect(mockPut).toHaveBeenCalledWith('/users/me', updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getVideos', () => {
    it('fetches videos without params', async () => {
      const mockResponse = { data: { videos: [] } };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await api.getVideos();

      expect(mockGet).toHaveBeenCalledWith('/videos', { params: undefined });
      expect(result).toEqual(mockResponse);
    });

    it('fetches videos with difficulty filter', async () => {
      const mockResponse = { data: { videos: [{ id: '1' }] } };
      mockGet.mockResolvedValueOnce(mockResponse);

      await api.getVideos({ difficulty: 'B1', page: 1, limit: 5 });

      expect(mockGet).toHaveBeenCalledWith('/videos', {
        params: { difficulty: 'B1', page: 1, limit: 5 },
      });
    });
  });

  describe('getFriends', () => {
    it('fetches friends list', async () => {
      const mockResponse = { data: { friends: [] } };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await api.getFriends();

      expect(mockGet).toHaveBeenCalledWith('/social/friends');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('sendFriendRequest', () => {
    it('sends friend request', async () => {
      const mockResponse = { data: { success: true } };
      mockPost.mockResolvedValueOnce(mockResponse);

      const result = await api.sendFriendRequest('user-123');

      expect(mockPost).toHaveBeenCalledWith('/social/friends/request/user-123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getLeaderboard', () => {
    it('fetches leaderboard with default limit', async () => {
      const mockResponse = { data: { users: [] } };
      mockGet.mockResolvedValueOnce(mockResponse);

      const result = await api.getLeaderboard();

      expect(mockGet).toHaveBeenCalledWith('/social/leaderboard', {
        params: { limit: undefined },
      });
      expect(result).toEqual(mockResponse);
    });

    it('fetches leaderboard with custom limit', async () => {
      const mockResponse = { data: { users: [] } };
      mockGet.mockResolvedValueOnce(mockResponse);

      await api.getLeaderboard(10);

      expect(mockGet).toHaveBeenCalledWith('/social/leaderboard', {
        params: { limit: 10 },
      });
    });
  });
});
