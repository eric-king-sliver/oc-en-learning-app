import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  captions: Caption[];
  difficulty: string;
  durationSeconds: number;
}

interface Caption {
  startTime: number;
  endTime: number;
  text: string;
}

interface VideoProgress {
  videoId: string;
  watchedSeconds: number;
  totalSeconds: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  A1: '#4CAF50',
  A2: '#8BC34A',
  B1: '#FFC107',
  B2: '#FF9800',
  C1: '#F44336',
  C2: '#9C27B0',
};

const { width: screenWidth } = Dimensions.get('window');

export function VideoScreen({ navigation }: any) {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCaptionIndex, setCurrentCaptionIndex] = useState<number>(-1);
  const [videoProgress, setVideoProgress] = useState<VideoProgress | null>(null);
  const videoRef = useRef<Video>(null);

  const {
    data: videosData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['videos'],
    queryFn: () => api.getVideos(),
  });

  const videos: VideoItem[] = videosData?.data?.data?.videos || [];

  const handleVideoSelect = async (video: VideoItem) => {
    setSelectedVideo(video);
    setIsPlaying(true);
    setCurrentCaptionIndex(-1);
    setVideoProgress({
      videoId: video.id,
      watchedSeconds: 0,
      totalSeconds: video.durationSeconds,
    });
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      return;
    }

    setIsPlaying(status.isPlaying);

    const currentPosition = status.positionMillis / 1000;
    const video = selectedVideo;

    if (video) {
      setVideoProgress({
        videoId: video.id,
        watchedSeconds: Math.floor(currentPosition),
        totalSeconds: video.durationSeconds,
      });

      if (video.captions && video.captions.length > 0) {
        const captionIndex = video.captions.findIndex(
          (caption: Caption) =>
            currentPosition >= caption.startTime && currentPosition <= caption.endTime
        );
        setCurrentCaptionIndex(captionIndex);
      }
    }
  };

  const handleClosePlayer = () => {
    setSelectedVideo(null);
    setIsPlaying(false);
    setCurrentCaptionIndex(-1);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string): string => {
    return DIFFICULTY_COLORS[difficulty] || '#999';
  };

  const renderVideoItem = ({ item }: { item: VideoItem }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => handleVideoSelect(item)}
    >
      <Image
        source={{ uri: item.thumbnailUrl }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.videoInfo}>
        <View style={styles.videoHeader}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View
            style={[
              styles.difficultyBadge,
              { backgroundColor: getDifficultyColor(item.difficulty) },
            ]}
          >
            <Text style={styles.difficultyBadgeText}>{item.difficulty}</Text>
          </View>
        </View>
        <Text style={styles.videoDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.videoMeta}>
          <Text style={styles.metaText}>
            ⏱️ {formatDuration(item.durationSeconds)}
          </Text>
          {item.captions && item.captions.length > 0 && (
            <Text style={styles.metaText}>📝 CC</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderLoadingState = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#4A90D9" />
      <Text style={styles.loadingText}>Loading videos...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>Failed to load videos</Text>
      <Text style={styles.errorSubtext}>Please check your connection and try again</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.emptyIcon}>🎬</Text>
      <Text style={styles.emptyText}>No videos available</Text>
      <Text style={styles.emptySubtext}>Check back later for new content</Text>
    </View>
  );

  if (selectedVideo) {
    const progressPercent = videoProgress
      ? (videoProgress.watchedSeconds / videoProgress.totalSeconds) * 100
      : 0;

    return (
      <View style={styles.playerContainer}>
        <View style={styles.playerHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleClosePlayer}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.videoWrapper}>
          <Video
            ref={videoRef}
            source={{ uri: selectedVideo.videoUrl }}
            style={styles.videoPlayer}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            useNativeControls
          />
        </View>

        <View style={styles.videoDetails}>
          <Text style={styles.playerTitle}>{selectedVideo.title}</Text>
          <View style={styles.progressInfo}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {videoProgress
                ? `${formatDuration(videoProgress.watchedSeconds)} / ${formatDuration(videoProgress.totalSeconds)}`
                : '0:00 / 0:00'}
            </Text>
          </View>
        </View>

        {selectedVideo.captions && selectedVideo.captions.length > 0 && (
          <View style={styles.captionContainer}>
            <Text style={styles.captionLabel}>Captions</Text>
            <ScrollView style={styles.captionScroll}>
              {currentCaptionIndex >= 0 ? (
                <Text style={styles.captionText}>
                  {selectedVideo.captions[currentCaptionIndex]?.text}
                </Text>
              ) : (
                <Text style={styles.captionPlaceholder}>
                  Captions will appear here...
                </Text>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Video Lessons</Text>
        <Text style={styles.subtitle}>Learn English with videos</Text>
      </View>

      {isLoading ? (
        renderLoadingState()
      ) : isError ? (
        renderErrorState()
      ) : videos.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={renderVideoItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          showsVerticalScrollIndicator={false}
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
  listContent: {
    padding: 16,
  },
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: '#e0e0e0',
  },
  videoInfo: {
    padding: 16,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  videoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  videoMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaText: {
    fontSize: 14,
    color: '#999',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerHeader: {
    backgroundColor: '#4A90D9',
    padding: 16,
    paddingTop: 48,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  videoWrapper: {
    width: screenWidth,
    height: screenWidth * (9 / 16),
    backgroundColor: '#000',
  },
  videoPlayer: {
    flex: 1,
  },
  videoDetails: {
    backgroundColor: '#fff',
    padding: 16,
  },
  playerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  progressInfo: {
    gap: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4A90D9',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  captionContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 1,
    padding: 16,
  },
  captionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  captionScroll: {
    flex: 1,
  },
  captionText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 28,
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  captionPlaceholder: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
