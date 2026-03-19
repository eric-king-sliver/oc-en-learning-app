import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'daily_conversation', label: 'Daily' },
  { key: 'business', label: 'Business' },
  { key: 'travel', label: 'Travel' },
  { key: 'social', label: 'Social' },
  { key: 'interview', label: 'Interview' },
];

const DIFFICULTIES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function ScenarioListScreen({ navigation }: any) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['scenarios', selectedCategory, selectedDifficulty, searchQuery],
    queryFn: () =>
      api.getScenarios({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        difficulty: selectedDifficulty || undefined,
        search: searchQuery || undefined,
      }),
  });

  const scenarios = data?.data?.data?.scenarios || [];

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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Learn English</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search scenarios..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.filters}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCategory === item.key && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(item.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === item.key && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={DIFFICULTIES}
          keyExtractor={(item) => item}
          style={styles.difficultyFilters}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.difficultyChip,
                { borderColor: getDifficultyColor(item) },
                selectedDifficulty === item && { backgroundColor: getDifficultyColor(item) },
              ]}
              onPress={() => setSelectedDifficulty(selectedDifficulty === item ? null : item)}
            >
              <Text
                style={[
                  styles.difficultyText,
                  { color: selectedDifficulty === item ? '#fff' : getDifficultyColor(item) },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={scenarios}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.scenarioCard}
            onPress={() => navigation.navigate('ScenarioDetail', { scenarioId: item.id })}
          >
            <View style={styles.scenarioHeader}>
              <Text style={styles.scenarioTitle}>{item.title}</Text>
              <View
                style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}
              >
                <Text style={styles.difficultyBadgeText}>{item.difficulty}</Text>
              </View>
            </View>
            <Text style={styles.scenarioDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.scenarioMeta}>
              <Text style={styles.metaText}>
                📚 {item.statistics?.dialogueCount || 0} dialogues
              </Text>
              <Text style={styles.metaText}>⏱️ {item.estimatedMinutes} min</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No scenarios found</Text>
          </View>
        }
      />
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
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  filters: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
  },
  filterChipActive: {
    backgroundColor: '#4A90D9',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  difficultyFilters: {
    marginTop: 8,
  },
  difficultyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    marginHorizontal: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  scenarioCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scenarioTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
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
  scenarioDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  scenarioMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaText: {
    fontSize: 14,
    color: '#999',
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
