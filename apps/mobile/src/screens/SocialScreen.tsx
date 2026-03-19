import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

interface User {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  currentProficiency?: string;
}

interface Friend extends User {
  addedAt: string;
  streak?: number;
}

interface FriendRequest extends User {
  requestedAt: string;
}

interface LeaderboardEntry {
  rank: number;
  user: User;
  streak: number;
  score: number;
  scenariosCompleted: number;
}

interface SharedProgressItem {
  id: string;
  user: User;
  scenario: {
    id: string;
    title: string;
    difficulty: string;
  };
  progressPercent: number;
  score?: number;
  note?: string;
  sharedAt: string;
}

type TabType = 'friends' | 'leaderboard' | 'progress';

export function SocialScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const queryClient = useQueryClient();

  const { data: friendsData, isLoading: friendsLoading, refetch: refetchFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.getFriends(),
  });

  const { data: requestsData, isLoading: requestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: () => api.getFriendRequests(),
  });

  const { data: leaderboardData, isLoading: leaderboardLoading, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.getLeaderboard(20),
  });

  const { data: sharedProgressData, isLoading: progressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['sharedProgress'],
    queryFn: () => {
      return Promise.all([
        api.getSharedProgress('all'),
      ]).then(([data]) => data);
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (userId: string) => api.acceptFriendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to accept friend request');
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: (userId: string) => api.declineFriendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to decline friend request');
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (userId: string) => api.removeFriend(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to remove friend');
    },
  });

  const friends: Friend[] = friendsData?.data?.data || [];
  const friendRequests: FriendRequest[] = requestsData?.data?.data || [];
  const leaderboard: LeaderboardEntry[] = leaderboardData?.data?.data || [];
  const sharedProgress: SharedProgressItem[] = sharedProgressData?.data?.data || [];

  const handleAcceptRequest = (userId: string) => {
    acceptRequestMutation.mutate(userId);
  };

  const handleDeclineRequest = (userId: string) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this friend request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => declineRequestMutation.mutate(userId),
        },
      ]
    );
  };

  const handleRemoveFriend = (userId: string, displayName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${displayName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFriendMutation.mutate(userId),
        },
      ]
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
        onPress={() => setActiveTab('friends')}
      >
        <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
          Friends
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
        onPress={() => setActiveTab('leaderboard')}
      >
        <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>
          Leaderboard
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'progress' && styles.activeTab]}
        onPress={() => setActiveTab('progress')}
      >
        <Text style={[styles.tabText, activeTab === 'progress' && styles.activeTabText]}>
          Progress
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFriendsTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={friendsLoading || requestsLoading}
          onRefresh={() => {
            refetchFriends();
            refetchRequests();
          }}
        />
      }
    >
      {friendRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friend Requests ({friendRequests.length})</Text>
          {friendRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {request.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{request.displayName}</Text>
                <Text style={styles.requestMeta}>{request.email}</Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleAcceptRequest(request.id)}
                  disabled={acceptRequestMutation.isPending}
                >
                  {acceptRequestMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>✓</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={() => handleDeclineRequest(request.id)}
                  disabled={declineRequestMutation.isPending}
                >
                  {declineRequestMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.actionButtonText}>✕</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Friends ({friends.length})</Text>
        {friends.length === 0 ? (
          <Text style={styles.emptyText}>No friends yet. Invite friends to learn together!</Text>
        ) : (
          friends.map((friend) => (
            <TouchableOpacity
              key={friend.id}
              style={styles.friendCard}
              onLongPress={() => handleRemoveFriend(friend.id, friend.displayName)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {friend.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{friend.displayName}</Text>
                <Text style={styles.friendMeta}>
                  {friend.currentProficiency && `Level ${friend.currentProficiency}`}
                  {friend.streak ? ` • 🔥 ${friend.streak} day streak` : ''}
                </Text>
              </View>
              <View style={styles.friendStatus}>
                <Text style={styles.friendStatusText}>Friends</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderLeaderboardTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={leaderboardLoading}
          onRefresh={refetchLeaderboard}
        />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Learners</Text>
        {leaderboardLoading ? (
          <ActivityIndicator size="large" color="#4A90D9" style={styles.loader} />
        ) : leaderboard.length === 0 ? (
          <Text style={styles.emptyText}>No leaderboard data available.</Text>
        ) : (
          leaderboard.map((entry, index) => (
            <View
              key={entry.user.id}
              style={[
                styles.leaderboardCard,
                index < 3 && styles.topThreeCard,
              ]}
            >
              <View style={styles.rankContainer}>
                {entry.rank === 1 ? (
                  <Text style={styles.rankEmoji}>🥇</Text>
                ) : entry.rank === 2 ? (
                  <Text style={styles.rankEmoji}>🥈</Text>
                ) : entry.rank === 3 ? (
                  <Text style={styles.rankEmoji}>🥉</Text>
                ) : (
                  <Text style={styles.rankNumber}>{entry.rank}</Text>
                )}
              </View>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {entry.user.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardName}>{entry.user.displayName}</Text>
                <Text style={styles.leaderboardMeta}>
                  {entry.scenariosCompleted} scenarios • Level {entry.user.currentProficiency || 'A1'}
                </Text>
              </View>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>🔥 {entry.streak}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>⭐ {entry.score}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderProgressTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={progressLoading}
          onRefresh={refetchProgress}
        />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Friends' Progress</Text>
        {progressLoading ? (
          <ActivityIndicator size="large" color="#4A90D9" style={styles.loader} />
        ) : sharedProgress.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>No shared progress yet.</Text>
            <Text style={styles.emptySubtext}>
              When your friends share their progress, it will appear here.
            </Text>
          </View>
        ) : (
          sharedProgress.map((item) => (
            <View key={item.id} style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.user.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressName}>{item.user.displayName}</Text>
                  <Text style={styles.progressMeta}>
                    {item.scenario.title} • {item.scenario.difficulty}
                  </Text>
                </View>
              </View>
              <View style={styles.progressDetails}>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${item.progressPercent}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressPercent}>{item.progressPercent}%</Text>
                </View>
                {item.score !== undefined && (
                  <Text style={styles.progressScore}>Score: {item.score}</Text>
                )}
                {item.note && <Text style={styles.progressNote}>"{item.note}"</Text>}
                <Text style={styles.progressDate}>
                  Shared {new Date(item.sharedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social</Text>
      </View>
      {renderTabs()}
      {activeTab === 'friends' && renderFriendsTab()}
      {activeTab === 'leaderboard' && renderLeaderboardTab()}
      {activeTab === 'progress' && renderProgressTab()}
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
    padding: 24,
    paddingTop: 48,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#4A90D9',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  requestInfo: {
    flex: 1,
    marginLeft: 12,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  requestMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  friendMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  friendStatus: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  friendStatusText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  leaderboardCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  topThreeCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 8,
  },
  rankEmoji: {
    fontSize: 24,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 8,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  leaderboardMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90D9',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  progressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  progressDetails: {
    marginTop: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    width: 40,
    textAlign: 'right',
  },
  progressScore: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  progressNote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 4,
  },
  progressDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  loader: {
    marginTop: 24,
  },
});
