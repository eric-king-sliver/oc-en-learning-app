import { PrismaClient, SKILL_AREA, METRIC_TYPE, RECOMMENDATION_TYPE, RECOMMENDATION_PRIORITY } from '@prisma/client';

const prisma = new PrismaClient();

export interface StrengthWeakness {
  skillArea: SKILL_AREA;
  isStrength: boolean;
  score: number;
  evidence: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface Recommendation {
  id: string;
  type: RECOMMENDATION_TYPE;
  priority: RECOMMENDATION_PRIORITY;
  content: string;
  skillArea?: SKILL_AREA;
  reason: string;
}

export interface LearningPatternResult {
  totalPracticeTime: number;
  practiceStreak: number;
  averageSessionLength: number;
  mostActiveTimeOfDay: string;
  weeklyPracticeDistribution: number[];
  skillAreaBreakdown: {
    skillArea: SKILL_AREA;
    practiceCount: number;
    proficiencyScore: number;
    trend: number;
  }[];
}

export interface PerformanceTrend {
  date: string;
  averageScore: number;
  sessionsCompleted: number;
  metricBreakdown: Record<string, number>;
}

export interface PersonalizedInsight {
  category: 'achievement' | 'suggestion' | 'warning' | 'motivation';
  title: string;
  description: string;
  priority: number;
  actionableSteps?: string[];
}

function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

function calculateStandardDeviation(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const avg = calculateAverage(numbers);
  const squareDiffs = numbers.map((value) => Math.pow(value - avg, 2));
  return Math.sqrt(calculateAverage(squareDiffs));
}

function determineTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
  if (scores.length < 3) return 'stable';
  
  const recentHalf = scores.slice(Math.floor(scores.length / 2));
  const olderHalf = scores.slice(0, Math.floor(scores.length / 2));
  
  const recentAvg = calculateAverage(recentHalf);
  const olderAvg = calculateAverage(olderHalf);
  
  const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (percentChange > 5) return 'improving';
  if (percentChange < -5) return 'declining';
  return 'stable';
}

function getSkillAreaFromMetricType(metricType: METRIC_TYPE): SKILL_AREA {
  const mapping: Record<METRIC_TYPE, SKILL_AREA> = {
    accuracy: SKILL_AREA.speaking,
    fluency: SKILL_AREA.fluency,
    vocabulary: SKILL_AREA.vocabulary,
    grammar: SKILL_AREA.grammar,
    pronunciation: SKILL_AREA.pronunciation,
    listening: SKILL_AREA.listening,
    speaking: SKILL_AREA.speaking,
    reading: SKILL_AREA.reading,
    writing: SKILL_AREA.writing,
    comprehension: SKILL_AREA.comprehension,
    engagement: SKILL_AREA.speaking,
    consistency: SKILL_AREA.fluency,
  };
  return mapping[metricType] || SKILL_AREA.speaking;
}

function getTimeOfDayCategory(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export async function calculateStrengthsWeaknesses(userId: string): Promise<StrengthWeakness[]> {
  try {
    const [learningPatterns, performanceMetrics, strengthsWeaknesses] = await Promise.all([
      prisma.learningPattern.findMany({
        where: { userId },
        orderBy: { skillArea: 'asc' },
      }),
      prisma.performanceMetric.findMany({
        where: { userId },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      }),
      prisma.userStrengthWeakness.findMany({
        where: { userId },
      }),
    ]);

    if (learningPatterns.length === 0 && performanceMetrics.length === 0) {
      return [];
    }

    const skillAreas = Object.values(SKILL_AREA);
    const results: StrengthWeakness[] = [];

    for (const skillArea of skillAreas) {
      const pattern = learningPatterns.find((p) => p.skillArea === skillArea);
      const metrics = performanceMetrics.filter((m) => getSkillAreaFromMetricType(m.metricType) === skillArea);

      let score = 0;
      let evidence = '';

      if (pattern) {
        score = pattern.proficiencyScore;
        evidence = `Practiced ${pattern.practiceCount} times, last practiced ${pattern.lastPracticed?.toISOString().split('T')[0] || 'never'}`;
      }

      if (metrics.length > 0) {
        const metricScores = metrics.map((m) => m.value);
        const avgMetricScore = calculateAverage(metricScores);
        
        if (score === 0) {
          score = avgMetricScore;
        } else {
          score = (score + avgMetricScore) / 2;
        }
        
        if (evidence) {
          evidence += `, average metric score: ${avgMetricScore.toFixed(1)}%`;
        } else {
          evidence = `Average metric score: ${avgMetricScore.toFixed(1)}%`;
        }
      }

      if (score > 0) {
        const threshold = 70;
        const isStrength = score >= threshold;
        const trend = pattern 
          ? (pattern.trend > 5 ? 'improving' : pattern.trend < -5 ? 'declining' : 'stable')
          : 'stable';

        results.push({
          skillArea,
          isStrength,
          score: Math.round(score * 10) / 10,
          evidence,
          trend,
        });
      }
    }

    for (const result of results) {
      await prisma.userStrengthWeakness.upsert({
        where: {
          userId_skillArea: {
            userId,
            skillArea: result.skillArea,
          },
        },
        update: {
          strength: result.isStrength,
          score: result.score,
          evidence: result.evidence,
        },
        create: {
          userId,
          skillArea: result.skillArea,
          strength: result.isStrength,
          score: result.score,
          evidence: result.evidence,
        },
      });
    }

    return results.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error calculating strengths and weaknesses:', error);
    throw new Error('Failed to calculate strengths and weaknesses');
  }
}

/**
 * Generate rule-based recommendations based on user performance
 */
export async function generateRecommendations(userId: string): Promise<Recommendation[]> {
  try {
    const [strengthsWeaknesses, learningPatterns, recentSessions, userProfile] = await Promise.all([
      calculateStrengthsWeaknesses(userId),
      prisma.learningPattern.findMany({ where: { userId } }),
      prisma.learningSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      prisma.userLearningProfile.findUnique({ where: { userId } }),
    ]);

    const recommendations: Recommendation[] = [];

    const weaknesses = strengthsWeaknesses.filter((sw) => !sw.isStrength && sw.score > 0);
    for (const weakness of weaknesses.slice(0, 2)) {
      recommendations.push({
        id: `weakness-${weakness.skillArea}`,
        type: RECOMMENDATION_TYPE.practice,
        priority: RECOMMENDATION_PRIORITY.high,
        content: `Focus on improving your ${weakness.skillArea}`,
        skillArea: weakness.skillArea,
        reason: `Your ${weakness.skillArea} score is ${weakness.score.toFixed(1)}%, below the recommended threshold`,
      });
    }

    const strengths = strengthsWeaknesses.filter((sw) => sw.isStrength);
    for (const strength of strengths.slice(0, 1)) {
      recommendations.push({
        id: `strength-${strength.skillArea}`,
        type: RECOMMENDATION_TYPE.challenge,
        priority: RECOMMENDATION_PRIORITY.medium,
        content: `Challenge yourself to improve your ${strength.skillArea} further`,
        skillArea: strength.skillArea,
        reason: `Your ${strength.skillArea} is strong at ${strength.score.toFixed(1)}% - keep pushing!`,
      });
    }

    const today = new Date();
    const lastSession = recentSessions[0];
    if (lastSession) {
      const daysSinceLastSession = Math.floor((today.getTime() - lastSession.startedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastSession > 1) {
        recommendations.push({
          id: 'streak-reminder',
          type: RECOMMENDATION_TYPE.reminder,
          priority: RECOMMENDATION_PRIORITY.urgent,
          content: 'Practice today to maintain your learning streak',
          reason: `You haven't practiced in ${daysSinceLastSession} days`,
        });
      }
    } else {
      recommendations.push({
        id: 'start-learning',
        type: RECOMMENDATION_TYPE.new_content,
        priority: RECOMMENDATION_PRIORITY.high,
        content: 'Start your first learning session',
        reason: 'Begin your English learning journey today',
      });
    }

    const practicedSkills = learningPatterns.map((p) => p.skillArea);
    const allSkills = Object.values(SKILL_AREA);
    const unpracticedSkills = allSkills.filter((s) => !practicedSkills.includes(s));
    
    if (unpracticedSkills.length > 0 && unpracticedSkills.length < allSkills.length) {
      recommendations.push({
        id: 'balanced-practice',
        type: RECOMMENDATION_TYPE.improvement,
        priority: RECOMMENDATION_PRIORITY.medium,
        content: `Explore new skills: ${unpracticedSkills.slice(0, 2).join(', ')}`,
        reason: 'A balanced approach accelerates learning',
      });
    }

    if (userProfile?.dailyGoalMinutes) {
      const todaySessions = recentSessions.filter((s) => {
        const sessionDate = s.startedAt.toISOString().split('T')[0];
        return sessionDate === today.toISOString().split('T')[0];
      });
      
      const totalMinutesToday = calculateAverage(todaySessions.map((s) => s.durationSec || 0)) / 60;
      
      if (totalMinutesToday < userProfile.dailyGoalMinutes) {
        recommendations.push({
          id: 'daily-goal',
          type: RECOMMENDATION_TYPE.practice,
          priority: RECOMMENDATION_PRIORITY.high,
          content: `Complete ${userProfile.dailyGoalMinutes - Math.floor(totalMinutesToday)} more minutes to reach your daily goal`,
          reason: `You're ${Math.floor(totalMinutesToday)}/${userProfile.dailyGoalMinutes} minutes towards your daily goal`,
        });
      }
    }

    for (const rec of recommendations) {
      await prisma.recommendation.upsert({
        where: {
          userId_id: {
            userId,
            id: rec.id,
          },
        },
        update: {
          type: rec.type,
          priority: rec.priority,
          content: rec.content,
        },
        create: {
          id: rec.id,
          userId,
          type: rec.type,
          priority: rec.priority,
          content: rec.content,
        },
      });
    }

    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw new Error('Failed to generate recommendations');
  }
}

/**
 * Track and analyze user practice habits
 */
export async function calculateLearningPattern(userId: string): Promise<LearningPatternResult> {
  try {
    const [learningPatterns, sessions, voiceRecordings] = await Promise.all([
      prisma.learningPattern.findMany({ where: { userId } }),
      prisma.learningSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 100,
      }),
      prisma.voiceRecording.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const totalPracticeTime = sessions.reduce((acc, s) => acc + (s.durationSec || 0), 0);

    let practiceStreak = 0;
    if (sessions.length > 0) {
      const sessionDates = new Set(
        sessions.map((s) => s.startedAt.toISOString().split('T')[0])
      );
      
      const today = new Date();
      let currentDate = new Date(today);
      
      while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (sessionDates.has(dateStr)) {
          practiceStreak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (practiceStreak === 0) {
          currentDate.setDate(currentDate.getDate() - 1);
          if (sessionDates.has(currentDate.toISOString().split('T')[0])) {
            practiceStreak = 1;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    const sessionDurations = sessions.map((s) => s.durationSec || 0).filter((d) => d > 0);
    const averageSessionLength = calculateAverage(sessionDurations);

    const timeDistribution: Record<string, number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };
    
    for (const session of sessions) {
      const hour = session.startedAt.getHours();
      const timeOfDay = getTimeOfDayCategory(hour);
      timeDistribution[timeOfDay]++;
    }
    
    const mostActiveTimeOfDay = Object.entries(timeDistribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'morning';

    const weeklyPracticeDistribution = [0, 0, 0, 0, 0, 0, 0];
    for (const session of sessions) {
      const dayOfWeek = session.startedAt.getDay();
      weeklyPracticeDistribution[dayOfWeek]++;
    }

    const skillAreaBreakdown = learningPatterns.map((pattern) => ({
      skillArea: pattern.skillArea,
      practiceCount: pattern.practiceCount,
      proficiencyScore: pattern.proficiencyScore,
      trend: pattern.trend,
    }));

    return {
      totalPracticeTime,
      practiceStreak,
      averageSessionLength,
      mostActiveTimeOfDay,
      weeklyPracticeDistribution,
      skillAreaBreakdown,
    };
  } catch (error) {
    console.error('Error calculating learning pattern:', error);
    throw new Error('Failed to calculate learning pattern');
  }
}

/**
 * Get performance trends over a specified number of days
 */
export async function getPerformanceTrend(userId: string, days: number = 30): Promise<PerformanceTrend[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [performanceMetrics, sessions] = await Promise.all([
      prisma.performanceMetric.findMany({
        where: {
          userId,
          recordedAt: { gte: startDate },
        },
        orderBy: { recordedAt: 'asc' },
      }),
      prisma.learningSession.findMany({
        where: {
          userId,
          startedAt: { gte: startDate },
        },
        orderBy: { startedAt: 'asc' },
      }),
    ]);

    const metricsByDate: Record<string, number[]> = {};
    for (const metric of performanceMetrics) {
      const dateKey = metric.recordedAt.toISOString().split('T')[0];
      if (!metricsByDate[dateKey]) {
        metricsByDate[dateKey] = [];
      }
      metricsByDate[dateKey].push(metric.value);
    }

    const sessionsByDate: Record<string, number> = {};
    for (const session of sessions) {
      const dateKey = session.startedAt.toISOString().split('T')[0];
      sessionsByDate[dateKey] = (sessionsByDate[dateKey] || 0) + 1;
    }

    const trends: PerformanceTrend[] = [];
    const currentDate = new Date(startDate);
    const endDate = new Date();

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayMetrics = metricsByDate[dateKey] || [];
      const daySessions = sessionsByDate[dateKey] || 0;

      const metricBreakdown: Record<string, number> = {};
      const metricsForDay = performanceMetrics.filter(
        (m) => m.recordedAt.toISOString().split('T')[0] === dateKey
      );
      
      for (const metric of metricsForDay) {
        metricBreakdown[metric.metricType] = metric.value;
      }

      trends.push({
        date: dateKey,
        averageScore: calculateAverage(dayMetrics),
        sessionsCompleted: daySessions,
        metricBreakdown,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trends;
  } catch (error) {
    console.error('Error getting performance trend:', error);
    throw new Error('Failed to get performance trend');
  }
}

/**
 * Generate AI-like personalized insights from user data
 */
export async function getPersonalizedInsights(userId: string): Promise<PersonalizedInsight[]> {
  try {
    const [strengthsWeaknesses, learningPattern, performanceTrend, recentSessions, userProfile] = await Promise.all([
      calculateStrengthsWeaknesses(userId),
      calculateLearningPattern(userId),
      getPerformanceTrend(userId, 30),
      prisma.learningSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 20,
      }),
      prisma.userLearningProfile.findUnique({ where: { userId } }),
    ]);

    const insights: PersonalizedInsight[] = [];

    const avgScore = calculateAverage(
      performanceTrend.filter((t) => t.averageScore > 0).map((t) => t.averageScore)
    );
    
    if (avgScore >= 80) {
      insights.push({
        category: 'achievement',
        title: 'Excellent Progress',
        description: `You're maintaining an impressive average score of ${avgScore.toFixed(1)}%!`,
        priority: 1,
      });
    } else if (avgScore >= 60) {
      insights.push({
        category: 'suggestion',
        title: 'Good Progress',
        description: `Your average score is ${avgScore.toFixed(1)}%. Keep pushing to reach the excellence threshold!`,
        priority: 2,
      });
    }

    const scoresOverTime = performanceTrend.filter((t) => t.averageScore > 0).map((t) => t.averageScore);
    const stdDev = calculateStandardDeviation(scoresOverTime);
    
    if (stdDev < 10 && scoresOverTime.length > 5) {
      insights.push({
        category: 'achievement',
        title: 'Consistent Performer',
        description: 'Your performance is remarkably consistent. This is a key indicator of mastery!',
        priority: 2,
        actionableSteps: ['Try more challenging content', 'Focus on expanding vocabulary'],
      });
    } else if (stdDev > 20) {
      insights.push({
        category: 'warning',
        title: 'Performance Variance',
        description: 'Your scores fluctuate significantly. Focus on steady practice rather than intensive sessions.',
        priority: 1,
        actionableSteps: ['Practice shorter sessions daily', 'Review topics where you score lower'],
      });
    }

    if (learningPattern.practiceStreak >= 7) {
      insights.push({
        category: 'achievement',
        title: `${learningPattern.practiceStreak} Day Streak!`,
        description: `Amazing consistency! You've practiced for ${learningPattern.practiceStreak} days in a row.`,
        priority: 1,
      });
    } else if (learningPattern.practiceStreak === 0 && recentSessions.length > 0) {
      insights.push({
        category: 'motivation',
        title: 'Start Your Streak Today',
        description: 'A single practice session today can kickstart your learning journey.',
        priority: 1,
        actionableSteps: ['Complete one 15-minute session', 'Review your previous lessons'],
      });
    }

    const bestTimeOfDay = learningPattern.mostActiveTimeOfDay;
    const timeRecommendations: Record<string, string> = {
      morning: 'You perform best in the morning. Schedule challenging content for AM sessions.',
      afternoon: 'You\'re most productive in the afternoon. Great time for speaking practice!',
      evening: 'You\'re a night owl! Evening sessions work well for your learning style.',
      night: 'Late-night sessions suit you. Consider pre-planning tomorrow\'s practice.',
    };
    
    if (timeRecommendations[bestTimeOfDay]) {
      insights.push({
        category: 'suggestion',
        title: 'Optimal Learning Time',
        description: timeRecommendations[bestTimeOfDay],
        priority: 3,
      });
    }

    const weakestArea = strengthsWeaknesses
      .filter((sw) => !sw.isStrength)
      .sort((a, b) => a.score - b.score)[0];
    
    if (weakestArea) {
      const improvementTips: Record<SKILL_AREA, string> = {
        [SKILL_AREA.speaking]: 'Practice speaking aloud daily, even if just for 5 minutes.',
        [SKILL_AREA.listening]: 'Watch English videos with subtitles to improve comprehension.',
        [SKILL_AREA.reading]: 'Read short articles daily, gradually increasing complexity.',
        [SKILL_AREA.writing]: 'Keep a daily journal in English, starting with simple sentences.',
        [SKILL_AREA.vocabulary]: 'Learn 5 new words daily and use them in sentences.',
        [SKILL_AREA.grammar]: 'Focus on one grammar rule per day and practice with exercises.',
        [SKILL_AREA.pronunciation]: 'Record yourself and compare with native speakers.',
        [SKILL_AREA.fluency]: 'Practice speaking without pausing, even if mistakes occur.',
        [SKILL_AREA.comprehension]: 'Summarize what you hear or read in your own words.',
      };
      
      insights.push({
        category: 'suggestion',
        title: `Improve Your ${weakestArea.skillArea}`,
        description: improvementTips[weakestArea.skillArea] || 'Dedicate more time to this skill area.',
        priority: 2,
        actionableSteps: [
          `Practice ${weakestArea.skillArea} for 10 minutes daily`,
          `Track your progress weekly`,
          'Don\'t be afraid to make mistakes - they\'re learning opportunities',
        ],
      });
    }

    const weeklyTotal = learningPattern.weeklyPracticeDistribution.reduce((a, b) => a + b, 0);
    const activeDays = learningPattern.weeklyPracticeDistribution.filter((d) => d > 0).length;
    
    if (activeDays >= 5) {
      insights.push({
        category: 'achievement',
        title: 'Highly Engaged Learner',
        description: `You've been active on ${activeDays} days this week. Fantastic engagement!`,
        priority: 2,
      });
    } else if (activeDays < 3 && weeklyTotal > 0) {
      insights.push({
        category: 'suggestion',
        title: 'Increase Weekly Engagement',
        description: 'Try to practice at least 5 days per week for optimal results.',
        priority: 2,
        actionableSteps: ['Set a specific time daily for practice', 'Use reminders in your profile'],
      });
    }

    if (userProfile?.dailyGoalMinutes) {
      const recentDays = performanceTrend.slice(-7);
      const avgDailyMinutes = calculateAverage(
        recentDays.map((d) => d.sessionsCompleted * 15)
      );
      
      if (avgDailyMinutes >= userProfile.dailyGoalMinutes) {
        insights.push({
          category: 'achievement',
          title: 'Goal Crusher',
          description: `You're meeting or exceeding your ${userProfile.dailyGoalMinutes}-minute daily goal!`,
          priority: 1,
        });
      } else {
        insights.push({
          category: 'suggestion',
          title: 'Daily Goal In Progress',
          description: `You're averaging ${avgDailyMinutes.toFixed(0)} minutes. Your goal is ${userProfile.dailyGoalMinutes} minutes.`,
          priority: 2,
          actionableSteps: [
            `Add ${userProfile.dailyGoalMinutes - Math.floor(avgDailyMinutes)} more minutes today`,
            'Break your practice into shorter sessions',
          ],
        });
      }
    }

    return insights.sort((a, b) => a.priority - b.priority);
  } catch (error) {
    console.error('Error getting personalized insights:', error);
    throw new Error('Failed to get personalized insights');
  }
}

export default {
  calculateStrengthsWeaknesses,
  generateRecommendations,
  calculateLearningPattern,
  getPerformanceTrend,
  getPersonalizedInsights,
};
