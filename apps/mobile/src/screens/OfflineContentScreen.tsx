import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { offlineService, OfflineScenario } from '../services/offlineService';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  difficulty: string;
  category: string;
}

interface DownloadProgress {
  [key: string]: number;
}

type ContentType = 'scenarios' | 'videos';

export function OfflineContentScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ContentType>('scenarios');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({});
  const [offlineIds, setOfflineIds] = useState<{ scenarios: string[]; videos: string[] }>({
    scenarios: [],
    videos: [],
  });

  const { data: scenariosData, isLoading: isLoadingScenarios, refetch: refetchScenarios } = useQuery({
    queryKey: ['scenarios'],
    queryFn: () => api.getScenarios({ limit: 50 }),
  });

  const { data: videosData, isLoading: isLoadingVideos, refetch: refetchVideos } = useQuery({
    queryKey: ['videos'],
    queryFn: () => api.getVideos({ limit: 50 }),
  });

  const { data: storageUsage, isLoading: isLoadingStorage, refetch: refetchStorage } = useQuery({
    queryKey: ['storageUsage'],
    queryFn: () => offlineService.getStorageUsage(),
  });

  const { data: offlineScenarios } = useQuery({
    queryKey: ['offlineScenarios'],
    queryFn: () => offlineService.getAllOfflineScenarios(),
  });

  const scenarios = scenariosData?.data?.data?.scenarios || [];
  const videos: Video[] = videosData?.data?.data?.videos || [];

  useEffect(() => {
    if (offlineScenarios) {
      setOfflineIds((prev) => ({
        ...prev,
        scenarios: offlineScenarios.map((s: OfflineScenario) => s.id),
      }));
    }
  }, [offlineScenarios]);

  const simulateDownload = useCallback((id: string, type: ContentType) => {
    setDownloadProgress((prev) => ({ ...prev, [id]: 0 }));
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setDownloadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[id];
          return newProgress;
        });
        setOfflineIds((prev) => ({
          ...prev,
          [type]: [...prev[type], id],
        }));
      } else {
        setDownloadProgress((prev) => ({ ...prev, [id]: progress }));
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const downloadScenarioMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      const scenarioData = await api.getScenario(scenarioId);
      const scenario = scenarioData?.data?.data;
      if (scenario) {
        await offlineService.saveScenario({
          id: scenario.id,
          title: scenario.title,
          description: scenario.description,
          category: scenario.category,
          difficulty: scenario.difficulty,
          dialogues: scenario.dialogues || [],
          vocabulary: scenario.vocabulary || [],
        });
      }
    },
    onSuccess: (_, scenarioId) => {
      simulateDownload(scenarioId, 'scenarios');
      queryClient.invalidateQueries({ queryKey: ['offlineScenarios'] });
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
    },
    onError: (error: Error) => {
      Alert.alert('Download Failed', error.message || 'Failed to download scenario');
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: (scenarioId: string) => offlineService.deleteOfflineScenario(scenarioId),
    onSuccess: (_, scenarioId) => {
      setOfflineIds((prev) => ({
        ...prev,
        scenarios: prev.scenarios.filter((id) => id !== scenarioId),
      }));
      queryClient.invalidateQueries({ queryKey: ['offlineScenarios'] });
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
    },
    onError: (error: Error) => {
      Alert.alert('Delete Failed', error.message || 'Failed to delete offline scenario');
    },
  });

  const downloadVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const videoData = await api.getVideo(videoId);
      const video = videoData?.data?.data;
      if (video) {
        setTimeout(() => {}, 1000);
      }
    },
    onSuccess: (_, videoId) => {
      simulateDownload(videoId, 'videos');
      setOfflineIds((prev) => ({
        ...prev,
        videos: [...prev.videos, videoId],
      }));
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
    },
    onError: (error: Error) => {
      Alert.alert('Download Failed', error.message || 'Failed to download video');
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (_videoId: string) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    onSuccess: (_data, videoId) => {
      setOfflineIds((prev) => ({
        ...prev,
        videos: prev.videos.filter((id) => id !== videoId),
      }));
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
    },
    onError: (error: Error) => {
      Alert.alert('Delete Failed', error.message || 'Failed to delete offline video');
    },
  });

  const handleDownload = useCallback(
    (id: string, type: ContentType) => {
      if (type === 'scenarios') {
        downloadScenarioMutation.mutate(id);
      } else {
        downloadVideoMutation.mutate(id);
      }
    },
    [downloadScenarioMutation, downloadVideoMutation]
  );

  const handleDelete = useCallback(
    (id: string, type: ContentType) => {
      const itemType = type === 'scenarios' ? 'scenario' : 'video';
      Alert.alert(
        'Delete Offline Content',
        `Are you sure you want to delete this offline ${itemType}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              if (type === 'scenarios') {
                deleteScenarioMutation.mutate(id);
              } else {
                deleteVideoMutation.mutate(id);
              }
            },
          },
        ]
      );
    },
    [deleteScenarioMutation, deleteVideoMutation]
  );

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All Offline Content',
      'Are you sure you want to delete all offline content? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await offlineService.clearAllOfflineData();
              setOfflineIds({ scenarios: [], videos: [] });
              queryClient.invalidateQueries({ queryKey: ['offlineScenarios'] });
              queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
            } catch (error) {
              Alert.alert('Error', 'Failed to clear offline content');
            }
          },
        },
      ]
    );
  }, [queryClient]);

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      A1: '#4CAF50',
      A2: '#8BC34A',
      B1: '#FFC107',
      B2: '#FF9800',
      C1: '#F44336',
      C2: '#9C27B0',
    };
    return colors[difficulty] || '#999';
  };

  const renderScenarioItem = ({ item }: { item: typeof scenarios[0] }) => {
    const isDownloaded = offlineIds.scenarios.includes(item.id);
    const progress = downloadProgress[item.id];
    const isDownloading = progress !== undefined;

    return (
      <View style={styles.contentCard}>
        <View style={styles.contentInfo}>
          <Text style={styles.contentTitle}>{item.title}</Text>
          <Text style={styles.contentDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.contentMeta}>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
              <Text style={styles.difficultyText}>{item.difficulty}</Text>
            </View>
            <Text style={styles.metaText}>{item.category}</Text>
          </View>
        </View>
        <View style={styles.contentActions}>
          {isDownloading ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#4A90D9" />
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          ) : isDownloaded ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item.id, 'scenarios')}
            >
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.downloadButton]}
              onPress={() => handleDownload(item.id, 'scenarios')}
            >
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderVideoItem = ({ item }: { item: Video }) => {
    const isDownloaded = offlineIds.videos.includes(item.id);
    const progress = downloadProgress[item.id];
    const isDownloading = progress !== undefined;

    return (
      <View style={styles.contentCard}>
        <View style={styles.contentInfo}>
          <Text style={styles.contentTitle}>{item.title}</Text>
          <Text style={styles.contentDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.contentMeta}>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
              <Text style={styles.difficultyText}>{item.difficulty}</Text>
            </View>
            <Text style={styles.metaText}>{item.category}</Text>
            <Text style={styles.metaText}>{Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}</Text>
          </View>
        </View>
        <View style={styles.contentActions}>
          {isDownloading ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#4A90D9" />
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          ) : isDownloaded ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item.id, 'videos')}
            >
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.downloadButton]}
              onPress={() => handleDownload(item.id, 'videos')}
            >
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const formatStorageSize = (kb: number) => {
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(1)} MB`;
    }
    return `${kb} KB`;
  };

  const totalOfflineItems = offlineIds.scenarios.length + offlineIds.videos.length;
  const isLoading = isLoadingScenarios || isLoadingVideos;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Offline Content</Text>
        <Text style={styles.subtitle}>Download scenarios and videos for offline learning</Text>
      </View>

      <View style={styles.storageCard}>
        <View style={styles.storageInfo}>
          <Text style={styles.storageLabel}>Storage Used</Text>
          <Text style={styles.storageValue}>
            {isLoadingStorage ? '...' : formatStorageSize(storageUsage?.sizeKB || 0)}
          </Text>
        </View>
        <View style={styles.storageInfo}>
          <Text style={styles.storageLabel}>Offline Items</Text>
          <Text style={styles.storageValue}>{totalOfflineItems}</Text>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'scenarios' && styles.tabActive]}
          onPress={() => setActiveTab('scenarios')}
        >
          <Text style={[styles.tabText, activeTab === 'scenarios' && styles.tabTextActive]}>
            Scenarios ({offlineIds.scenarios.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
          onPress={() => setActiveTab('videos')}
        >
          <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>
            Videos ({offlineIds.videos.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'scenarios' ? scenarios : videos}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'scenarios' ? renderScenarioItem : renderVideoItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                refetchScenarios();
                refetchVideos();
                refetchStorage();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No {activeTab} available for download
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4A90D9',
    padding: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  storageCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storageInfo: {
    flex: 1,
    alignItems: 'center',
  },
  storageLabel: {
    fontSize: 12,
    color: '#666',
  },
  storageValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  clearButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#4A90D9',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  contentActions: {
    justifyContent: 'center',
    marginLeft: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#4A90D9',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: '#4A90D9',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
