import AsyncStorage from '@react-native-async-storage/async-storage';

const mockStartSession = jest.fn().mockResolvedValue({ data: {} });
jest.mock('../../src/services/api', () => ({
  api: {
    startSession: mockStartSession,
  },
}));

import { offlineService, OfflineScenario, OfflineProgress } from '../../src/services/offlineService';

describe('OfflineService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockStartSession.mockResolvedValue({ data: {} });
    await AsyncStorage.clear();
  });

  describe('saveScenario', () => {
    it('saves scenario to offline storage', async () => {
      const scenario: OfflineScenario = {
        id: 'scenario-1',
        title: 'At the Restaurant',
        description: 'Learn to order food',
        category: 'daily_conversation',
        difficulty: 'A2',
        dialogues: [],
        vocabulary: [],
      };

      await offlineService.saveScenario(scenario);

      const stored = await AsyncStorage.getItem('@offline:scenario:scenario-1');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(scenario);
    });

    it('adds scenario to content list', async () => {
      const scenario: OfflineScenario = {
        id: 'scenario-1',
        title: 'Test',
        description: 'Test',
        category: 'test',
        difficulty: 'A1',
        dialogues: [],
        vocabulary: [],
      };

      await offlineService.saveScenario(scenario);

      const list = await AsyncStorage.getItem('@offline:content_list:scenario');
      expect(JSON.parse(list!)).toContain('scenario-1');
    });

    it('throws error when save fails', async () => {
      const scenario: OfflineScenario = {
        id: 'scenario-1',
        title: 'Test',
        description: 'Test',
        category: 'test',
        difficulty: 'A1',
        dialogues: [],
        vocabulary: [],
      };

      const originalSetItem = AsyncStorage.setItem;
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage full')
      );

      await expect(offlineService.saveScenario(scenario)).rejects.toThrow(
        'Storage full'
      );
    });
  });

  describe('getOfflineScenario', () => {
    it('retrieves saved scenario', async () => {
      const scenario: OfflineScenario = {
        id: 'scenario-1',
        title: 'At the Restaurant',
        description: 'Learn to order food',
        category: 'daily_conversation',
        difficulty: 'A2',
        dialogues: [{ id: 'd1', text: 'Hello' }],
        vocabulary: [{ id: 'v1', word: 'Menu' }],
      };

      await AsyncStorage.setItem(
        '@offline:scenario:scenario-1',
        JSON.stringify(scenario)
      );

      const result = await offlineService.getOfflineScenario('scenario-1');

      expect(result).toEqual(scenario);
    });

    it('returns null for non-existent scenario', async () => {
      const result = await offlineService.getOfflineScenario('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAllOfflineScenarios', () => {
    it('returns all saved scenarios', async () => {
      const scenario1: OfflineScenario = {
        id: 'scenario-1',
        title: 'Scenario 1',
        description: 'Test 1',
        category: 'test',
        difficulty: 'A1',
        dialogues: [],
        vocabulary: [],
      };
      const scenario2: OfflineScenario = {
        id: 'scenario-2',
        title: 'Scenario 2',
        description: 'Test 2',
        category: 'test',
        difficulty: 'A2',
        dialogues: [],
        vocabulary: [],
      };

      await AsyncStorage.setItem(
        '@offline:scenario:scenario-1',
        JSON.stringify(scenario1)
      );
      await AsyncStorage.setItem(
        '@offline:scenario:scenario-2',
        JSON.stringify(scenario2)
      );

      const results = await offlineService.getAllOfflineScenarios();

      expect(results).toHaveLength(2);
      expect(results).toContainEqual(scenario1);
      expect(results).toContainEqual(scenario2);
    });

    it('returns empty array when no scenarios saved', async () => {
      const results = await offlineService.getAllOfflineScenarios();

      expect(results).toEqual([]);
    });
  });

  describe('deleteOfflineScenario', () => {
    it('removes scenario from storage', async () => {
      const scenario: OfflineScenario = {
        id: 'scenario-1',
        title: 'Test',
        description: 'Test',
        category: 'test',
        difficulty: 'A1',
        dialogues: [],
        vocabulary: [],
      };

      await AsyncStorage.setItem(
        '@offline:scenario:scenario-1',
        JSON.stringify(scenario)
      );
      await AsyncStorage.setItem(
        '@offline:content_list:scenario',
        JSON.stringify(['scenario-1'])
      );

      await offlineService.deleteOfflineScenario('scenario-1');

      const stored = await AsyncStorage.getItem('@offline:scenario:scenario-1');
      expect(stored).toBeNull();
    });

    it('removes from content list', async () => {
      const scenario: OfflineScenario = {
        id: 'scenario-1',
        title: 'Test',
        description: 'Test',
        category: 'test',
        difficulty: 'A1',
        dialogues: [],
        vocabulary: [],
      };

      await offlineService.saveScenario(scenario);
      await offlineService.deleteOfflineScenario('scenario-1');

      const list = await AsyncStorage.getItem('@offline:content_list:scenario');
      expect(JSON.parse(list!)).not.toContain('scenario-1');
    });
  });

  describe('saveProgress', () => {
    it('saves progress to storage', async () => {
      const progress: OfflineProgress = {
        scenarioId: 'scenario-1',
        completedDialogues: 5,
        totalDialogues: 10,
        lastPracticedAt: '2024-01-01T00:00:00Z',
      };

      await offlineService.saveProgress(progress);

      const stored = await AsyncStorage.getItem('@offline:progress:scenario-1');
      expect(JSON.parse(stored!)).toEqual(progress);
    });
  });

  describe('getOfflineProgress', () => {
    it('retrieves saved progress', async () => {
      const progress: OfflineProgress = {
        scenarioId: 'scenario-1',
        completedDialogues: 5,
        totalDialogues: 10,
        lastPracticedAt: '2024-01-01T00:00:00Z',
      };

      await AsyncStorage.setItem(
        '@offline:progress:scenario-1',
        JSON.stringify(progress)
      );

      const result = await offlineService.getOfflineProgress('scenario-1');

      expect(result).toEqual(progress);
    });

    it('returns null for non-existent progress', async () => {
      const result = await offlineService.getOfflineProgress('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('syncOfflineProgress', () => {
    it('syncs all offline progress to server', async () => {
      const progress1: OfflineProgress = {
        scenarioId: 'scenario-1',
        completedDialogues: 5,
        totalDialogues: 10,
        lastPracticedAt: '2024-01-01T00:00:00Z',
      };
      const progress2: OfflineProgress = {
        scenarioId: 'scenario-2',
        completedDialogues: 8,
        totalDialogues: 12,
        lastPracticedAt: '2024-01-01T00:00:00Z',
      };

      await AsyncStorage.setItem(
        '@offline:progress:scenario-1',
        JSON.stringify(progress1)
      );
      await AsyncStorage.setItem(
        '@offline:progress:scenario-2',
        JSON.stringify(progress2)
      );

      mockStartSession.mockResolvedValue({ data: {} });

      await offlineService.syncOfflineProgress();

      expect(mockStartSession).toHaveBeenCalledTimes(2);
    });

    it('clears progress after sync', async () => {
      const progress: OfflineProgress = {
        scenarioId: 'scenario-1',
        completedDialogues: 5,
        totalDialogues: 10,
        lastPracticedAt: '2024-01-01T00:00:00Z',
      };

      await AsyncStorage.setItem(
        '@offline:progress:scenario-1',
        JSON.stringify(progress)
      );

      mockStartSession.mockResolvedValue({ data: {} });

      await offlineService.syncOfflineProgress();

      const stored = await AsyncStorage.getItem('@offline:progress:scenario-1');
      expect(stored).toBeNull();
    });
  });

  describe('getStorageUsage', () => {
    it('calculates storage usage correctly', async () => {
      const scenario: OfflineScenario = {
        id: 'scenario-1',
        title: 'Test Scenario',
        description: 'Test Description',
        category: 'test',
        difficulty: 'A1',
        dialogues: [],
        vocabulary: [],
      };

      await offlineService.saveScenario(scenario);

      const usage = await offlineService.getStorageUsage();

      expect(usage.count).toBeGreaterThan(0);
    });

    it('returns zero for empty storage', async () => {
      const usage = await offlineService.getStorageUsage();

      expect(usage.count).toBe(0);
      expect(usage.sizeKB).toBe(0);
    });
  });

  describe('clearAllOfflineData', () => {
    it('clears all offline data', async () => {
      const scenario: OfflineScenario = {
        id: 'scenario-1',
        title: 'Test',
        description: 'Test',
        category: 'test',
        difficulty: 'A1',
        dialogues: [],
        vocabulary: [],
      };

      const progress: OfflineProgress = {
        scenarioId: 'scenario-1',
        completedDialogues: 5,
        totalDialogues: 10,
        lastPracticedAt: '2024-01-01T00:00:00Z',
      };

      await offlineService.saveScenario(scenario);
      await offlineService.saveProgress(progress);

      await offlineService.clearAllOfflineData();

      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter((k) => k.startsWith('@offline:'));
      expect(offlineKeys).toHaveLength(0);
    });
  });
});
