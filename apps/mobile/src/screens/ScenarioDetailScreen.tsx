import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

export function ScenarioDetailScreen({ route, navigation }: any) {
  const { scenarioId } = route.params;

  const { data, isLoading } = useQuery({
    queryKey: ['scenario', scenarioId],
    queryFn: () => api.getScenario(scenarioId),
  });

  const startSessionMutation = useMutation({
    mutationFn: () => api.startSession(scenarioId),
    onSuccess: (data) => {
      navigation.navigate('Player', {
        sessionId: data.data.data.sessionId,
        scenarioId,
      });
    },
  });

  const scenario = data?.data?.data;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (!scenario) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Scenario not found</Text>
      </View>
    );
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
        <View style={styles.titleRow}>
          <Text style={styles.title}>{scenario.title}</Text>
          <View
            style={[
              styles.difficultyBadge,
              { backgroundColor: getDifficultyColor(scenario.difficulty) },
            ]}
          >
            <Text style={styles.difficultyText}>{scenario.difficulty}</Text>
          </View>
        </View>
        <Text style={styles.category}>{scenario.category.replace('_', ' ')}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>About this scenario</Text>
        <Text style={styles.description}>{scenario.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{scenario.statistics?.dialogueCount || 0}</Text>
            <Text style={styles.statLabel}>Dialogues</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{scenario.statistics?.vocabularyCount || 0}</Text>
            <Text style={styles.statLabel}>Words</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{scenario.estimatedMinutes}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.startButton, startSessionMutation.isPending && styles.startButtonDisabled]}
          onPress={() => startSessionMutation.mutate()}
          disabled={startSessionMutation.isPending}
        >
          <Text style={styles.startButtonText}>
            {startSessionMutation.isPending ? 'Starting...' : 'Start Practice'}
          </Text>
        </TouchableOpacity>

        {scenario.dialogues && scenario.dialogues.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Dialogues</Text>
            {scenario.dialogues.map((dialogue: any) => (
              <View key={dialogue.id} style={styles.dialogueItem}>
                <Text style={styles.dialogueTitle}>{dialogue.title}</Text>
                <Text style={styles.dialogueMeta}>{dialogue.turnCount} turns</Text>
              </View>
            ))}
          </>
        )}

        {scenario.vocabulary && scenario.vocabulary.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Vocabulary Preview</Text>
            <View style={styles.vocabularyGrid}>
              {scenario.vocabulary.slice(0, 6).map((word: any) => (
                <View key={word.id} style={styles.vocabularyItem}>
                  <Text style={styles.vocabularyWord}>{word.word}</Text>
                  <Text style={styles.vocabularyTranslation}>{word.translation}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#4A90D9',
    padding: 24,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  category: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textTransform: 'capitalize',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
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
  startButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  startButtonDisabled: {
    opacity: 0.7,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  dialogueItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dialogueTitle: {
    fontSize: 16,
    color: '#333',
  },
  dialogueMeta: {
    fontSize: 14,
    color: '#999',
  },
  vocabularyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  vocabularyItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    width: '48%',
  },
  vocabularyWord: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  vocabularyTranslation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
