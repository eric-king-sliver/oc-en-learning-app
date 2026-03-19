import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../stores/AuthContext';
import { api } from '../services/api';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  const { data: statsData } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => api.getUserStats(),
  });

  const { data: progressData } = useQuery({
    queryKey: ['progress'],
    queryFn: () => api.getProgress(),
  });

  const { data: streakData } = useQuery({
    queryKey: ['streak'],
    queryFn: () => api.getStreak(),
  });

  const stats = statsData?.data?.data;
  const progress = progressData?.data?.data;
  const streak = streakData?.data?.data;

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  function getDifficultyColor(difficulty: string) {
    const colors: Record<string, string> = {
      A1: '#4CAF50',
      A2: '#8BC34A',
      B1: '#FFC107',
      B2: '#FF9800',
      C1: '#F44336',
      C2: '#9C27B0',
    };
    return colors[difficulty] || '#999';
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.displayName}>{user?.displayName || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View
          style={[
            styles.proficiencyBadge,
            { backgroundColor: getDifficultyColor(user?.currentProficiency || 'A1') },
          ]}
        >
          <Text style={styles.proficiencyText}>
            Level {user?.currentProficiency || 'A1'}
          </Text>
        </View>
      </View>

      <View style={styles.streakCard}>
        <View style={styles.streakItem}>
          <Text style={styles.streakValue}>🔥 {streak?.currentStreak || 0}</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakItem}>
          <Text style={styles.streakValue}>🏆 {streak?.longestStreak || 0}</Text>
          <Text style={styles.streakLabel}>Best Streak</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.scenariosCompleted || 0}</Text>
            <Text style={styles.statLabel}>Scenarios Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.totalPracticeMinutes || 0}</Text>
            <Text style={styles.statLabel}>Practice Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.recordingsCount || 0}</Text>
            <Text style={styles.statLabel}>Recordings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.achievementsEarned || 0}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Progress</Text>
        {progress?.progress?.slice(0, 5).map((item: any) => (
          <View key={item.scenarioId} style={styles.progressItem}>
            <View>
              <Text style={styles.progressTitle}>{item.scenario?.title}</Text>
              <Text style={styles.progressMeta}>
                {item.completedDialogues}/{item.totalDialogues} dialogues •{' '}
                {item.progressPercent}% complete
              </Text>
            </View>
            <View
              style={[
                styles.progressBadge,
                { backgroundColor: item.isCompleted ? '#4CAF50' : '#FF9800' },
              ]}
            >
              <Text style={styles.progressBadgeText}>
                {item.isCompleted ? '✓' : '→'}
              </Text>
            </View>
          </View>
        ))}
        {(!progress?.progress || progress.progress.length === 0) && (
          <Text style={styles.emptyText}>No progress yet. Start learning!</Text>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A90D9',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  proficiencyBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  proficiencyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  streakCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  streakLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  streakDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90D9',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  progressItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  progressMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 24,
  },
  logoutButton: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
