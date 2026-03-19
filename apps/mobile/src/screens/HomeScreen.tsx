import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../stores/AuthContext';
import { api } from '../services/api';

export function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['homeFeed'],
    queryFn: () => api.getHomeFeed(),
  });

  const feedData = data?.data?.data;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.displayName || 'Learner'}! 👋</Text>
        <Text style={styles.proficiency}>Level: {user?.currentProficiency || 'A1'}</Text>
      </View>

      <View style={styles.dailyGoal}>
        <View style={styles.dailyGoalHeader}>
          <Text style={styles.sectionTitle}>Daily Goal</Text>
          <Text style={styles.dailyGoalText}>
            {feedData?.dailyGoal?.current || 0}/{feedData?.dailyGoal?.target || 15} min
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, feedData?.dailyGoal?.progress || 0)}%` },
            ]}
          />
        </View>
        {feedData?.dailyGoal?.completed && (
          <Text style={styles.completedBadge}>✅ Goal completed!</Text>
        )}
      </View>

      {feedData?.continueLearning?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Learning</Text>
          {feedData.continueLearning.map((item: any) => (
            <TouchableOpacity
              key={item.scenarioId}
              style={styles.scenarioCard}
              onPress={() =>
                navigation.navigate('ScenarioDetail', { scenarioId: item.scenarioId })
              }
            >
              <View style={styles.scenarioInfo}>
                <Text style={styles.scenarioTitle}>{item.scenario.title}</Text>
                <Text style={styles.scenarioMeta}>
                  {item.scenario.difficulty} • {item.progressPercent}% complete
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>{item.progressPercent}%</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended for You</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {feedData?.recommendedScenarios?.map((scenario: any) => (
            <TouchableOpacity
              key={scenario.id}
              style={styles.recommendedCard}
              onPress={() => navigation.navigate('ScenarioDetail', { scenarioId: scenario.id })}
            >
              <Text style={styles.recommendedTitle}>{scenario.title}</Text>
              <Text style={styles.recommendedMeta}>
                {scenario.difficulty} • {scenario.estimatedMinutes} min
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{feedData?.stats?.scenariosCompleted || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{feedData?.stats?.totalPracticeMinutes || 0}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
        </View>
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
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  proficiency: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  dailyGoal: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dailyGoalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dailyGoalText: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  completedBadge: {
    marginTop: 8,
    fontSize: 14,
    color: '#4CAF50',
  },
  section: {
    padding: 16,
  },
  scenarioCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scenarioMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  recommendedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recommendedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recommendedMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  statItem: {
    flex: 1,
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
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
