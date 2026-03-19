import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const OFFLINE_STORAGE_PREFIX = '@offline:';

export interface OfflineScenario {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  dialogues: any[];
  vocabulary: any[];
}

export interface OfflineProgress {
  scenarioId: string;
  completedDialogues: number;
  totalDialogues: number;
  lastPracticedAt: string;
}

class OfflineService {
  async saveScenario(scenario: OfflineScenario): Promise<void> {
    try {
      const key = `${OFFLINE_STORAGE_PREFIX}scenario:${scenario.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(scenario));
      await this.updateOfflineContentList('scenario', scenario.id);
    } catch (error) {
      console.error('Failed to save scenario offline:', error);
      throw error;
    }
  }

  async getOfflineScenario(scenarioId: string): Promise<OfflineScenario | null> {
    try {
      const key = `${OFFLINE_STORAGE_PREFIX}scenario:${scenarioId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get offline scenario:', error);
      return null;
    }
  }

  async getAllOfflineScenarios(): Promise<OfflineScenario[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter((k) => k.startsWith(`${OFFLINE_STORAGE_PREFIX}scenario:`);
      const results = await AsyncStorage.multiGet(offlineKeys);
      return results.map(([, v]) => JSON.parse(v || '{}'));
    } catch (error) {
      console.error('Failed to get all offline scenarios:', error);
      return [];
    }
  }

  async deleteOfflineScenario(scenarioId: string): Promise<void> {
    try {
      const key = `${OFFLINE_STORAGE_PREFIX}scenario:${scenarioId}`;
      await AsyncStorage.removeItem(key);
      await this.removeFromOfflineContentList('scenario', scenarioId);
    } catch (error) {
      console.error('Failed to delete offline scenario:', error);
      throw error;
    }
  }

  async saveProgress(progress: OfflineProgress): Promise<void> {
    try {
      const key = `${OFFLINE_STORAGE_PREFIX}progress:${progress.scenarioId}`;
      await AsyncStorage.setItem(key, JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to save progress offline:', error);
      throw error;
    }
  }

  async getOfflineProgress(scenarioId: string): Promise<OfflineProgress | null> {
    try {
      const key = `${OFFLINE_STORAGE_PREFIX}progress:${scenarioId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get offline progress:', error);
      return null;
    }
  }

  async syncOfflineProgress(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter((k) => k.startsWith(`${OFFLINE_STORAGE_PREFIX}progress:`);
      const results = await AsyncStorage.multiGet(progressKeys);

      for (const [key, value] of results) {
        const progress: OfflineProgress = JSON.parse(value || '{}');
        try {
          await api.startSession(progress.scenarioId);
        } catch (e) {
          console.log('Progress already synced or session exists');
        }
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Failed to sync offline progress:', error);
      throw error;
    }
  }

  private async updateOfflineContentList(type: string, id: string): Promise<void> {
    const key = `${OFFLINE_STORAGE_PREFIX}content_list:${type}`;
    const list = await AsyncStorage.getItem(key);
    const items = list ? JSON.parse(list) : [];
    if (!items.includes(id)) {
      items.push(id);
      await AsyncStorage.setItem(key, JSON.stringify(items));
    }
  }

  private async removeFromOfflineContentList(type: string, id: string): Promise<void> {
    const key = `${OFFLINE_STORAGE_PREFIX}content_list:${type}`;
    const list = await AsyncStorage.getItem(key);
    const items = list ? JSON.parse(list) : [];
    const filtered = items.filter((i: string) => i !== id);
    await AsyncStorage.setItem(key, JSON.stringify(filtered));
  }

  async getStorageUsage(): Promise<{ count: number; sizeKB: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter((k) => k.startsWith(OFFLINE_STORAGE_PREFIX));
      let totalSize = 0;
      for (const k of offlineKeys) {
        const value = await AsyncStorage.getItem(k);
        totalSize += (value?.length || 0) * 2;
      }
      return {
        count: offlineKeys.length,
        sizeKB: Math.round(totalSize / 1024),
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { count: 0, sizeKB: 0 };
    }
  }

  async clearAllOfflineData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter((k) => k.startsWith(OFFLINE_STORAGE_PREFIX));
      await AsyncStorage.multiRemove(offlineKeys);
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }
}

export const offlineService = new OfflineService();
