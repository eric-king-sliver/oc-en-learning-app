import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface AnalyticsOverview {
  totalSessions: number;
  averageScore: number;
  currentStreak: number;
  totalTimeSpentMinutes: number;
  period: string;
}

interface PerformanceDataPoint {
  date: string;
  score: number;
  sessionsCompleted: number;
}

interface SkillData {
  skill: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
}

interface Recommendation {
  id: string;
  type: 'scenario' | 'skill' | 'content';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface Insight {
  id: string;
  type: 'achievement' | 'milestone' | 'tip' | 'warning';
  title: string;
  description: string;
  timestamp?: string;
}

export function AnalyticsScreen() {
  const { data: overviewData, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['analyticsOverview'],
    queryFn: () => api.getAnalyticsOverview(),
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['analyticsPerformance'],
    queryFn: () => api.getAnalyticsPerformance({ period: '7days' }),
  });

  const { data: strengthsWeaknessesData, isLoading: swLoading } = useQuery({
    queryKey: ['analyticsStrengthsWeaknesses'],
    queryFn: () => api.getAnalyticsStrengthsWeaknesses(),
  });

  const { data: recommendationsData, isLoading: recLoading } = useQuery({
    queryKey: ['analyticsRecommendations'],
    queryFn: () => api.getAnalyticsRecommendations(),
  });

  const overview: AnalyticsOverview | null = overviewData?.data?.data;
  const performance: PerformanceDataPoint[] = performanceData?.data?.data || [];
  const skills: { strengths: SkillData[]; weaknesses: SkillData[] } = strengthsWeaknessesData?.data?.data || { strengths: [], weaknesses: [] };
  const recommendations: Recommendation[] = recommendationsData?.data?.data || [];

  const isLoading = overviewLoading || performanceLoading || swLoading || recLoading;
  const screenWidth = Dimensions.get('window').width;

  function formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#8BC34A';
    if (score >= 40) return '#FFC107';
    if (score >= 20) return '#FF9800';
    return '#F44336';
  }

  function getTrendIcon(trend: string): string {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  }

  function getTrendColor(trend: string): string {
    switch (trend) {
      case 'up':
        return '#4CAF50';
      case 'down':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  }

  function getInsightIcon(type: string): string {
    switch (type) {
      case 'achievement':
        return '🏆';
      case 'milestone':
        return '🎯';
      case 'tip':
        return '💡';
      case 'warning':
        return '⚠️';
      default:
        return '📊';
    }
  }

  function getInsightColor(type: string): string {
    switch (type) {
      case 'achievement':
        return '#FFD700';
      case 'milestone':
        return '#4A90D9';
      case 'tip':
        return '#8BC34A';
      case 'warning':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return '#F44336';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  }

  const mockInsights: Insight[] = overview?.totalSessions
    ? [
        {
          id: '1',
          type: overview.averageScore >= 70 ? 'achievement' : 'tip',
          title: overview.averageScore >= 70 ? 'Great Progress!' : 'Keep Going!',
          description:
            overview.averageScore >= 70
              ? `You've maintained a ${overview.averageScore}% average score this week!`
              : 'Practice makes perfect. Complete more scenarios to improve your score.',
        },
        {
          id: '2',
          type: overview.currentStreak >= 3 ? 'milestone' : 'tip',
          title: overview.currentStreak >= 3 ? `${overview.currentStreak} Day Streak!` : 'Start Your Streak',
          description:
            overview.currentStreak >= 3
              ? 'Amazing consistency! Keep up the daily practice.'
              : 'Complete at least one lesson daily to build your streak.',
        },
        {
          id: '3',
          type: 'tip',
          title: 'Time Management',
          description: `You've spent ${formatTime(overview.totalTimeSpentMinutes)} learning this ${overview.period}. Great dedication!`,
        },
      ]
    : [
        {
          id: '1',
          type: 'tip',
          title: 'Welcome to Analytics!',
          description: 'Complete your first session to start tracking your progress.',
        },
      ];

  const maxPerformanceScore = Math.max(...performance.map((p) => p.score), 1);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { refetchOverview(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Track your learning progress</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dashboard Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📚</Text>
            <Text style={styles.statValue}>{overview?.totalSessions || 0}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={[styles.statValue, { color: getScoreColor(overview?.averageScore || 0) }]}>
              {overview?.averageScore || 0}%
            </Text>
            <Text style={styles.statLabel}>Average Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statValue}>{overview?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={styles.statValue}>{formatTime(overview?.totalTimeSpentMinutes || 0)}</Text>
            <Text style={styles.statLabel}>Time Spent</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Over Time</Text>
        <View style={styles.chartContainer}>
          {performance.length > 0 ? (
            <View style={styles.chart}>
              <View style={styles.chartBars}>
                {performance.map((point, index) => {
                  const barHeight = (point.score / maxPerformanceScore) * 120;
                  return (
                    <View key={index} style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(barHeight, 4),
                            backgroundColor: getScoreColor(point.score),
                          },
                        ]}
                      />
                      <Text style={styles.barLabel}>{point.date.slice(5)}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.legendText}>Score trend</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No performance data yet</Text>
              <Text style={styles.emptySubtext}>Complete sessions to see your progress</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strengths & Weaknesses</Text>
        <View style={styles.skillsContainer}>
          <View style={styles.skillCategory}>
            <Text style={styles.skillCategoryTitle}>Strengths</Text>
            {skills.strengths.length > 0 ? (
              skills.strengths.map((skill, index) => (
                <View key={index} style={styles.skillItem}>
                  <View style={styles.skillInfo}>
                    <Text style={styles.skillName}>{skill.skill}</Text>
                    <View style={styles.skillScoreRow}>
                      <View style={styles.skillProgressBar}>
                        <View
                          style={[
                            styles.skillProgressFill,
                            { width: `${skill.score}%`, backgroundColor: '#4CAF50' },
                          ]}
                        />
                      </View>
                      <Text style={styles.skillScore}>{skill.score}%</Text>
                    </View>
                  </View>
                  <Text style={[styles.skillTrend, { color: getTrendColor(skill.trend) }]}>
                    {getTrendIcon(skill.trend)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptySkill}>No strengths identified yet</Text>
            )}
          </View>
          <View style={styles.skillCategory}>
            <Text style={styles.skillCategoryTitle}>Areas for Improvement</Text>
            {skills.weaknesses.length > 0 ? (
              skills.weaknesses.map((skill, index) => (
                <View key={index} style={styles.skillItem}>
                  <View style={styles.skillInfo}>
                    <Text style={styles.skillName}>{skill.skill}</Text>
                    <View style={styles.skillScoreRow}>
                      <View style={styles.skillProgressBar}>
                        <View
                          style={[
                            styles.skillProgressFill,
                            { width: `${skill.score}%`, backgroundColor: '#FF9800' },
                          ]}
                        />
                      </View>
                      <Text style={styles.skillScore}>{skill.score}%</Text>
                    </View>
                  </View>
                  <Text style={[styles.skillTrend, { color: getTrendColor(skill.trend) }]}>
                    {getTrendIcon(skill.trend)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptySkill}>No weaknesses identified yet</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personalized Recommendations</Text>
        {recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <View key={rec.id} style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(rec.priority) },
                  ]}
                >
                  <Text style={styles.priorityText}>{rec.priority.toUpperCase()}</Text>
                </View>
                <Text style={styles.recommendationType}>{rec.type}</Text>
              </View>
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
              <Text style={styles.recommendationDescription}>{rec.description}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recommendations yet</Text>
            <Text style={styles.emptySubtext}>Keep learning to get personalized tips</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learning Insights</Text>
        {mockInsights.map((insight) => (
          <View key={insight.id} style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightIcon}>{getInsightIcon(insight.type)}</Text>
              <View
                style={[
                  styles.insightBadge,
                  { backgroundColor: getInsightColor(insight.type) + '20' },
                ]}
              >
                <Text
                  style={[styles.insightBadgeText, { color: getInsightColor(insight.type) }]}
                >
                  {insight.type.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightDescription}>{insight.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Data refreshed for {overview?.period || 'this period'}</Text>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
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
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90D9',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chart: {
    minHeight: 160,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 140,
    paddingBottom: 8,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 24,
    borderRadius: 4,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  emptyChart: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  skillsContainer: {
    gap: 16,
  },
  skillCategory: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  skillCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  skillScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  skillProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  skillScore: {
    fontSize: 12,
    color: '#666',
    width: 36,
    textAlign: 'right',
  },
  skillTrend: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptySkill: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  recommendationType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  insightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  insightBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
