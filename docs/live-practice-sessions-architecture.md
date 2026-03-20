# Live Practice Sessions - Architecture Document

## Overview

The **Live Practice Sessions** feature enables two users to practice English conversation in real-time, matched by proficiency level and availability. Users engage in scenario-based conversations with AI-generated prompts while receiving live feedback.

---

## Table of Contents

1. [Prisma Database Models](#1-prisma-database-models)
2. [Socket.io Events and Handlers](#2-socketio-events-and-handlers)
3. [REST API Endpoints](#3-rest-api-endpoints)
4. [Mobile Screen Flow](#4-mobile-screen-flow)
5. [Data Flow Diagrams](#5-data-flow-diagrams)

---

## 1. Prisma Database Models

### 1.1 Enums Required

```prisma
// Add to existing schema.prisma

enum SESSION_STATUS {
  searching     // User is in matchmaking queue
  matched       // Match found, waiting for session start
  active        // Session in progress
  completed     // Session finished normally
  cancelled     // Session cancelled by user or timeout
  expired       // Match expired without session start
}

enum MATCHMAKING_QUEUE {
  quick_play    // Match with anyone available
  level_matched // Match by proficiency level
  practice      // Specific scenario practice
}

enum MESSAGE_TYPE {
  text          // Plain text message
  audio         // Audio message URL
  system        // System notification
  scenario_prompt // AI-generated scenario prompt
  feedback      // Speech/grammar feedback
}
```

### 1.2 LiveSession Model

```prisma
model LiveSession {
  // Core Identification
  id                    String         @id @default(uuid())
  
  // Session Metadata
  sessionCode           String         @unique @map("session_code")  // 6-character alphanumeric code for sharing
  status                SESSION_STATUS @default(searching)
  
  // Participants (2 users max)
  user1Id              String          @map("user_1_id")
  user1                User            @relation("LiveSessionUser1", fields: [user1Id], references: [id], onDelete: Cascade)
  user2Id              String?         @map("user_2_id")
  user2                User?           @relation("LiveSessionUser2", fields: [user2Id], references: [id], onDelete: Cascade)
  
  // Proficiency Level (for matching)
  targetProficiency    CEFR_LEVEL     @map("target_proficiency")
  actualProficiency    CEFR_LEVEL?    @map("actual_proficiency")  // Average of both users
  
  // Scenario Configuration
  scenarioId           String?         @map("scenario_id")
  scenario             Scenario?       @relation(fields: [scenarioId], references: [id])
  scenarioCategory     SCENARIO_CATEGORY? @map("scenario_category")
  
  // Timing
  startedAt            DateTime?       @map("started_at")
  endedAt              DateTime?       @map("ended_at")
  durationSec          Int?            @map("duration_sec")
  
  // Matchmaking Metadata
  matchmakingType      MATCHMAKING_QUEUE @default(quick_play) @map("matchmaking_type")
  matchedAt            DateTime?       @map("matched_at")
  searchStartedAt      DateTime        @default(now()) @map("search_started_at")
  
  // Performance Metrics
  totalMessages        Int             @default(0) @map("total_messages")
  user1TurnCount       Int             @default(0) @map("user_1_turn_count")
  user2TurnCount       Int             @default(0) @map("user_2_turn_count")
  
  // Session Outcome
  completionType       String?         @map("completion_type")  // "mutual", "user_left", "timeout"
  user1Feedback        Int?            @map("user_1_feedback")  // 1-5 rating
  user2Feedback        Int?            @map("user_2_feedback")
  
  // Timestamps
  createdAt            DateTime        @default(now()) @map("created_at")
  updatedAt            DateTime        @updatedAt @map("updated_at")
  
  // Relations
  messages             LiveSessionMessage[]
  matchHistory         MatchHistory[]
  
  @@index([status, targetProficiency])
  @@index([user1Id, status])
  @@index([user2Id, status])
  @@map("live_sessions")
}
```

### 1.3 LiveSessionMessage Model

```prisma
model LiveSessionMessage {
  // Core Identification
  id              String        @id @default(uuid())
  
  // Session Reference
  sessionId       String        @map("session_id")
  session         LiveSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  // Message Content
  messageType     MESSAGE_TYPE  @default(text) @map("message_type")
  content         String        // Text content or JSON for complex types
  
  // Audio (for voice messages)
  audioUrl        String?       @map("audio_url")
  audioDurationMs Int?         @map("audio_duration_ms")
  
  // Speech Analysis Results
  transcript      String?       @map("transcript")
  fluencyScore    Int?          @map("fluency_score")      // 0-100
  pronunciationScore Int?       @map("pronunciation_score") // 0-100
  grammarScore    Int?          @map("grammar_score")      // 0-100
  vocabularySuggestions Json?   @map("vocabulary_suggestions")
  
  // Sender Information
  senderId        String        @map("sender_id")
  senderRole      String        @map("sender_role")  // "user1" or "user2"
  senderTurnNumber Int          @map("sender_turn_number")  // Turn counter for this user
  
  // Scenario Context
  isScenarioPrompt Boolean      @default(false) @map("is_scenario_prompt")
  promptId         String?       @map("prompt_id")  // Reference to scenario prompt if applicable
  
  // Read Receipts
  readAt          DateTime?      @map("read_at")
  
  // Timestamps
  createdAt       DateTime       @default(now()) @map("created_at")
  
  @@index([sessionId, createdAt])
  @@index([senderId, sessionId])
  @@map("live_session_messages")
}
```

### 1.4 MatchHistory Model

```prisma
model MatchHistory {
  // Core Identification
  id              String        @id @default(uuid())
  
  // Session Reference
  sessionId       String        @map("session_id")
  session         LiveSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  // User Reference
  userId          String        @map("user_id")
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Match Details
  matchedWithId   String        @map("matched_with_id")  // Other user's ID
  matchedWithProficiency CEFR_LEVEL @map("matched_with_proficiency")
  
  // Outcome
  wasSuccessful   Boolean       @default(false) @map("was_successful")  // Completed full session
  userLeftEarly   Boolean       @default(false) @map("user_left_early")
  userRating      Int?          @map("user_rating")  // User's rating of the match
  
  // Duration
  durationSec     Int?          @map("duration_sec")
  
  // Timestamps
  matchedAt       DateTime      @default(now()) @map("matched_at")
  
  @@unique([sessionId, userId])
  @@index([userId, matchedAt])
  @@map("match_history")
}
```

### 1.5 MatchmakingQueue Model

```prisma
model MatchmakingQueue {
  // Core Identification
  id              String        @id @default(uuid())
  
  // User Reference
  userId          String        @unique @map("user_id")
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Queue Configuration
  queueType       MATCHMAKING_QUEUE @default(quick_play) @map("queue_type")
  targetProficiency CEFR_LEVEL   @map("target_proficiency")
  preferredCategory SCENARIO_CATEGORY? @map("preferred_category")
  
  // Scenario Filter (optional)
  scenarioId      String?       @map("scenario_id")
  
  // Status
  isActive        Boolean       @default(true) @map("is_active")
  matchedSessionId String?      @map("matched_session_id")
  
  // Client Connection Info (for direct socket matching)
  socketId        String?       @map("socket_id")
  
  // Timeout
  expiresAt       DateTime      @map("expires_at")  // Auto-remove after 5 minutes
  
  // Timestamps
  queuedAt        DateTime      @default(now()) @map("queued_at")
  
  @@index([isActive, queueType, targetProficiency])
  @@index([expiresAt])  // For cleanup queries
  @@map("matchmaking_queue")
}
```

### 1.6 Updated User Model Relations

```prisma
// Add to existing User model:
model User {
  // ... existing fields ...
  
  // Live Practice Relations
  liveSessionsAsUser1   LiveSession[] @relation("LiveSessionUser1")
  liveSessionsAsUser2   LiveSession[] @relation("LiveSessionUser2")
  matchHistory         MatchHistory[]
  matchmakingQueue      MatchmakingQueue?
  
  // Live session messages
  liveSessionMessages   LiveSessionMessage[] @relation("LiveSessionMessageSender")
}
```

---

## 2. Socket.io Events and Handlers

### 2.1 Client → Server Events

#### Connection & Authentication

```typescript
// Event: "connection" (built-in Socket.io)
// Handled via middleware that validates JWT token from query string

interface SocketAuthPayload {
  token: string;  // JWT access token
}

// Event: "authenticate"
// Payload: { token: string }
// Response: { success: boolean, userId: string, error?: string }
```

#### Matchmaking Events

```typescript
// Event: "join_lobby"
// Payload: {
//   queueType: "quick_play" | "level_matched" | "practice",
//   targetProficiency: "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
//   preferredCategory?: "daily_conversation" | "business" | "travel" | "social" | "interview" | "academic",
//   scenarioId?: string  // Only for "practice" queue type
// }
// Response: { status: "searching", queuePosition: number, estimatedWaitTime: number }

interface JoinLobbyPayload {
  queueType: 'quick_play' | 'level_matched' | 'practice';
  targetProficiency: CEFR_LEVEL;
  preferredCategory?: SCENARIO_CATEGORY;
  scenarioId?: string;
}

interface JoinLobbyResponse {
  status: 'searching';
  queuePosition: number;
  estimatedWaitTime: number;  // seconds
}

// Event: "leave_lobby"
// Payload: {} (empty)
// Response: { success: boolean }
```

#### Session Events

```typescript
// Event: "join_session"
// Payload: { sessionId: string }
// Response: { 
//   success: boolean,
//   session: SessionState,
//   messages: Message[],
//   partner: PartnerInfo
// }

interface JoinSessionPayload {
  sessionId: string;
}

interface SessionState {
  id: string;
  sessionCode: string;
  status: SESSION_STATUS;
  scenarioId?: string;
  scenarioTitle?: string;
  startedAt?: string;
  durationSec: number;
  user1Id: string;
  user2Id: string;
  yourRole: 'user1' | 'user2';
  currentTurn: 'user1' | 'user2';
}

interface PartnerInfo {
  id: string;
  displayName: string;
  avatarUrl?: string;
  proficiency: CEFR_LEVEL;
  isOnline: boolean;
}

interface Message {
  id: string;
  messageType: MESSAGE_TYPE;
  content: string;
  audioUrl?: string;
  transcript?: string;
  fluencyScore?: number;
  pronunciationScore?: number;
  grammarScore?: number;
  senderId: string;
  senderRole: 'user1' | 'user2';
  senderTurnNumber: number;
  isScenarioPrompt: boolean;
  createdAt: string;
}

// Event: "leave_session"
// Payload: { sessionId: string, reason: "user_left" | "completed" }
// Response: { success: boolean }

// Event: "send_message"
// Payload: {
//   sessionId: string,
//   content: string,
//   messageType: "text" | "audio",
//   audioUrl?: string,
//   audioDurationMs?: number
// }
// Response: { 
//   success: boolean,
//   message: Message,
//   analysis?: SpeechAnalysisResult
// }

interface SendMessagePayload {
  sessionId: string;
  content: string;
  messageType: 'text' | 'audio';
  audioUrl?: string;
  audioDurationMs?: number;
}

interface SpeechAnalysisResult {
  transcript: string;
  fluencyScore: number;
  pronunciationScore: number;
  grammarScore: number;
  vocabularySuggestions: VocabularySuggestion[];
  feedback: string;
}

interface VocabularySuggestion {
  original: string;
  suggestion: string;
  explanation: string;
}

// Event: "start_session"
// Payload: { sessionId: string }
// Response: { 
//   success: boolean,
//   firstPrompt: ScenarioPrompt,
//   sessionStartTime: string
// }

// Event: "end_session"
// Payload: { 
//   sessionId: string, 
//   reason: "mutual" | "user_left" | "timeout"
// }
// Response: { 
//   success: boolean,
//   summary: SessionSummary 
// }

interface SessionSummary {
  sessionId: string;
  durationSec: number;
  totalMessages: number;
  yourTurnCount: number;
  partnerTurnCount: number;
  yourAverageScores: {
    fluency: number;
    pronunciation: number;
    grammar: number;
  };
  partnerAverageScores: {
    fluency: number;
    pronunciation: number;
    grammar: number;
  };
  scenarioTitle?: string;
  completionType: string;
}

// Event: "submit_feedback"
// Payload: { 
//   sessionId: string, 
//   rating: number  // 1-5
// }
// Response: { success: boolean }
```

#### Presence Events

```typescript
// Event: "typing_start"
// Payload: { sessionId: string }

// Event: "typing_stop"
// Payload: { sessionId: string }
```

---

### 2.2 Server → Client Events

```typescript
// Event: "match_found"
// Payload: {
//   sessionId: string,
//   sessionCode: string,
//   partner: PartnerInfo,
//   timeToAccept: number  // seconds (default 30)
// }

interface MatchFoundPayload {
  sessionId: string;
  sessionCode: string;
  partner: PartnerInfo;
  timeToAccept: number;
}

// Event: "match_timeout"
// Payload: { sessionId: string }

// Event: "match_declined"
// Payload: { sessionId: string, reason: "partner_declined" | "partner_disconnected" }

// Event: "session_started"
// Payload: {
//   session: SessionState,
//   firstPrompt: ScenarioPrompt
// }

interface ScenarioPrompt {
  id: string;
  type: "conversation_starter" | "situation" | "question" | "roleplay";
  title: string;
  content: string;
  context?: string;
  expectedTopics?: string[];
  difficulty: CEFR_LEVEL;
  suggestedResponses?: string[];
}

// Event: "new_message"
// Payload: { message: Message }

interface NewMessagePayload {
  message: Message;
}

// Event: "partner_typing"
// Payload: { 
//   isTyping: boolean,
//   partnerRole: "user1" | "user2"
// }

// Event: "partner_joined"
// Payload: { 
//   partner: PartnerInfo 
// }

// Event: "partner_left"
// Payload: { 
//   sessionId: string,
//   reason: "disconnected" | "session_ended",
//   remainingUserId?: string
// }

// Event: "session_ended"
// Payload: { 
//   sessionId: string,
//   summary: SessionSummary,
//   reason: "mutual" | "partner_left" | "timeout"
// }

// Event: "session_error"
// Payload: { 
//   error: string,
//   code: "SESSION_NOT_FOUND" | "NOT_IN_SESSION" | "PERMISSION_DENIED" | "SESSION_FULL"
// }

// Event: "queue_update"
// Payload: {
//   status: "searching" | "matched" | "cancelled",
//   queuePosition?: number,
//   estimatedWaitTime?: number
// }
```

---

### 2.3 Socket.io Handler Implementation Structure

```typescript
// src/sockets/livePractice.ts

interface LivePracticeSocketHandler {
  // Authentication
  handleAuth(socket: AuthenticatedSocket): Promise<void>;
  
  // Matchmaking
  handleJoinLobby(socket: AuthenticatedSocket, payload: JoinLobbyPayload): Promise<void>;
  handleLeaveLobby(socket: AuthenticatedSocket): Promise<void>;
  handleMatchAccept(socket: AuthenticatedSocket, payload: { sessionId: string }): Promise<void>;
  handleMatchDecline(socket: AuthenticatedSocket, payload: { sessionId: string }): Promise<void>;
  
  // Session Management
  handleJoinSession(socket: AuthenticatedSocket, payload: JoinSessionPayload): Promise<void>;
  handleLeaveSession(socket: AuthenticatedSocket, payload: { sessionId: string; reason: string }): Promise<void>;
  handleStartSession(socket: AuthenticatedSocket, payload: { sessionId: string }): Promise<void>;
  handleEndSession(socket: AuthenticatedSocket, payload: { sessionId: string; reason: string }): Promise<void>;
  
  // Messaging
  handleSendMessage(socket: AuthenticatedSocket, payload: SendMessagePayload): Promise<void>;
  handleTypingStart(socket: AuthenticatedSocket, payload: { sessionId: string }): Promise<void>;
  handleTypingStop(socket: AuthenticatedSocket, payload: { sessionId: string }): Promise<void>;
  
  // Feedback
  handleSubmitFeedback(socket: AuthenticatedSocket, payload: { sessionId: string; rating: number }): Promise<void>;
}

interface AuthenticatedSocket extends Socket {
  userId: string;
  user: User;
}
```

---

## 3. REST API Endpoints

### 3.1 Session Management Endpoints

#### Create Live Session (Start Matchmaking)

```
POST /api/v1/live-sessions/create
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "queueType": "quick_play" | "level_matched" | "practice",
  "targetProficiency": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "preferredCategory": "daily_conversation" | "business" | "travel" | "social" | "interview" | "academic",
  "scenarioId": "uuid (optional, required for practice queue)"
}

Response (202 Accepted):
{
  "status": "success",
  "data": {
    "sessionId": "uuid",
    "sessionCode": "ABC123",
    "status": "searching",
    "queuePosition": 1,
    "estimatedWaitTime": 45,
    "socketEvent": "match_found",
    "expiresAt": "2024-01-15T10:05:00Z"
  }
}
```

#### Join Existing Session via Code

```
POST /api/v1/live-sessions/join/:sessionCode
Authorization: Bearer <access_token>

Request: (empty body)

Response (200 OK):
{
  "status": "success",
  "data": {
    "sessionId": "uuid",
    "status": "matched",
    "partner": {
      "id": "uuid",
      "displayName": "John",
      "avatarUrl": "https://...",
      "proficiency": "B1"
    }
  }
}

Response (409 Conflict) - Session full or invalid:
{
  "status": "error",
  "error": "Session is full or does not exist"
}
```

#### Leave Lobby (Cancel Matchmaking)

```
POST /api/v1/live-sessions/leave-lobby
Authorization: Bearer <access_token>

Request: (empty body)

Response (200 OK):
{
  "status": "success",
  "message": "Removed from matchmaking queue"
}
```

#### Get Session Details

```
GET /api/v1/live-sessions/:sessionId
Authorization: Bearer <access_token>

Response (200 OK):
{
  "status": "success",
  "data": {
    "id": "uuid",
    "sessionCode": "ABC123",
    "status": "active",
    "scenario": {
      "id": "uuid",
      "title": "Ordering at a Restaurant",
      "category": "daily_conversation",
      "difficulty": "A2"
    },
    "startedAt": "2024-01-15T10:00:00Z",
    "durationSec": 300,
    "partner": {
      "id": "uuid",
      "displayName": "John",
      "avatarUrl": "https://...",
      "proficiency": "B1",
      "isOnline": true
    },
    "statistics": {
      "totalMessages": 24,
      "yourTurns": 12,
      "partnerTurns": 12,
      "yourAverageFluency": 78,
      "partnerAverageFluency": 72
    }
  }
}
```

#### Get Session Messages

```
GET /api/v1/live-sessions/:sessionId/messages
Authorization: Bearer <access_token>
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 50, max: 100)
  - before: ISO timestamp (for pagination)

Response (200 OK):
{
  "status": "success",
  "data": {
    "messages": [
      {
        "id": "uuid",
        "messageType": "scenario_prompt",
        "content": "You are at a restaurant. The waiter has handed you the menu.",
        "senderId": "system",
        "senderRole": "system",
        "isScenarioPrompt": true,
        "createdAt": "2024-01-15T10:00:05Z"
      },
      {
        "id": "uuid",
        "messageType": "text",
        "content": "Hi, could I see the vegetarian options please?",
        "senderId": "uuid",
        "senderRole": "user1",
        "senderTurnNumber": 1,
        "transcript": "Hi, could I see the vegetarian options please?",
        "fluencyScore": 85,
        "pronunciationScore": 82,
        "grammarScore": 90,
        "createdAt": "2024-01-15T10:00:30Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 24,
      "totalPages": 1
    }
  }
}
```

#### Complete Session

```
POST /api/v1/live-sessions/:sessionId/complete
Authorization: Bearer <access_token>
Content-Type: application/json

Request:
{
  "reason": "mutual" | "user_left"
}

Response (200 OK):
{
  "status": "success",
  "data": {
    "sessionId": "uuid",
    "status": "completed",
    "durationSec": 600,
    "summary": {
      "totalMessages": 30,
      "yourTurnCount": 15,
      "partnerTurnCount": 15,
      "yourAverageScores": {
        "fluency": 78,
        "pronunciation": 75,
        "grammar": 82
      },
      "partnerAverageScores": {
        "fluency": 72,
        "pronunciation": 68,
        "grammar": 75
      },
      "scenarioTitle": "Ordering at a Restaurant",
      "completionType": "mutual"
    },
    "nextRecommendedSession": {
      "scenarioId": "uuid",
      "title": "Making a Reservation",
      "difficulty": "A2"
    }
  }
}
```

---

### 3.2 Session History Endpoints

#### Get User's Live Session History

```
GET /api/v1/live-sessions/history
Authorization: Bearer <access_token>
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20, max: 50)
  - status: "completed" | "cancelled" | "all" (default: all)
  - proficiency: CEFR_LEVEL (filter by session level)

Response (200 OK):
{
  "status": "success",
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "sessionCode": "ABC123",
        "status": "completed",
        "scenario": {
          "id": "uuid",
          "title": "Ordering at a Restaurant",
          "category": "daily_conversation",
          "difficulty": "A2"
        },
        "partner": {
          "id": "uuid",
          "displayName": "John",
          "avatarUrl": "https://...",
          "proficiency": "B1"
        },
        "durationSec": 600,
        "totalMessages": 30,
        "yourTurnCount": 15,
        "completedAt": "2024-01-15T11:10:00Z",
        "yourFeedback": 4,
        "yourAverageFluency": 78
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### Get Session Details (Historical)

```
GET /api/v1/live-sessions/history/:sessionId
Authorization: Bearer <access_token>

Response (200 OK):
{
  "status": "success",
  "data": {
    "session": {
      "id": "uuid",
      "sessionCode": "ABC123",
      "status": "completed",
      "scenario": {
        "id": "uuid",
        "title": "Ordering at a Restaurant",
        "category": "daily_conversation",
        "difficulty": "A2"
      },
      "partner": {
        "id": "uuid",
        "displayName": "John",
        "avatarUrl": "https://...",
        "proficiency": "B1"
      },
      "startedAt": "2024-01-15T10:00:00Z",
      "endedAt": "2024-01-15T11:10:00Z",
      "durationSec": 600,
      "completionType": "mutual"
    },
    "messages": [
      // Full message history with all analysis
    ],
    "statistics": {
      "totalMessages": 30,
      "yourTurns": 15,
      "partnerTurns": 15,
      "yourAverageScores": {
        "fluency": 78,
        "pronunciation": 75,
        "grammar": 82,
        "vocabulary": 80
      },
      "partnerAverageScores": {
        "fluency": 72,
        "pronunciation": 68,
        "grammar": 75,
        "vocabulary": 70
      }
    }
  }
}
```

---

### 3.3 Matchmaking Status Endpoints

#### Get Matchmaking Status

```
GET /api/v1/live-sessions/matchmaking-status
Authorization: Bearer <access_token>

Response (200 OK) - When in queue:
{
  "status": "success",
  "data": {
    "inQueue": true,
    "queueType": "level_matched",
    "queuePosition": 2,
    "estimatedWaitTime": 60,
    "searchingSince": "2024-01-15T10:00:00Z"
  }
}

Response (200 OK) - When not in queue:
{
  "status": "success",
  "data": {
    "inQueue": false
  }
}

Response (200 OK) - When match found (pending accept):
{
  "status": "success",
  "data": {
    "inQueue": false,
    "matchPending": true,
    "sessionId": "uuid",
    "partner": {
      "id": "uuid",
      "displayName": "John",
      "avatarUrl": "https://...",
      "proficiency": "B1"
    },
    "expiresAt": "2024-01-15T10:05:30Z"
  }
}
```

---

### 3.4 Statistics Endpoints

#### Get Live Practice Statistics

```
GET /api/v1/live-sessions/stats
Authorization: Bearer <access_token>

Response (200 OK):
{
  "status": "success",
  "data": {
    "totalSessions": 45,
    "completedSessions": 38,
    "cancelledSessions": 7,
    "totalPracticeTimeSec": 28800,  // 8 hours
    "averageSessionDurationSec": 757,
    "averageFluencyScore": 76,
    "averagePronunciationScore": 73,
    "averageGrammarScore": 79,
    "currentStreak": 5,
    "longestStreak": 12,
    "levelProgress": {
      "currentLevel": "B1",
      "sessionsAtCurrentLevel": 15,
      "sessionsToNextLevel": 10,
      "projectedLevelUp": "2024-02-01"
    },
    "categoryBreakdown": [
      { "category": "daily_conversation", "sessions": 20, "avgScore": 78 },
      { "category": "business", "sessions": 12, "avgScore": 75 },
      { "category": "travel", "sessions": 8, "avgScore": 80 },
      { "category": "interview", "sessions": 5, "avgScore": 72 }
    ]
  }
}
```

---

### 3.5 Available Scenarios for Live Practice

```
GET /api/v1/live-sessions/available-scenarios
Authorization: Bearer <access_token>
Query Parameters:
  - difficulty: CEFR_LEVEL (optional filter)
  - category: SCENARIO_CATEGORY (optional filter)

Response (200 OK):
{
  "status": "success",
  "data": {
    "scenarios": [
      {
        "id": "uuid",
        "title": "Ordering at a Restaurant",
        "description": "Practice ordering food and making special requests",
        "category": "daily_conversation",
        "difficulty": "A2",
        "estimatedMinutes": 10,
        "participantCount": 150,
        "averageRating": 4.5
      },
      // ... more scenarios
    ]
  }
}
```

---

## 4. Mobile Screen Flow

### 4.1 Screen Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Live Practice Screen Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   Lobby      │───▶│ Matchmaking  │───▶│  Pre-Session     │   │
│  │   Screen     │    │   Screen     │    │  Screen          │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│         │                                        │               │
│         │                                        ▼               │
│         │                   ┌────────────────────────────────┐  │
│         │                   │     Practice Session Screen     │  │
│         │                   │  ┌──────────────────────────┐  │  │
│         │                   │  │   Scenario Prompt       │  │  │
│         │                   │  │   + Partner Message     │  │  │
│         │                   │  │   + Your Message Input  │  │  │
│         │                   │  └──────────────────────────┘  │  │
│         │                   └────────────────────────────────┘  │
│         │                                        │               │
│         ▼                                        ▼               │
│  ┌──────────────┐                       ┌──────────────────┐   │
│  │   History    │                       │   Results        │   │
│  │   Screen     │                       │   Screen         │   │
│  └──────────────┘                       └──────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Screen Specifications

---

#### 4.2.1 Live Practice Lobby Screen

**Navigation**: Tab Bar → Live Practice Button → Lobby Screen

**Purpose**: Entry point for live practice sessions

**Components**:
```
┌─────────────────────────────────────────────┐
│  ≡  Live Practice                    ? Help │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     🎯  Quick Match                 │    │
│  │     Match with anyone               │    │
│  │     ~2-5 min wait                   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     📊  Level Match                 │    │
│  │     Match by your level             │    │
│  │     ~5-10 min wait                  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     📝  Practice Mode               │    │
│  │     Specific scenario practice      │    │
│  │     Select scenario below           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ──────── Recommended Scenarios ───────    │
│                                             │
│  ┌────────────┐  ┌────────────┐            │
│  │ Restaurant │  │  Airport   │            │
│  │   A2 • 10m │  │   B1 • 15m │            │
│  └────────────┘  └────────────┘            │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  📜  History                               │
│                                             │
├─────────────────────────────────────────────┤
│  Home  Learn  Profile  Videos  Chatbot     │
└─────────────────────────────────────────────┘
```

**State Management**:
- `selectedMode`: 'quick_play' | 'level_matched' | 'practice'
- `selectedScenario`: Scenario | null
- `recentSessions`: LiveSessionSummary[]

**Interactions**:
- Tap mode card → Navigate to Matchmaking Screen
- Tap scenario → Set as practice scenario, highlight
- Tap History → Navigate to History Screen
- Pull to refresh → Refresh recommended scenarios

---

#### 4.2.2 Matchmaking Screen

**Navigation**: Lobby Screen → Select Mode → Matchmaking Screen

**Purpose**: Show matchmaking progress and wait for match

**Components**:
```
┌─────────────────────────────────────────────┐
│  ←  Finding Practice Partner                │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│              🔍  Searching...               │
│                                             │
│         ┌─────────────────────┐             │
│         │                     │             │
│         │    Animated         │             │
│         │    Radar/Search     │             │
│         │    Animation        │             │
│         │                     │             │
│         └─────────────────────┘             │
│                                             │
│         Position in queue: 2               │
│         Est. wait time: ~3 min              │
│                                             │
│  ───────────────────────────────────────    │
│                                             │
│  Your preferences:                          │
│  • Level: B1                                │
│  • Category: Daily Conversation            │
│                                             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         ❌  Cancel Search            │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**State Management**:
- `queuePosition`: number
- `estimatedWaitTime`: number
- `searchStartTime`: Date
- `searchParams`: MatchmakingParams

**Socket Events**:
- Listen: `match_found` → Navigate to Pre-Session Screen
- Listen: `queue_update` → Update position/wait time
- Emit: `leave_lobby` on cancel

**Timeout Handling**:
- After 5 minutes no match → Show "No matches available" modal
- Options: "Keep searching" | "Change preferences" | "Try again later"

---

#### 4.2.3 Pre-Session Screen

**Navigation**: Match Found → Pre-Session Screen

**Purpose**: Confirm match and show partner info before starting

**Components**:
```
┌─────────────────────────────────────────────┐
│  ✓  Match Found!                     ✕     │
├─────────────────────────────────────────────┤
│                                             │
│         🎉  Great news!                     │
│         We found a practice partner          │
│                                             │
│    ┌───────────────────────────────────┐    │
│    │         👤  Partner Info          │    │
│    │                                   │    │
│    │      [Avatar Circle]             │    │
│    │         John D.                   │    │
│    │         Level: B1                 │    │
│    │         🗣️  45 sessions          │    │
│    │                                   │    │
│    │    Sessions completed: 32       │    │
│    │    Avg. score: 78                │    │
│    │                                   │    │
│    └───────────────────────────────────┘    │
│                                             │
│    📝  Scenario: "At the Restaurant"       │
│        Difficulty: A2                       │
│        Est. time: 10 minutes                │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │         ✅  Start Session           │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│    (Auto-start in 30 seconds)              │
│                                             │
└─────────────────────────────────────────────┘
```

**State Management**:
- `partner`: PartnerInfo
- `session`: SessionState
- `countdown`: number (30 → 0)

**Socket Events**:
- Listen: `session_started` → Navigate to Practice Session Screen
- Listen: `partner_left` / `match_timeout` → Show modal, return to lobby

**Auto-accept**:
- If no action taken, auto-start after countdown

---

#### 4.2.4 Practice Session Screen

**Navigation**: Session Started → Practice Session Screen

**Purpose**: Main real-time conversation interface

**Components**:
```
┌─────────────────────────────────────────────┐
│  ABC123  │  At Restaurant  │  ⏱️ 5:32      │
│    ▼     │      A2         │    ▼ Pause    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📌  Scenario Prompt                 │   │
│  │                                      │   │
│  │ You are at a restaurant. The        │   │
│  │ waiter has handed you the menu.     │   │
│  │ What would you say?                 │   │
│  │                                      │   │
│  │ 💡 Topics: ordering, vegetarian,   │   │
│  │    allergies, recommendations       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ──────── Conversation ───────             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 👤  John (partner)          10:02   │   │
│  │ Hi! I'll have the pasta carbonara   │   │
│  │ please.                             │   │
│  │                                      │   │
│  │ 🗣️ Fluency: 82                      │   │
│  │    Pronunciation: 78                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 👤  You (you)               10:05   │   │
│  │ Hi, could I see the vegetarian      │   │
│  │ options please?                     │   │
│  │                                      │   │
│  │ 🗣️ Fluency: 85  🎯 Pron: 82        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [Mic] │ Type your message...        │   │
│  │       │                        Send │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│  Your turn! 🎤        [End Session]        │
└─────────────────────────────────────────────┘
```

**State Management**:
- `messages`: Message[]
- `currentTurn`: 'user1' | 'user2' | 'system'
- `partnerTyping`: boolean
- `sessionTime`: number (seconds)
- `scenarioPrompt`: ScenarioPrompt

**Socket Events**:
- Listen: `new_message` → Append to messages, play notification sound
- Listen: `partner_typing` → Show typing indicator
- Listen: `session_ended` → Navigate to Results Screen
- Emit: `send_message` on submit
- Emit: `typing_start` / `typing_stop` on input focus/blur

**Input Modes**:
- Text: Standard keyboard input
- Voice: Hold-to-record, release to send
- Both trigger speech analysis

**Speech Analysis**:
- On voice message → Send to `/recordings/analyze`
- Display scores below message after processing

**Exit Handling**:
- Tap "End Session" → Show confirmation modal
- Confirm → Emit `end_session`, navigate to Results
- Cancel → Return to session

---

#### 4.2.5 Results Screen

**Navigation**: Session Ended → Results Screen

**Purpose**: Show session summary and feedback

**Components**:
```
┌─────────────────────────────────────────────┐
│           🎉  Session Complete!              │
├─────────────────────────────────────────────┤
│                                             │
│    ┌───────────────────────────────────┐    │
│    │           ⏱️  10:32               │    │
│    │           Total Time              │    │
│    └───────────────────────────────────┘    │
│                                             │
│    ─── Your Performance ───                │
│                                             │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│    │   85    │  │   82    │  │   88    │   │
│    │ Fluency │  │   Pron. │  │ Grammar │   │
│    └─────────┘  └─────────┘  └─────────┘   │
│                                             │
│    • 15 conversation turns                 │
│    • 3 new vocabulary words                │
│                                             │
│    ─── Partner Performance ───              │
│                                             │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│    │   78    │  │   75    │  │   80    │   │
│    │ Fluency │  │   Pron. │  │ Grammar │   │
│    └─────────┘  └─────────┘  └─────────┘   │
│                                             │
│    ─── Rate Your Session ───               │
│                                             │
│    How was your practice?                  │
│    ☆ ☆ ☆ ☆ ☆                               │
│                                             │
│    ┌─────────────────────────────────────┐  │
│    │                                     │  │
│    │        🏠  Back to Home             │  │
│    │                                     │  │
│    └─────────────────────────────────────┘  │
│                                             │
│    ┌─────────────────────────────────────┐  │
│    │        🔄  Practice Again            │  │
│    └─────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

**State Management**:
- `summary`: SessionSummary
- `userRating`: number (1-5)
- `ratingSubmitted`: boolean

**Interactions**:
- Tap star rating → Submit feedback, highlight selected
- Tap "Back to Home" → Return to Lobby/Tab
- Tap "Practice Again" → Start new matchmaking

---

#### 4.2.6 History Screen

**Navigation**: Lobby → History Button → History Screen

**Purpose**: View past live practice sessions

**Components**:
```
┌─────────────────────────────────────────────┐
│  ←  Practice History                  Filter│
├─────────────────────────────────────────────┤
│                                             │
│  Stats Summary:                             │
│  ┌─────────────────────────────────────┐    │
│  │  Total: 45  │  Completed: 38       │    │
│  │  Streak: 5  │  Avg Score: 76       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ──────── This Week ───────                 │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 📅 Today, 10:30 AM                  │    │
│  │ Restaurant (A2) • John D.           │    │
│  │ ✅ 10 min • Score: 82              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 📅 Yesterday, 3:00 PM               │    │
│  │ Airport (B1) • Maria S.            │    │
│  │ ✅ 15 min • Score: 78              │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ──────── Last Week ───────                │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 📅 Jan 10, Business (B2)           │    │
│  │ ❌ Cancelled (partner left)         │    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│  [See All 45 sessions]                      │
└─────────────────────────────────────────────┘
```

**State Management**:
- `sessions`: LiveSessionSummary[]
- `filter`: HistoryFilter
- `stats`: QuickStats

**Interactions**:
- Tap session → Navigate to Session Detail Screen
- Tap Filter → Show filter modal (date, status, difficulty)
- Pull to refresh → Reload history

---

#### 4.2.7 Session Detail Screen

**Purpose**: View detailed information about a past session

**Components** (similar to Results + Messages):
- Full session summary
- Complete message transcript with all analysis
- Partner information
- Option to practice same scenario again

---

### 4.3 Navigation Structure

```typescript
// Navigation Types for React Navigation

type LivePracticeStackParamList = {
  Lobby: undefined;
  Matchmaking: {
    queueType: MATCHMAKING_QUEUE;
    targetProficiency: CEFR_LEVEL;
    scenarioId?: string;
  };
  PreSession: {
    sessionId: string;
    partner: PartnerInfo;
    sessionCode: string;
  };
  PracticeSession: {
    sessionId: string;
  };
  Results: {
    sessionId: string;
    summary: SessionSummary;
  };
  History: undefined;
  SessionDetail: {
    sessionId: string;
  };
};

type RootStackParamList = {
  // ... existing tabs
  LivePractice: NavigatorScreenProps<LivePracticeStackParamList>;
};
```

---

## 5. Data Flow Diagrams

### 5.1 Matchmaking Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  User   │     │    API      │     │  Matchmaker  │     │    Database     │
└────┬────┘     └──────┬──────┘     └───────┬──────┘     └────────┬────────┘
     │                 │                     │                     │
     │ POST /create    │                     │                     │
     │────────────────▶│                     │                     │
     │                 │ Insert to Queue     │                     │
     │                 │─────────────────────▶│                     │
     │                 │                     │                     │
     │                 │                     │ Find Match Query    │
     │                 │                     │─────────────────────▶
     │                 │                     │                     │
     │                 │                     │◀─────────────────────
     │                 │                     │ (Match Found)       │
     │                 │                     │                     │
     │                 │ Update Queue +      │                     │
     │                 │ Create Session      │                     │
     │                 │─────────────────────▶│                     │
     │                 │                     │                     │
     │ 202 Accepted    │                     │                     │
     │◀────────────────│                     │                     │
     │                 │                     │                     │
     │ Socket: join_lobby                    │                     │
     │───────────────────────────────────────▶│                     │
     │                 │                     │                     │
     │                 │         Socket: match_found              │
     │◀───────────────────────────────────────│                     │
     │                 │                     │                     │
     v                 v                     v                     v
```

### 5.2 Real-Time Messaging Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  User A │     │ Socket.io   │     │   Partner    │     │    Database     │
└────┬────┘     └──────┬──────┘     └───────┬──────┘     └────────┬────────┘
     │                 │                     │                     │
     │ send_message   │                     │                     │
     │────────────────▶│                     │                     │
     │                 │                     │                     │
     │                 │ Validate + Store    │                     │
     │                 │ message             │                     │
     │                 │─────────────────────▶│                     │
     │                 │                     │                     │
     │                 │◀────────────────────│                     │
     │                 │ (confirm)            │                     │
     │                 │                     │                     │
     │                 │ If voice: Analyze   │                     │
     │                 │◀─────────────────────────────────────────────
     │                 │                     │ (analysis result)   │
     │                 │                     │─────────────────────▶
     │                 │                     │ (update message)    │
     │                 │                     │                     │
     │ Socket: new_message                    │                     │
     │◀────────────────────────────────────────│                     │
     │                 │                     │                     │
     │                 │ Socket: new_message │                     │
     │                 │─────────────────────▶│                     │
     │                 │                     │                     │
     │ Ack + Analysis  │                     │                     │
     │◀────────────────│                     │                     │
     │                 │                     │                     │
     v                 v                     v                     v
```

### 5.3 Session Lifecycle State Machine

```
                    ┌──────────────┐
                    │              │
                    │   SEARCHING  │
                    │              │
                    └──────┬───────┘
                           │
                           │ Match Found
                           ▼
                    ┌──────────────┐
                    │              │
                    │   MATCHED    │◀────────────┐
                    │              │  (timeout)  │
                    └──────┬───────┘             │
                           │                     │
                           │ Both Accept         │ Partner Declines
                           ▼                     │
                    ┌──────────────┐             │
                    │              │             │
              ┌────▶   ACTIVE     │             │
              │     │              │             │
              │     └──────┬───────┘             │
              │            │                     │
              │            │ Session Complete   │
              │            ▼                     │
              │     ┌──────────────┐              │
              │     │              │              │
              │     │  COMPLETED   │              │
              │     │              │              │
              │     └──────────────┘              │
              │                                    │
              │ Either User Leaves                 │
              │                                    │
              └──────────┐                          │
                         ▼                          │
                  ┌──────────────┐                  │
                  │              │                  │
                  │  CANCELLED   │──────────────────┘
                  │              │
                  └──────────────┘
```

### 5.4 API Request/Response Flow for Session Creation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Create Session Flow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Mobile App                    Backend                    Database     │
│     │                           │                           │            │
│     │  POST /api/v1/live-sessions/create                  │            │
│     │  {                                                │            │
│     │    queueType: "level_matched",                    │            │
│     │    targetProficiency: "B1",                       │            │
│     │    preferredCategory: "business"                  │            │
│     │  }                                                │            │
│     │─────────────────────────▶                         │            │
│     │                           │                       │            │
│     │                           │ Validate Request      │            │
│     │                           │──────────────────────▶            │
│     │                           │                       │            │
│     │                           │◀──────────────────────            │
│     │                           │ (valid)              │            │
│     │                           │                       │            │
│     │                           │ Create Session (searching)         │
│     │                           │ Add to Matchmaking Queue          │
│     │                           │──────────────────────▶            │
│     │                           │                       │            │
│     │                           │◀──────────────────────            │
│     │                           │ (created)            │            │
│     │                           │                       │            │
│     │  202 Accepted             │                       │            │
│     │  {                        │                       │            │
│     │    sessionId: "uuid",     │                       │            │
│     │    sessionCode: "ABC123", │                       │            │
│     │    status: "searching",   │                       │            │
│     │    queuePosition: 2,      │                       │            │
│     │    estimatedWaitTime: 45  │                       │            │
│     │  }                        │                       │            │
│     │◀─────────────────────────│                       │            │
│     │                           │                       │            │
│     │  Connect to Socket.io    │                       │            │
│     │  with sessionId          │                       │            │
│     │─────────────────────────▶│                       │            │
│     │                           │                       │            │
│     │                           │                       │            │
│     ▼                           ▼                       ▼            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| SESSION_NOT_FOUND | Session ID is invalid | 404 |
| SESSION_FULL | Session already has 2 participants | 409 |
| NOT_IN_SESSION | User is not in this session | 403 |
| NOT_YOUR_TURN | Trying to send message when it's partner's turn | 400 |
| SESSION_EXPIRED | Session expired (30 min inactivity) | 410 |
| ALREADY_IN_QUEUE | User already in matchmaking queue | 409 |
| NOT_IN_QUEUE | User is not in matchmaking queue | 400 |
| INVALID_QUEUE_TYPE | Invalid matchmaking type specified | 400 |
| PERMISSION_DENIED | User does not have permission | 403 |

---

## Appendix B: Rate Limits

| Endpoint | Limit |
|----------|-------|
| POST /create | 10 requests/minute |
| POST /join/:code | 20 requests/minute |
| Socket: send_message | 30 messages/minute |
| POST /complete | 10 requests/minute |

---

## Appendix C: WebSocket Authentication

```typescript
// Client-side socket connection
import { io, Socket } from 'socket.io-client';

const socket: Socket = io(LIVE_PRACTICE_SOCKET_URL, {
  auth: {
    token: accessToken,  // JWT from secure storage
  },
  query: {
    platform: 'mobile',
    appVersion: '1.0.0',
  },
});

// Server-side middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Validate JWT and attach user to socket
  const user = validateToken(token);
  if (user) {
    socket.userId = user.id;
    socket.user = user;
    next();
  } else {
    next(new Error('Authentication error'));
  }
});
```

---

## Appendix D: Configuration Constants

```typescript
export const LIVE_PRACTICE_CONFIG = {
  // Matchmaking
  MAX_QUEUE_WAIT_TIME_SEC: 300,        // 5 minutes
  MATCH_ACCEPT_TIMEOUT_SEC: 30,         // 30 seconds to accept match
  SESSION_INACTIVITY_TIMEOUT_SEC: 1800, // 30 minutes
  
  // Session
  MIN_SESSION_DURATION_SEC: 60,         // 1 minute
  MAX_SESSION_DURATION_SEC: 1800,       // 30 minutes
  MESSAGE_RATE_LIMIT: 30,              // messages per minute
  
  // Scoring
  SCORE_DECAY_MINUTES: 60,              // Scores older than this get less weight
  MIN_MESSAGES_FOR_VALID_SESSION: 5,    // Minimum messages for "successful" session
  
  // Real-time
  TYPING_INDICATOR_TIMEOUT_MS: 3000,    // Hide typing after 3s
  MESSAGE_PAGINATION_LIMIT: 50,         // Messages per page
} as const;
```

---

*Document Version: 1.0*
*Last Updated: 2024-01-15*
