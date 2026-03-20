import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

interface VocabularyWord {
  id: string;
  word: string;
  phonetic: string;
  definition: string;
  example: string;
  audioUrl: string;
  category: string;
}

interface ARScanHistory {
  id: string;
  objectName: string;
  vocabularyId: string;
  scannedAt: string;
}

interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const CATEGORIES = ['All', 'Food', 'Animals', 'Objects', 'Places', 'Actions'];

const { width: screenWidth } = Dimensions.get('window');

export function ARScannerScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [detectedObject, setDetectedObject] = useState<DetectedObject | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const queryClient = useQueryClient();

  const {
    data: vocabularyData,
    isLoading: vocabularyLoading,
  } = useQuery({
    queryKey: ['ar-vocabulary', detectedObject?.label, selectedCategory],
    queryFn: () => api.getARVocabulary(detectedObject?.label || '', selectedCategory),
    enabled: !!detectedObject?.label,
  });

  const {
    data: historyData,
    isLoading: historyLoading,
  } = useQuery({
    queryKey: ['ar-history', selectedCategory],
    queryFn: () => api.getARHistory(selectedCategory === 'All' ? undefined : selectedCategory),
  });

  const saveScanMutation = useMutation({
    mutationFn: (vocabularyId: string) => api.saveARScan(vocabularyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ar-history'] });
    },
  });

  const vocabulary: VocabularyWord | null = vocabularyData?.data?.data?.vocabulary || null;
  const scanHistory: ARScanHistory[] = historyData?.data?.data?.scans || [];

  const handlePlayAudio = useCallback(async (audioUrl: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          newSound.unloadAsync();
        }
      });
    } catch (error) {
      Alert.alert('Audio Error', 'Failed to play pronunciation audio');
    }
  }, [sound]);

  const handleObjectDetected = useCallback((object: DetectedObject) => {
    setDetectedObject(object);
    setIsScanning(false);
  }, []);

  const handleSaveToHistory = useCallback(() => {
    if (vocabulary) {
      saveScanMutation.mutate(vocabulary.id);
    }
  }, [vocabulary, saveScanMutation]);

  const handleCategoryFilter = useCallback((category: string) => {
    setSelectedCategory(category);
    setDetectedObject(null);
  }, []);

  const handleHistoryItemPress = useCallback((item: ARScanHistory) => {
    queryClient.invalidateQueries({ queryKey: ['ar-vocabulary', item.objectName] });
  }, [queryClient]);

  const renderCategoryFilter = () => (
    <View style={styles.categoryContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive,
            ]}
            onPress={() => handleCategoryFilter(category)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === category && styles.categoryButtonTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCameraView = () => {
    if (!permission?.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan objects and identify vocabulary
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          {isScanning && (
            <View style={styles.scanningOverlay}>
              <View style={styles.scanningFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.scanningText}>Scanning...</Text>
            </View>
          )}

          {detectedObject && (
            <View style={styles.detectionOverlay}>
              <View style={styles.detectionLabel}>
                <Text style={styles.detectionLabelText}>
                  {detectedObject.label} ({Math.round(detectedObject.confidence * 100)}%)
                </Text>
              </View>
            </View>
          )}
        </CameraView>

        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={[styles.scanButton, isScanning && styles.scanButtonActive]}
            onPress={() => {
              setIsScanning(true);
              setDetectedObject(null);
              setTimeout(() => {
                const mockDetectedObject: DetectedObject = {
                  label: 'apple',
                  confidence: 0.92,
                  boundingBox: { x: 100, y: 100, width: 200, height: 200 },
                };
                handleObjectDetected(mockDetectedObject);
              }, 2000);
            }}
            disabled={isScanning}
          >
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Scanning...' : 'Scan Object'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderVocabularyCard = () => {
    if (vocabularyLoading) {
      return (
        <View style={styles.vocabularyLoading}>
          <ActivityIndicator size="small" color="#4A90D9" />
          <Text style={styles.vocabularyLoadingText}>Loading vocabulary...</Text>
        </View>
      );
    }

    if (!vocabulary) {
      return (
        <View style={styles.vocabularyPlaceholder}>
          <Text style={styles.vocabularyPlaceholderIcon}>📚</Text>
          <Text style={styles.vocabularyPlaceholderText}>
            Point camera at an object to learn vocabulary
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.vocabularyCard}>
        <View style={styles.vocabularyHeader}>
          <View style={styles.vocabularyMain}>
            <Text style={styles.vocabularyWord}>{vocabulary.word}</Text>
            <Text style={styles.vocabularyPhonetic}>{vocabulary.phonetic}</Text>
          </View>
          <TouchableOpacity
            style={styles.audioButton}
            onPress={() => handlePlayAudio(vocabulary.audioUrl)}
          >
            <Text style={styles.audioButtonText}>🔊</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.vocabularyDefinition}>
          <Text style={styles.definitionLabel}>Definition</Text>
          <Text style={styles.definitionText}>{vocabulary.definition}</Text>
        </View>

        <View style={styles.vocabularyExample}>
          <Text style={styles.exampleLabel}>Example</Text>
          <Text style={styles.exampleText}>{vocabulary.example}</Text>
        </View>

        <View style={styles.vocabularyCategory}>
          <Text style={styles.categoryLabel}>Category:</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{vocabulary.category}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveToHistory}>
          <Text style={styles.saveButtonText}>
            {saveScanMutation.isPending ? 'Saving...' : 'Save to History'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHistoryList = () => {
    if (historyLoading) {
      return (
        <View style={styles.historyLoading}>
          <ActivityIndicator size="small" color="#4A90D9" />
        </View>
      );
    }

    if (scanHistory.length === 0) {
      return (
        <View style={styles.historyEmpty}>
          <Text style={styles.historyEmptyIcon}>📋</Text>
          <Text style={styles.historyEmptyText}>No scan history yet</Text>
        </View>
      );
    }

    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return (
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Scan History</Text>
        <FlatList
          data={scanHistory}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.historyItem}
              onPress={() => handleHistoryItemPress(item)}
            >
              <View style={styles.historyItemIcon}>
                <Text>📷</Text>
              </View>
              <View style={styles.historyItemContent}>
                <Text style={styles.historyItemName}>{item.objectName}</Text>
                <Text style={styles.historyItemDate}>{formatDate(item.scannedAt)}</Text>
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AR Scanner</Text>
        <Text style={styles.subtitle}>Learn vocabulary from real-world objects</Text>
      </View>

      {renderCategoryFilter()}

      {renderCameraView()}

      <View style={styles.content}>
        <View style={styles.vocabularySection}>
          <Text style={styles.sectionTitle}>Vocabulary</Text>
          {renderVocabularyCard()}
        </View>

        {renderHistoryList()}
      </View>
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
  categoryContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#4A90D9',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  cameraContainer: {
    height: 280,
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanningFrame: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4A90D9',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanningText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  detectionOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  detectionLabel: {
    backgroundColor: 'rgba(74, 144, 217, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detectionLabelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  scanButtonActive: {
    backgroundColor: '#357ABD',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 32,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  vocabularySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  vocabularyLoading: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  vocabularyLoadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  vocabularyPlaceholder: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  vocabularyPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  vocabularyPlaceholderText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  vocabularyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  vocabularyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vocabularyMain: {
    flex: 1,
  },
  vocabularyWord: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  vocabularyPhonetic: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  audioButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioButtonText: {
    fontSize: 20,
  },
  vocabularyDefinition: {
    marginBottom: 12,
  },
  definitionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  definitionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  vocabularyExample: {
    marginBottom: 12,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  exampleText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  vocabularyCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#4A90D9',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyContainer: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  historyLoading: {
    padding: 16,
    alignItems: 'center',
  },
  historyEmpty: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  historyEmptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  historyEmptyText: {
    fontSize: 14,
    color: '#999',
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  historyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyItemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});
