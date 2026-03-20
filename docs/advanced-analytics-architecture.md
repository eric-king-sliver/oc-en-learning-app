# Advanced Analytics Architecture

## Phase 4 - English Learning App

This document outlines the architecture for the Advanced Analytics feature, providing comprehensive coverage of data models, API design, recommendation algorithms, and mobile screen requirements. The Advanced Analytics system enables personalized learning insights, performance tracking, and intelligent recommendations for English learners.

---

## Table of Contents

1. [Overview](#overview)
2. [Prisma Data Models](#prisma-data-models)
3. [Analytics API Endpoints](#analytics-api-endpoints)
4. [Recommendation Algorithm](#recommendation-algorithm)
5. [Mobile Screen Requirements](#mobile-screen-requirements)
6. [Data Flow Architecture](#data-flow-architecture)
7. [Implementation Notes](#implementation-notes)

---

## Overview

The Advanced Analytics feature encompasses four core capabilities that work together to provide a personalized learning experience. First, Learning Patterns capture how users interact with different skill areas over time, tracking proficiency scores, practice frequency, and improvement trends. Second, Performance Metrics record granular data points for each learning activity, including accuracy, fluency, vocabulary usage, grammar correctness, and pronunciation quality. Third, Recommendations leverage the analytical data to suggest personalized actions, such as practicing specific skills, reviewing difficult content, or attempting challenging scenarios. Fourth, Strengths and Weaknesses Analysis identifies areas where the user excels and areas requiring improvement based on cumulative performance data.

The system is designed with scalability in mind, supporting both rule-based recommendations for the MVP phase and potential future integration of machine learning models. The mobile dashboard provides learners with actionable insights through intuitive visualizations and clear recommendations.

---

## Prisma Data Models

The Advanced Analytics feature utilizes four primary models stored in the PostgreSQL database. These models capture the essential data required for tracking learning progress, analyzing performance patterns, and generating personalized recommendations.

### LearningPattern Model

The LearningPattern model tracks a user's proficiency development across different skill areas over time. Each record represents a single skill area for a specific user, with fields capturing current proficiency, practice history, and trend analysis.

```prisma
model LearningPattern {
  id              String     @id @default(uuid())
  userId          String     @map("user_id")
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  skillArea       SKILL_AREA @map("skill_area")
  proficiencyScore Float     @default(0.0) @map("proficiency_score")
  practiceCount   Int        @default(0) @map("practice_count")
  lastPracticed   DateTime?  @map("last_practiced")
  trend           Float      @default(0.0)
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")

  @@unique([userId, skillArea])
  @@index([userId])
  @@index([skillArea])
  @@map("learning_patterns")
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key, auto-generated unique identifier |
| userId | String (UUID) | Foreign key referencing the User model |
| skillArea | SKILL_AREA Enum | Specific skill being tracked (speaking, listening, reading, writing, vocabulary, grammar, pronunciation, fluency, comprehension) |
| proficiencyScore | Float | Current proficiency score for this skill area (0.0 to 100.0) |
| practiceCount | Integer | Total number of practice sessions for this skill area |
| lastPracticed | DateTime | Timestamp of the most recent practice session |
| trend | Float | Trend indicator showing improvement or decline (-1.0 to 1.0), positive values indicate improvement |
| createdAt | DateTime | Timestamp when the record was created |
| updatedAt | DateTime | Timestamp of the last update to the record |

The LearningPattern model uses a composite unique constraint on userId and skillArea to ensure only one record exists per skill area per user. This design allows efficient querying of a user's proficiency across all skill areas with a single database operation.

### PerformanceMetric Model

The PerformanceMetric model stores individual performance data points captured during learning activities. Each record represents a single metric measurement at a specific point in time, enabling temporal analysis of user performance.

```prisma
model PerformanceMetric {
  id          String       @id @default(uuid())
  userId      String       @map("user_id")
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  metricType  METRIC_TYPE  @map("metric_type")
  value       Float
  recordedAt  DateTime     @default(now()) @map("recorded_at")

  @@index([userId])
  @@index([metricType])
  @@index([recordedAt])
  @@map("performance_metrics")
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key, auto-generated unique identifier |
| userId | String (UUID) | Foreign key referencing the User model |
| metricType | METRIC_TYPE Enum | Type of metric being recorded (accuracy, fluency, vocabulary, grammar, pronunciation, listening, speaking, reading, writing, comprehension, engagement, consistency) |
| value | Float | The recorded metric value (typically 0.0 to 100.0, though scale varies by metric type) |
| recordedAt | DateTime | Timestamp when this metric was recorded |

The PerformanceMetric model supports flexible metric recording through the METRIC_TYPE enum, which covers all major aspects of language learning. The indexed fields enable efficient queries for generating charts, computing averages, and analyzing performance over specific time periods.

### Recommendation Model

The Recommendation model stores personalized suggestions generated by the recommendation engine. Each recommendation includes a type, priority level, content description, and read status for tracking user engagement.

```prisma
model Recommendation {
  id          String               @id @default(uuid())
  userId      String               @map("user_id")
  user        User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        RECOMMENDATION_TYPE
  priority    RECOMMENDATION_PRIORITY @default(medium)
  content     String
  isRead      Boolean              @default(false) @map("is_read")
  createdAt   DateTime             @default(now()) @map("created_at")

  @@index([userId])
  @@index([isRead])
  @@index([priority])
  @@map("recommendations")
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key, auto-generated unique identifier |
| userId | String (UUID) | Foreign key referencing the User model |
| type | RECOMMENDATION_TYPE Enum | Category of recommendation (practice, review, new_content, challenge, improvement, achievement, reminder) |
| priority | RECOMMENDATION_PRIORITY Enum | Urgency level of the recommendation (low, medium, high, urgent) |
| content | String | Human-readable description of the recommendation |
| isRead | Boolean | Flag indicating whether the user has viewed this recommendation |
| createdAt | DateTime | Timestamp when the recommendation was generated |

The Recommendation model supports prioritization through the priority field, allowing the mobile app to display the most important recommendations first. The isRead flag enables tracking user engagement and implementing features like "mark as read" or "dismiss."

### UserStrengthWeakness Model

The UserStrengthWeakness model stores the analyzed results identifying a user's strengths and weaknesses across different skill areas. This model differs from LearningPattern by storing interpreted conclusions rather than raw data.

```prisma
model UserStrengthWeakness {
  id          String     @id @default(uuid())
  userId      String     @map("user_id")
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  skillArea   SKILL_AREA @map("skill_area")
  strength    Boolean
  score       Float
  evidence    String?    
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  @@unique([userId, skillArea])
  @@index([userId])
  @@index([skillArea])
  @@index([strength])
  @@map("user_strengths_weaknesses")
}
```

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key, auto-generated unique identifier |
| userId | String (UUID) | Foreign key referencing the User model |
| skillArea | SKILL_AREA Enum | Skill area being evaluated |
| strength | Boolean | True indicates this is a strength, false indicates a weakness |
| score | Float | Computed score supporting the strength/weakness determination (0.0 to 100.0) |
| evidence | String (JSON) | Optional JSON string containing supporting evidence such as recent scores, specific errors, or comparison data |
| createdAt | DateTime | Timestamp when this analysis was first created |
| updatedAt | DateTime | Timestamp of the most recent analysis update |

The evidence field stores JSON data that provides context for the strength or weakness determination. This could include recent test scores, specific error patterns, comparison against peers, or historical trend data that informed the classification.

### Supporting Enums

The data models rely on several enum types defined in the Prisma schema:

```prisma
enum METRIC_TYPE {
  accuracy
  fluency
  vocabulary
  grammar
  pronunciation
  listening
  speaking
  reading
  writing
  comprehension
  engagement
  consistency
}

enum RECOMMENDATION_TYPE {
  practice
  review
  new_content
  challenge
  improvement
  achievement
  reminder
}

enum RECOMMENDATION_PRIORITY {
  low
  medium
  high
  urgent
}

enum SKILL_AREA {
  speaking
  listening
  reading
  writing
  vocabulary
  grammar
  pronunciation
  fluency
  comprehension
}
```

---

## Analytics API Endpoints

The Analytics API provides RESTful endpoints for accessing and managing advanced analytics data. All endpoints require authentication via JWT token and follow the existing API versioning pattern (/api/v1/analytics/*).

### Dashboard Endpoints

These endpoints provide the primary data required for the mobile dashboard display.

#### GET /api/v1/analytics/dashboard

Retrieves comprehensive dashboard data including recent performance, active recommendations, and strength/weakness summary. This is the primary endpoint for populating the mobile dashboard on app launch.

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "overview": {
    "totalPracticeSessions": 156,
    "currentStreak": 7,
    "longestStreak": 14,
    "averageScore": 78.5,
    "proficiencyLevel": "B1"
  },
  "recentPerformance": {
    "last7Days": [
      { "date": "2024-01-15", "score": 82, "sessions": 2 },
      { "date": "2024-01-14", "score": 75, "sessions": 1 },
      { "date": "2024-01-13", "score": 80, "sessions": 3 },
      { "date": "2024-01-12", "score": 78, "sessions": 2 },
      { "date": "2024-01-11", "score": 85, "sessions": 1 },
      { "date": "2024-01-10", "score": 72, "sessions": 2 },
      { "date": "2024-01-09", "score": 79, "sessions": 1 }
    ],
    "last30Days": [
      { "date": "2024-01-15", "score": 82, "sessions": 2 }
    ]
  },
  "skillBreakdown": [
    { "skillArea": "speaking", "score": 85, "trend": 2.5, "practiceCount": 45 },
    { "skillArea": "listening", "score": 78, "trend": -1.2, "practiceCount": 38 },
    { "skillArea": "vocabulary", "score": 72, "trend": 3.8, "practiceCount": 52 },
    { "skillArea": "grammar", "score": 68, "trend": 1.5, "practiceCount": 41 },
    { "skillArea": "reading", "score": 82, "trend": 0.8, "practiceCount": 33 },
    { "skillArea": "writing", "score": 65, "trend": 2.1, "practiceCount": 28 },
    { "skillArea": "pronunciation", "score": 70, "trend": -0.5, "practiceCount": 36 },
    { "skillArea": "fluency", "score": 74, "trend": 1.8, "practiceCount": 42 },
    { "skillArea": "comprehension", "score": 80, "trend": 0.3, "practiceCount": 47 }
  ],
  "topStrengths": [
    { "skillArea": "speaking", "score": 85, "evidence": "..." },
    { "skillArea": "reading", "score": 82, "evidence": "..." }
  ],
  "areasForImprovement": [
    { "skillArea": "writing", "score": 65, "evidence": "..." },
    { "skillArea": "grammar", "score": 68, "evidence": "..." }
  ],
  "unreadRecommendations": 3,
  "dailyGoalProgress": {
    "completedMinutes": 12,
    "goalMinutes": 15,
    "percentage": 80
  }
}
```

#### GET /api/v1/analytics/performance

Retrieves detailed performance metrics with optional date range filtering. This endpoint supports the charts on the dashboard and the detailed performance view.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | ISO Date | No | Start of date range filter |
| endDate | ISO Date | No | End of date range filter |
| metricType | String | No | Filter by specific metric type |
| skillArea | String | No | Filter by specific skill area |
| limit | Integer | No | Maximum number of records (default: 100) |
| offset | Integer | No | Number of records to skip (default: 0) |

**Response (200 OK):**
```json
{
  "metrics": [
    {
      "id": "uuid-1",
      "metricType": "accuracy",
      "value": 85.5,
      "recordedAt": "2024-01-15T10:30:00Z",
      "skillArea": "speaking"
    }
  ],
  "summary": {
    "average": 78.3,
    "highest": 92.0,
    "lowest": 65.0,
    "totalRecords": 156
  },
  "timeSeries": [
    { "date": "2024-01-15", "average": 80.2, "count": 12 },
    { "date": "2024-01-14", "average": 77.8, "count": 8 }
  ]
}
```

### Learning Pattern Endpoints

These endpoints manage learning pattern data and trends.

#### GET /api/v1/analytics/patterns

Retrieves all learning patterns for the authenticated user across all skill areas.

**Response (200 OK):**
```json
{
  "patterns": [
    {
      "id": "uuid-1",
      "skillArea": "speaking",
      "proficiencyScore": 85.0,
      "practiceCount": 45,
      "lastPracticed": "2024-01-15T14:30:00Z",
      "trend": 2.5,
      "createdAt": "2023-06-01T00:00:00Z",
      "updatedAt": "2024-01-15T14:30:00Z"
    }
  ]
}
```

#### GET /api/v1/analytics/patterns/:skillArea

Retrieves detailed learning pattern data for a specific skill area including historical trend data.

**Response (200 OK):**
```json
{
  "pattern": {
    "skillArea": "speaking",
    "proficiencyScore": 85.0,
    "practiceCount": 45,
    "lastPracticed": "2024-01-15T14:30:00Z",
    "trend": 2.5
  },
  "history": [
    { "date": "2024-01-15", "score": 85 },
    { "date": "2024-01-10", "score": 82 },
    { "date": "2024-01-05", "score": 78 },
    { "date": "2023-12-30", "score": 75 },
    { "date": "2023-12-25", "score": 72 }
  ],
  "comparison": {
    "peerAverage": 72.0,
    "userScore": 85.0,
    "percentile": 85
  }
}
```

### Recommendation Endpoints

These endpoints manage personalized recommendations for the user.

#### GET /api/v1/analytics/recommendations

Retrieves all recommendations for the authenticated user with filtering and pagination support.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | String | No | Filter by recommendation type |
| priority | String | No | Filter by priority level |
| isRead | Boolean | No | Filter by read status |
| limit | Integer | No | Maximum number of records (default: 20) |
| offset | Integer | No | Number of records to skip (default: 0) |

**Response (200 OK):**
```json
{
  "recommendations": [
    {
      "id": "uuid-1",
      "type": "practice",
      "priority": "high",
      "content": "Focus on improving your grammar skills with daily practice exercises",
      "isRead": false,
      "createdAt": "2024-01-15T08:00:00Z",
      "skillArea": "grammar"
    }
  ],
  "unreadCount": 3,
  "totalCount": 12
}
```

#### PATCH /api/v1/analytics/recommendations/:id/read

Marks a specific recommendation as read.

**Response (200 OK):**
```json
{
  "success": true,
  "recommendation": {
    "id": "uuid-1",
    "isRead": true
  }
}
```

#### POST /api/v1/analytics/recommendations/generate

Triggers the recommendation generation algorithm to create new recommendations. This endpoint is typically called automatically by scheduled jobs but can be invoked manually.

**Response (200 OK):**
```json
{
  "success": true,
  "generatedCount": 5,
  "recommendations": [
    {
      "id": "uuid-new-1",
      "type": "challenge",
      "priority": "medium",
      "content": "Try the advanced business English scenario to push your skills"
    }
  ]
}
```

### Strengths and Weaknesses Endpoints

These endpoints provide analysis results for user strengths and areas for improvement.

#### GET /api/v1/analytics/analysis

Retrieves the complete strengths and weaknesses analysis for the authenticated user.

**Response (200 OK):**
```json
{
  "strengths": [
    {
      "skillArea": "speaking",
      "score": 85.0,
      "evidence": "{\"recentScores\": [88, 85, 82], \"peerComparison\": \"above_average\", \"trend\": \"improving\"}",
      "createdAt": "2024-01-15T00:00:00Z",
      "updatedAt": "2024-01-15T00:00:00Z"
    },
    {
      "skillArea": "reading",
      "score": 82.0,
      "evidence": "{\"recentScores\": [84, 80, 82], \"peerComparison\": \"above_average\", \"trend\": \"stable\"}",
      "createdAt": "2024-01-15T00:00:00Z",
      "updatedAt": "2024-01-15T00:00:00Z"
    }
  ],
  "weaknesses": [
    {
      "skillArea": "writing",
      "score": 65.0,
      "evidence": "{\"recentScores\": [68, 62, 65], \"peerComparison\": \"below_average\", \"trend\": \"improving\"}",
      "createdAt": "2024-01-15T00:00:00Z",
      "updatedAt": "2024-01-15T00:00:00Z"
    },
    {
      "skillArea": "grammar",
      "score": 68.0,
      "evidence": "{\"recentScores\": [70, 65, 68], \"peerComparison\": \"average\", \"trend\": \"stable\"}",
      "createdAt": "2024-01-15T00:00:00Z",
      "updatedAt": "2024-01-15T00:00:00Z"
    }
  ],
  "generatedAt": "2024-01-15T12:00:00Z"
}
```

#### POST /api/v1/analytics/analysis/refresh

Triggers a refresh of the strengths and weaknesses analysis. This endpoint recomputes all analysis based on the latest performance data.

**Response (200 OK):**
```json
{
  "success": true,
  "generatedAt": "2024-01-15T12:30:00Z",
  "changes": {
    "newStrengths": [],
    "newWeaknesses": [],
    "resolvedWeaknesses": ["pronunciation"],
    "newStrengthsAdded": []
  }
}
```

### Metrics Recording Endpoints

These endpoints are primarily used internally to record performance data from learning activities.

#### POST /api/v1/analytics/metrics

Records a new performance metric. This endpoint is called by the learning session service after completing practice activities.

**Request Body:**
```json
{
  "metricType": "accuracy",
  "value": 85.5,
  "skillArea": "speaking"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "metric": {
    "id": "uuid-new",
    "userId": "user-uuid",
    "metricType": "accuracy",
    "value": 85.5,
    "recordedAt": "2024-01-15T15:30:00Z"
  }
}
```

#### POST /api/v1/analytics/metrics/batch

Records multiple performance metrics in a single request. This is more efficient for recording multiple metric types after a single practice session.

**Request Body:**
```json
{
  "metrics": [
    { "metricType": "accuracy", "value": 85.5, "skillArea": "speaking" },
    { "metricType": "fluency", "value": 72.0, "skillArea": "speaking" },
    { "metricType": "pronunciation", "value": 78.0, "skillArea": "speaking" },
    { "metricType": "vocabulary", "value": 80.0, "skillArea": "speaking" }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "recordedCount": 4,
  "metrics": [
    { "id": "uuid-1", "metricType": "accuracy", "value": 85.5 },
    { "id": "uuid-2", "metricType": "fluency", "value": 72.0 }
  ]
}
```

---

## Recommendation Algorithm

The recommendation system uses a rule-based heuristic approach for the MVP phase, with the architecture supporting future machine learning integration. The algorithm analyzes user performance data, learning patterns, and historical behavior to generate personalized recommendations.

### Algorithm Overview

The recommendation engine operates in three phases: data collection, analysis, and generation. During data collection, the system gathers recent performance metrics, learning pattern data, and user activity history. The analysis phase processes this data to identify patterns, trends, and anomalies. Finally, the generation phase creates specific, actionable recommendations based on the analysis results.

### Scoring System

Each potential recommendation is scored based on multiple factors that determine its relevance and urgency:

**Performance Weight (40%):** Recent performance metrics heavily influence recommendations. If a user's accuracy score drops below their historical average, a practice recommendation is generated. The weight is calculated as the absolute difference between recent average and historical average, normalized to a 0-100 scale.

**Trend Analysis Weight (25%):** The learning pattern trend field indicates whether the user is improving or declining in each skill area. Declining trends (negative values below -0.5) trigger review recommendations, while improving trends (positive values above 0.5) suggest opportunities for challenging content.

**Practice Frequency Weight (20%):** The time since last practice in each skill area determines urgency. Skills not practiced in over 7 days generate reminder recommendations, with priority increasing as the gap extends beyond 14 days.

**Engagement Score Weight (15%):** User engagement metrics, including session frequency and duration, influence recommendation type. Users with high engagement receive more challenging recommendations, while users with declining engagement receive encouragement and easier content suggestions.

### Recommendation Type Rules

The algorithm applies specific rules to determine which recommendation type to generate:

**Practice Recommendations (type: practice):** Generated when a skill area shows declining performance or when the user has not practiced a specific skill in over 7 days. Priority is set to high for skills not practiced in 14+ days, medium for 7-14 days, and low otherwise.

**Review Recommendations (type: review):** Generated when the user makes consistent errors in a specific area, detected through pattern analysis. These recommendations suggest reviewing specific grammar rules, vocabulary sets, or pronunciation guides.

**New Content Recommendations (type: new_content):** Generated when the user has mastered their current proficiency level in a skill area (score above 85 for 5+ consecutive sessions). These suggest advancing to more challenging scenarios or new topic areas.

**Challenge Recommendations (type: challenge):** Generated for users with high engagement and strong performance (average score above 80). These suggest advanced scenarios, competitive sessions, or difficult vocabulary challenges.

**Improvement Recommendations (type: improvement):** Generated when specific weaknesses are identified through strengths/weaknesses analysis. These provide targeted suggestions for addressing identified gaps.

**Achievement Recommendations (type: achievement):** Generated when the user is close to earning an achievement (detected through progress data). These encourage continued effort toward milestone completion.

**Reminder Recommendations (type: reminder):** Generated on a scheduled basis to encourage daily practice, maintain streaks, or complete incomplete sessions.

### Priority Calculation

The priority level is calculated using the following logic:

**Urgent Priority:** Assigned when performance has dropped more than 15 points below the user's average, when a learning streak is at risk (last practice was 2+ days ago), or when critical grammar/vocabulary gaps are detected.

**High Priority:** Assigned when a skill area shows consistent decline over 3+ sessions, when the user hasn't practiced in 7+ days, or when recommended for achievement completion within 1-2 sessions.

**Medium Priority:** Assigned for standard practice recommendations, review suggestions for minor issues, or new content that aligns with the user's learning path.

**Low Priority:** Assigned for optional challenges, general tips, or content that is helpful but not immediately relevant to the user's goals.

### Sample Recommendation Generation

Consider a user with the following learning pattern data:

```
Skill: Speaking
- Proficiency Score: 72
- Practice Count: 15
- Last Practiced: 8 days ago
- Trend: -2.5 (declining)
- Recent Scores: [68, 65, 70, 72]
```

The algorithm would generate the following recommendation:

1. **Performance Analysis:** The recent average (68.75) is below the proficiency score (72), indicating decline
2. **Trend Analysis:** The negative trend (-2.5) confirms declining performance
3. **Practice Frequency:** 8 days since last practice exceeds the 7-day threshold
4. **Score Calculation:** Performance weight (40%) × 3.25 + Trend weight (25%) × 2.5 + Frequency weight (20%) × 1.0 = 2.55 (medium-high)
5. **Recommendation Type:** practice (declining performance + infrequent practice)
6. **Priority:** high (trend is significant and practice gap exists)
7. **Generated Content:** "Your speaking skills have declined over the past week. Practice daily for the next 7 days to get back on track."

### Algorithm Pseudocode

```typescript
function generateRecommendations(userId: string): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const patterns = await getLearningPatterns(userId);
  const recentMetrics = await getRecentMetrics(userId, days: 7);
  const strengthsWeaknesses = await getAnalysis(userId);
  
  for (const pattern of patterns) {
    // Check for declining performance
    const recentAvg = calculateAverage(recentMetrics.filter(
      m => m.skillArea === pattern.skillArea
    ));
    const performanceDiff = pattern.proficiencyScore - recentAvg;
    
    if (performanceDiff > 10) {
      const priority = calculatePriority(performanceDiff, pattern.trend, daysSinceLastPractice);
      recommendations.push({
        type: 'practice',
        priority,
        content: generatePracticeContent(pattern, performanceDiff),
        skillArea: pattern.skillArea
      });
    }
    
    // Check for opportunities to advance
    if (pattern.proficiencyScore > 85 && pattern.trend > 0.5) {
      recommendations.push({
        type: 'new_content',
        priority: 'medium',
        content: generateAdvanceContent(pattern),
        skillArea: pattern.skillArea
      });
    }
  }
  
  // Add recommendations based on strengths/weaknesses
  for (const weakness of strengthsWeaknesses.weaknesses) {
    recommendations.push({
      type: 'improvement',
      priority: 'high',
      content: generateImprovementContent(weakness),
      skillArea: weakness.skillArea
    });
  }
  
  // Sort by priority and return top recommendations
  return sortByPriority(recommendations).slice(0, 10);
}

function calculatePriority(performanceDiff: number, trend: number, daysSincePractice: number): RECOMMENDATION_PRIORITY {
  let score = 0;
  
  if (performanceDiff > 15) score += 3;
  else if (performanceDiff > 10) score += 2;
  else if (performanceDiff > 5) score += 1;
  
  if (trend < -2) score += 2;
  else if (trend < -1) score += 1;
  
  if (daysSincePractice > 14) score += 3;
  else if (daysSincePractice > 7) score += 2;
  else if (daysSincePractice > 3) score += 1;
  
  if (score >= 6) return 'urgent';
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}
```

### Scheduled Jobs

The recommendation system operates through scheduled jobs that run at specific intervals:

**Hourly Job:** Processes new performance metrics and updates learning patterns in real-time as users complete practice sessions.

**Daily Job (6:00 AM user local time):** Generates new recommendations based on overnight analysis, sends push notifications for urgent recommendations, and updates strength/weakness analysis.

**Weekly Job (Sunday midnight):** Performs comprehensive analysis, generates weekly performance reports, identifies long-term trends, and archives old recommendations.

---

## Mobile Screen Requirements

The mobile application requires several new screens and components to display analytics data effectively. The design follows the existing mobile app patterns and integrates seamlessly with the current navigation structure.

### Analytics Dashboard Screen

The main Analytics Dashboard serves as the home for all advanced analytics features. This screen provides an at-a-glance view of the user's learning progress and is accessible from the bottom navigation bar.

**Navigation Structure:**
- Bottom tab: "Analytics" (chart icon)
- Stack navigation for drill-down views

**Layout Components:**

1. **Header Section**
   - User greeting with current proficiency level badge
   - Settings icon for analytics preferences
   - Date range selector (Last 7 days / 30 days / All time)

2. **Overview Cards Row**
   - Total practice sessions counter
   - Current streak display with flame icon
   - Longest streak display
   - Average score gauge

3. **Performance Chart Section**
   - Line chart showing score trends over selected time period
   - Toggle between total score and individual skill areas
   - Touch to view specific day details
   - Chart uses gradient fill with primary brand color

4. **Skill Breakdown Section**
   - Horizontal bar chart showing proficiency across all 9 skill areas
   - Each bar displays skill name, score, and trend indicator (up/down arrow)
   - Color coding: Green (80+), Yellow (65-79), Red (<65)
   - Tap on bar navigates to detailed skill view

5. **Strengths & Weaknesses Summary**
   - Two-column layout
   - Left column: Top 3 strengths with shield icon
   - Right column: Top 3 weaknesses with target icon
   - Tap navigates to full analysis screen

6. **Recommendations Preview**
   - Horizontal scrollable cards showing top 3 unread recommendations
   - Each card shows priority indicator (colored dot), type icon, and truncated content
   - "View All" button navigates to recommendations screen
   - Badge showing unread count

7. **Daily Goal Progress**
   - Circular progress indicator showing minutes practiced vs. daily goal
   - Motivational message based on progress

### Skill Detail Screen

The Skill Detail screen provides in-depth analysis for a specific skill area, accessible by tapping a skill in the dashboard.

**Navigation Structure:**
- Push from Analytics Dashboard
- Back button returns to dashboard

**Layout Components:**

1. **Header**
   - Skill area name and icon
   - Current proficiency score (large display)
   - Trend indicator with percentage change

2. **Score History Chart**
   - Line chart showing score progression over time
   - Filter by: Last 7 days, 30 days, 90 days, All time
   - Touch points to see session details

3. **Statistics Cards**
   - Total practice sessions for this skill
   - Average session duration
   - Best score achieved
   - Improvement since started

4. **Recent Sessions List**
   - List of last 10 practice sessions
   - Each item shows: date, score, duration, scenario name
   - Tap to view detailed session analysis

5. **Recommendations for This Skill**
   - Filtered recommendations specific to this skill area
   - Quick action buttons: "Practice Now", "Review Tips"

### Recommendations Screen

The Recommendations screen displays all personalized recommendations with filtering and management capabilities.

**Navigation Structure:**
- Push from Analytics Dashboard or bottom tab

**Layout Components:**

1. **Filter Bar**
   - Segmented control: All, Unread, Practice, Review, Challenges
   - Sort by: Priority, Date, Type

2. **Recommendation Cards**
   - Priority indicator: colored left border (Red=urgent, Orange=high, Blue=medium, Gray=low)
   - Type icon based on recommendation type
   - Content text (max 2 lines, expandable)
   - Skill area tag
   - Created date
   - "Mark as Read" action button

3. **Empty State**
   - Illustration showing no recommendations
   - Encouraging message: "You're doing great! Check back later for more tips."

4. **Bulk Actions**
   - "Mark All as Read" button in header when unread exist
   - Swipe to dismiss individual recommendations

### Strengths & Weaknesses Analysis Screen

This screen provides a comprehensive view of the user's analyzed strengths and weaknesses with supporting evidence.

**Navigation Structure:**
- Push from Analytics Dashboard

**Layout Components:**

1. **Summary Header**
   - Total strengths count
   - Total weaknesses count
   - Overall proficiency level
   - Last analysis update timestamp

2. **Strengths Section**
   - List of strength items with:
     - Skill area icon and name
     - Score (highlighted in green)
     - Evidence summary (collapsible)
     - Trend indicator
   - "View Details" for comprehensive evidence

3. **Weaknesses Section**
   - List of weakness items with:
     - Skill area icon and name
     - Score (highlighted in red/orange)
     - Evidence summary
     - Suggested actions
   - Quick "Practice" button for each

4. **Evidence Modal**
   - Detailed evidence when viewing a strength or weakness
   - Recent score history chart
   - Peer comparison data
   - Specific error patterns (for weaknesses)
   - Improvement tips

### Performance History Screen

The Performance History screen provides detailed historical data with advanced filtering and export capabilities.

**Navigation Structure:**
- Push from Analytics Dashboard

**Layout Components:**

1. **Date Range Picker**
   - Preset options: Last 7 days, 30 days, 90 days, Year, Custom
   - Custom date range picker

2. **Metric Type Filter**
   - Dropdown or chips: All, Accuracy, Fluency, Vocabulary, etc.
   - Multi-select capability

3. **Summary Statistics**
   - Average score
   - Highest score
   - Lowest score
   - Total sessions
   - Time practiced

4. **Data Table**
   - Sortable columns: Date, Skill, Score, Duration, Type
   - Infinite scroll for large datasets
   - Pull to refresh

5. **Export Button**
   - Export as CSV
   - Share functionality

### Chart Component Library

The mobile app requires reusable chart components that can be used across multiple screens. These components should be built using a charting library compatible with React Native Expo (such as react-native-chart-kit or victory-native):

**LineChart Component:**
- Properties: data, labels, color, gradient, height, showDots, curved
- Supports touch interactions for data point details
- Animated rendering

**BarChart Component:**
- Properties: data, labels, colors, barWidth, height
- Horizontal and vertical orientation
- Grouped bars for comparisons

**CircularProgress Component:**
- Properties: progress, size, strokeWidth, color, backgroundColor
- Animated progress updates
- Center content support

**GaugeComponent:**
- Properties: value, min, max, size, color
- For displaying proficiency scores

---

## Data Flow Architecture

Understanding how data flows through the analytics system is essential for implementation. This section describes the data pipeline from user activity to actionable insights.

### Data Collection Flow

The data collection process begins with user activities in the learning sessions. When a user completes a practice session, the session service records the session data and triggers metric recording. The analytics service then captures performance metrics from the session results, including scores for accuracy, fluency, vocabulary, grammar, and pronunciation. This data is stored in the PerformanceMetric table with the recordedAt timestamp set to the completion time.

After metrics are recorded, the system updates the corresponding LearningPattern record. If no pattern exists for the skill area, a new record is created. The proficiency score is recalculated as a weighted average of recent metrics, with more recent scores weighted higher. The practice count is incremented, the lastPracticed timestamp is updated, and the trend is recalculated by comparing recent performance to historical averages.

### Analysis Flow

The analysis flow runs on a scheduled basis to compute strengths and weaknesses. The analysis service queries all LearningPattern records for the user, along with recent PerformanceMetric data. For each skill area, the system compares the current proficiency score against thresholds: scores above 75 are considered strengths, while scores below 65 are considered weaknesses. The evidence field is populated with JSON containing recent scores, trend data, and peer comparisons.

The analysis also identifies specific patterns such as consistent improvement (positive trend over 5+ sessions), stagnation (minimal change over 10+ sessions), decline (negative trend over 3+ sessions), and high engagement (frequent practice with high scores).

### Recommendation Generation Flow

The recommendation generation flow produces personalized suggestions based on the analyzed data. The service first gathers all relevant data: LearningPatterns, PerformanceMetrics, existing Recommendations, and the latest Strengths/Weaknesses analysis. It then applies the scoring algorithm to each potential recommendation type for each skill area. Each recommendation is scored based on performance weight, trend weight, practice frequency weight, and engagement weight. Recommendations below a threshold score are discarded, while the remaining recommendations are sorted by score and stored in the database. Finally, push notifications are sent for urgent and high-priority recommendations.

### Mobile Data Fetching Flow

When the user opens the Analytics Dashboard, the mobile app initiates a series of API calls. First, it calls GET /api/v1/analytics/dashboard to retrieve the comprehensive overview data. Then, it calls GET /api/v1/analytics/recommendations?isRead=false&limit=3 to fetch the top unread recommendations. Finally, it calls GET /api/v1/analytics/analysis to retrieve the strengths and weaknesses summary.

The app caches this data locally with a timestamp. On subsequent opens within 5 minutes, the cached data is displayed while a background refresh fetches new data. Pull-to-refresh forces a fresh fetch, and offline mode displays the last cached data with an offline indicator.

---

## Implementation Notes

### Database Indexing Strategy

The existing Prisma schema includes appropriate indexes for common query patterns. The LearningPattern table has indexes on userId and skillArea, supporting queries for a user's patterns and pattern lookups by skill. The PerformanceMetric table has compound indexes supporting efficient time-range queries with metric type filtering. The Recommendation table has indexes on userId, isRead, and priority, enabling efficient fetching of unread recommendations sorted by priority. The UserStrengthWeakness table has indexes on userId, skillArea, and strength, supporting queries for all strengths or all weaknesses.

### Caching Strategy

Implement Redis caching to improve performance for expensive analytics queries. Cache the dashboard response with a 5-minute TTL for each user. Cache the strengths/weaknesses analysis with a 1-hour TTL, invalidated when new metrics are recorded. Store recommendation counts with a 5-minute TTL. Implement cache invalidation when new metrics are recorded by deleting the user's dashboard cache.

### Rate Limiting Considerations

The existing rate limiting configuration (100 requests per 15 minutes) should accommodate normal analytics usage. Consider implementing separate rate limits for analytics endpoints if usage patterns indicate needed. The batch metric recording endpoint (POST /api/v1/analytics/metrics/batch) should have a higher rate limit to support high-frequency recording during active sessions.

### Error Handling

All analytics endpoints should return appropriate error responses. Authentication errors (401) should be handled by redirecting to login. Database errors (500) should return a generic message with error logging. Empty data states (no metrics recorded) should return helpful messages encouraging the user to start practicing. Invalid date range parameters should return 400 with descriptive error messages.

### Future Enhancements

While this architecture supports the MVP requirements, several enhancements are planned for future phases. Machine learning integration will replace rule-based recommendations with trained models using user behavior patterns, session outcomes, and engagement metrics. Peer comparisons will add anonymous comparison with users at similar proficiency levels. Goal tracking will allow users to set custom goals for specific skills with progress tracking. Achievement analytics will provide detailed breakdowns of achievement progress and milestones.

---

## Summary

The Advanced Analytics architecture provides a comprehensive system for tracking, analyzing, and improving language learning outcomes. The Prisma data models capture essential information about learning patterns, performance metrics, recommendations, and strengths/weaknesses. The RESTful API enables the mobile app to access all analytics features with proper authentication and error handling. The rule-based recommendation algorithm provides personalized, actionable suggestions while supporting future machine learning integration. The mobile screen designs ensure users can easily interpret their progress and act on recommendations.

This architecture balances immediate MVP requirements with scalability for future enhancements, ensuring the analytics feature can grow with user needs and technological capabilities.
