# AR Vocabulary Scanner - Architecture Document

## Overview

The **AR Vocabulary Scanner** feature enables users to scan real-world objects using their mobile device camera and instantly receive English vocabulary information including the object name, pronunciation, definition, and example sentences. This feature combines computer vision (object detection) with language learning to provide an immersive vocabulary acquisition experience.

---

## Table of Contents

1. [Prisma Database Models](#1-prisma-database-models)
2. [API Endpoints](#2-api-endpoints)
3. [Mobile Screen Architecture](#3-mobile-screen-architecture)
4. [Object Detection Data Flow](#4-object-detection-data-flow)
5. [UX Flow for Scanning and Learning](#5-ux-flow-for-scanning-and-learning)

---

## 1. Prisma Database Models

The following models are already defined in the database schema to support the AR Vocabulary Scanner feature.

### 1.1 Enum: AR_OBJECT_CATEGORY

```prisma
enum AR_OBJECT_CATEGORY {
  animal
  food
  vehicle
  furniture
  nature
  household
  clothing
  electronics
  body_parts
  colors
  shapes
  numbers
}
```

### 1.2 Model: ARObject

Represents a scannable real-world object with its English vocabulary associations.

```prisma
model ARObject {
  // Core Identification
  id          String            @id @default(uuid())
  
  // Object Information
  objectName  String            @map("object_name")           // English name (e.g., "apple", "chair")
  category    AR_OBJECT_CATEGORY                               // Categorization for filtering
  imageUrl    String?           @map("image_url")             // Reference image for ML training
  difficulty  CEFR_LEVEL                                        // CEFR level for vocabulary difficulty
  
  // Timestamps
  createdAt   DateTime          @default(now()) @map("created_at")
  
  // Relations
  vocabularyItems VocabularyItem[]                                 // Words associated with this object
  scannedObjects  ScannedObject[]                                 // User scan records
  scanHistories   ScanHistory[]                                  // Scan history entries
  
  // Indexes
  @@index([category])
  @@index([difficulty])
  @@map("ar_objects")
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key, auto-generated |
| objectName | String | English name of the object (lowercase, e.g., "apple") |
| category | AR_OBJECT_CATEGORY | Classification enum for filtering |
| imageUrl | String? | Optional URL to reference image for ML model |
| difficulty | CEFR_LEVEL | CEFR proficiency level (A1-C2) for vocabulary |
| createdAt | DateTime | Record creation timestamp |

### 1.3 Model: VocabularyItem

Represents a vocabulary word associated with a scanned object, including pronunciation and example usage.

```prisma
model VocabularyItem {
  // Core Identification
  id              String   @id @default(uuid())
  
  // Object Relationship
  objectId        String   @map("object_id")
  object          ARObject @relation(fields: [objectId], references: [id], onDelete: Cascade)
  
  // Word Information
  word            String                                          // The vocabulary word (e.g., "apple")
  phonetic        String?                                         // IPA pronunciation (e.g., "/ˈæp.əl/")
  partOfSpeech    String?  @map("part_of_speech")                 // noun, verb, adjective, etc.
  definition      String                                          // English definition
  
  // Learning Content
  exampleSentence String?  @map("example_sentence")               // Example usage in a sentence
  audioUrl        String?  @map("audio_url")                      // Audio pronunciation URL
  
  // Metadata
  difficulty      CEFR_LEVEL                                      // CEFR level for this word
  
  // Timestamps
  createdAt       DateTime @default(now()) @map("created_at")
  
  // Relations
  scanHistories ScanHistory[]                                     // Scan history referencing this word
  
  // Indexes
  @@index([word])
  @@index([difficulty])
  @@map("vocabulary_items")
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key, auto-generated |
| objectId | UUID | Foreign key to ARObject |
| word | String | The vocabulary word in lowercase |
| phonetic | String? | IPA phonetic notation for pronunciation |
| partOfSpeech | String? | Grammatical category (noun, verb, adjective, etc.) |
| definition | String | Clear English definition of the word |
| exampleSentence | String? | Example sentence showing word usage |
| audioUrl | String? | URL to audio file for pronunciation |
| difficulty | CEFR_LEVEL | CEFR level (A1-C2) indicating word complexity |
| createdAt | DateTime | Record creation timestamp |

### 1.4 Model: ScannedObject

Tracks which objects a user has scanned and how many times.

```prisma
model ScannedObject {
  // Core Identification
  id          String   @id @default(uuid())
  
  // User Relationship
  userId      String   @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Object Relationship
  objectId    String   @map("object_id")
  object      ARObject @relation(fields: [objectId], references: [id], onDelete: Cascade)
  
  // Scan Tracking
  scannedAt   DateTime @default(now()) @map("scanned_at")
  timesScanned Int     @default(1) @map("times_scanned")         // Count of times user scanned this object
  
  // Constraints
  @@unique([userId, objectId])                                    // One record per user-object pair
  @@index([userId])
  @@index([objectId])
  @@map("scanned_objects")
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key, auto-generated |
| userId | UUID | Foreign key to User |
| objectId | UUID | Foreign key to ARObject |
| scannedAt | DateTime | First scan timestamp |
| timesScanned | Integer | Number of times user has scanned this object |

### 1.5 Model: ScanHistory

Maintains a complete history of all scan events for analytics and review.

```prisma
model ScanHistory {
  // Core Identification
  id               String      @id @default(uuid())
  
  // User Relationship
  userId           String      @map("user_id")
  user             User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Object Relationship
  objectId         String      @map("object_id")
  object           ARObject    @relation(fields: [objectId], references: [id], onDelete: Cascade)
  
  // Vocabulary Relationship (optional - specific word user focused on)
  vocabularyItemId String?     @map("vocabulary_item_id")
  vocabularyItem   VocabularyItem? @relation(fields: [vocabularyItemId], references: [id])
  
  // Timestamp
  scannedAt        DateTime    @default(now()) @map("scanned_at")
  
  // Indexes for Query Performance
  @@index([userId])
  @@index([objectId])
  @@index([vocabularyItemId])
  @@index([scannedAt])
  @@map("scan_history")
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key, auto-generated |
| userId | UUID | Foreign key to User |
| objectId | UUID | Foreign key to ARObject |
| vocabularyItemId | UUID? | Optional foreign key to VocabularyItem (if user focused on specific word) |
| scannedAt | DateTime | Timestamp of the scan event |

### 1.6 User Model Relations

The existing User model includes relations to AR Scanner models:

```prisma
// In User model
// AR Scanner Relations
scannedObjects       ScannedObject[]
scanHistories        ScanHistory[]
```

---

## 2. API Endpoints

The following REST API endpoints are implemented for the AR Vocabulary Scanner feature.

### 2.1 Object Management

#### GET /api/v1/ar/objects

Retrieves a list of AR objects with optional filtering.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | enum | No | Filter by AR_OBJECT_CATEGORY |
| difficulty | string | No | Filter by CEFR level (e.g., "A1", "B2") |
| search | string | No | Search by object name (case-insensitive) |
| limit | number | No | Number of results (default: 50, max: 100) |
| offset | number | No | Pagination offset (default: 0) |

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "objectName": "apple",
      "category": "food",
      "imageUrl": "https://...",
      "difficulty": "A1",
      "vocabularyItems": [
        {
          "id": "uuid",
          "word": "apple",
          "phonetic": "/ˈæp.əl/",
          "partOfSpeech": "noun",
          "definition": "a round fruit with red or green skin",
          "difficulty": "A1"
        }
      ]
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

#### GET /api/v1/ar/objects/:id

Retrieves a single AR object with all its vocabulary items.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | The AR object ID |

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "objectName": "apple",
    "category": "food",
    "imageUrl": "https://...",
    "difficulty": "A1",
    "createdAt": "2024-01-01T00:00:00Z",
    "vocabularyItems": [
      {
        "id": "uuid",
        "word": "apple",
        "phonetic": "/ˈæp.əl/",
        "partOfSpeech": "noun",
        "definition": "a round fruit with red or green skin",
        "exampleSentence": "I ate an apple for breakfast.",
        "audioUrl": "https://...",
        "difficulty": "A1",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 2.2 Vocabulary Lookup

#### GET /api/v1/ar/vocabulary/:word

Searches for vocabulary items by word (partial match, case-insensitive).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| word | string | The word to search for |

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "word": "apple",
      "phonetic": "/ˈæp.əl/",
      "partOfSpeech": "noun",
      "definition": "a round fruit with red or green skin",
      "exampleSentence": "I ate an apple for breakfast.",
      "audioUrl": "https://...",
      "difficulty": "A1",
      "object": {
        "id": "uuid",
        "objectName": "apple",
        "category": "food",
        "imageUrl": "https://..."
      }
    }
  ]
}
```

### 2.3 Scan Operations

#### POST /api/v1/ar/scan

Records a scan event when user scans an object (requires authentication).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| objectId | UUID | Yes | The ID of the scanned AR object |
| vocabularyItemId | UUID | No | Specific vocabulary item user focused on |

**Response:**
```json
{
  "status": "success",
  "data": {
    "scannedObject": {
      "id": "uuid",
      "userId": "uuid",
      "objectId": "uuid",
      "scannedAt": "2024-01-01T00:00:00Z",
      "timesScanned": 3
    },
    "scanHistory": {
      "id": "uuid",
      "userId": "uuid",
      "objectId": "uuid",
      "vocabularyItemId": "uuid",
      "scannedAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 2.4 Scan History

#### GET /api/v1/ar/history

Retrieves user's scan history (requires authentication).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Number of results (default: 20, max: 100) |
| offset | number | No | Pagination offset (default: 0) |

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "object": {
        "id": "uuid",
        "objectName": "apple",
        "category": "food",
        "imageUrl": "https://..."
      },
      "vocabularyItem": {
        "id": "uuid",
        "word": "apple",
        "definition": "a round fruit with red or green skin"
      },
      "scannedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

### 2.5 Categories

#### GET /api/v1/ar/categories

Returns all available AR object categories.

**Response:**
```json
{
  "status": "success",
  "data": [
    { "value": "animal", "label": "Animal" },
    { "value": "food", "label": "Food" },
    { "value": "vehicle", "label": "Vehicle" },
    { "value": "furniture", "label": "Furniture" },
    { "value": "nature", "label": "Nature" },
    { "value": "household", "label": "Household" },
    { "value": "clothing", "label": "Clothing" },
    { "value": "electronics", "label": "Electronics" },
    { "value": "body_parts", "label": "Body Parts" },
    { "value": "colors", "label": "Colors" },
    { "value": "shapes", "label": "Shapes" },
    { "value": "numbers", "label": "Numbers" }
  ]
}
```

### 2.6 API Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/ar/objects | No | List AR objects with filtering |
| GET | /api/v1/ar/objects/:id | No | Get single object with vocabulary |
| GET | /api/v1/ar/vocabulary/:word | No | Search vocabulary by word |
| POST | /api/v1/ar/scan | Yes | Record scan event |
| GET | /api/v1/ar/history | Yes | Get user's scan history |
| GET | /api/v1/ar/categories | No | Get all categories |

---

## 3. Mobile Screen Architecture

### 3.1 Screen: ARScannerScreen

The main camera-based AR scanning screen using expo-camera.

**Location:** `apps/mobile/src/screens/ARScannerScreen.tsx`

**Navigation:** Stack screen accessible from Home or Learn tab

**Dependencies Required:**
- `expo-camera` - Camera access and preview
- `@tensorflow-models/coco-ssd` or similar ML model - Object detection

**Component Structure:**

```typescript
// Proposed component structure for ARScannerScreen
interface ARScannerScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

// State management
interface ScannerState {
  isScanning: boolean;
  detectedObject: DetectedObject | null;
  vocabularyData: VocabularyItem[] | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean | null;
}

// Main component flow
export function ARScannerScreen({ navigation }: ARScannerScreenProps) {
  // Camera reference
  const cameraRef = useRef<Camera>(null);
  
  // State
  const [isScanning, setIsScanning] = useState(false);
  const [detectedObject, setDetectedObject] = useState<DetectedObject | null>(null);
  const [vocabularyData, setVocabularyData] = useState<VocabularyItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Permission handling
  useEffect(() => {
    requestCameraPermission();
  }, []);
  
  // ML object detection
  const runObjectDetection = async (imageData: string) => {
    // Run ML model on camera frame
    // Return detected object class
  };
  
  // API call to lookup vocabulary
  const lookupVocabulary = async (detectedLabel: string) => {
    // Call GET /api/v1/ar/vocabulary/:word
    // Set vocabularyData state
  };
  
  // Record scan event
  const recordScan = async (objectId: string, vocabularyItemId?: string) => {
    // Call POST /api/v1/ar/scan
  };
  
  // Render camera view
  // Render overlay with detected object info
  // Render vocabulary card when object found
  
  return (
    <View style={styles.container}>
      <CameraView ... />
      {detectedObject && (
        <VocabularyOverlay
          object={detectedObject}
          vocabulary={vocabularyData}
          onWordSelect={recordScan}
        />
      )}
    </View>
  );
}
```

### 3.2 Vocabulary Card Component

**Location:** `apps/mobile/src/components/VocabularyCard.tsx`

**Props:**

```typescript
interface VocabularyCardProps {
  vocabulary: VocabularyItem;
  objectName: string;
  objectImageUrl?: string;
  onPronunciationPress?: () => void;
  onExamplePlay?: () => void;
  onSaveToList?: () => void;
}

interface VocabularyItem {
  id: string;
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  exampleSentence?: string;
  audioUrl?: string;
  difficulty: string;
}
```

**UI Elements:**

1. **Object Header**
   - Object image (if available)
   - Object name (large, bold)
   - Category badge

2. **Word Information**
   - Word (large text)
   - Phonetic pronunciation
   - Part of speech badge

3. **Definition Section**
   - Clear definition text

4. **Example Sentence**
   - Example usage in context
   - Play audio button

5. **Audio Controls**
   - Pronunciation play button
   - Example sentence play button

6. **Actions**
   - Save to vocabulary list
   - Start learning session

### 3.3 Screen: ScanHistoryScreen

**Location:** `apps/mobile/src/screens/ScanHistoryScreen.tsx`

**Purpose:** Display user's scan history for review

**Features:**
- List of previously scanned objects
- Search/filter by date, category
- Tap to revisit vocabulary
- Progress statistics

### 3.4 Screen: VocabularyListScreen

**Location:** `apps/mobile/src/screens/VocabularyListScreen.tsx`

**Purpose:** View all saved vocabulary from scans

**Features:**
- Grid/list view of saved words
- Sort by date, difficulty, category
- Study mode with flashcards
- Export/backup functionality

### 3.5 Navigation Integration

Add to `AppNavigator.tsx`:

```typescript
// Add to Stack.Navigator
<Stack.Screen
  name="ARScanner"
  component={ARScannerScreen}
  options={{ 
    headerShown: true, 
    title: 'Scan Object',
    headerTransparent: true 
  }}
/>

<Stack.Screen
  name="ScanHistory"
  component={ScanHistoryScreen}
  options={{ headerShown: true, title: 'Scan History' }}
/>

<Stack.Screen
  name="VocabularyList"
  component={VocabularyListScreen}
  options={{ headerShown: true, title: 'My Vocabulary' }}
/>

// Add to bottom tab (optional - new tab for AR features)
<Tab.Screen
  name="ARScanner"
  component={ARScannerScreen}
  options={{ 
    title: 'AR Scan', 
    tabBarIcon: ({ focused }) => <TabIcon name="ARScanner" focused={focused} /> 
  }}
/>
```

### 3.6 Required npm Packages

Add to `apps/mobile/package.json`:

```json
{
  "dependencies": {
    "expo-camera": "~14.0.0",
    "@tensorflow/tfjs": "^4.17.0",
    "@tensorflow-models/coco-ssd": "^2.2.3",
    "@react-native-async-storage/async-storage": "^1.21.0"
  }
}
```

---

## 4. Object Detection Data Flow

### 4.1 High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   ML Service    │    │   Backend API   │
│  (React Native)  │    │  (On-device ML) │    │   (Express)     │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                       │                       │
         │  1. Camera Frame      │                       │
         │─────────────────────>│                       │
         │                       │                       │
         │  2. Detected Object  │                       │
         │<─────────────────────│                       │
         │    (label + bbox)    │                       │
         │                       │                       │
         │  3. Lookup Word       │                       │
         │───────────────────────────────────────────────>│
         │                       │                       │
         │  4. Vocabulary Data   │                       │
         │<───────────────────────────────────────────────│
         │                       │                       │
         │  5. Record Scan       │                       │
         │───────────────────────────────────────────────>│
         │                       │                       │
         │  6. Scan Confirmed   │                       │
         │<───────────────────────────────────────────────│
         │                       │                       │
         ▼                       ▼                       ▼
```

### 4.2 Step-by-Step Flow

#### Step 1: Camera Frame Capture

```
Mobile App:
- Camera renders live preview via expo-camera
- Every N frames (e.g., every 500ms or every 10th frame):
  - Capture current frame as base64 or blob
  - Resize to ML model input size (typically 300x300 or 640x640)
  - Pass to object detection model
```

#### Step 2: Object Detection (On-Device ML)

```
ML Model (e.g., COCO-SSD):
- Input: Camera frame image
- Process: Run inference using TensorFlow.js
- Output: Array of detected objects
  [
    {
      bbox: [x, y, width, height],  // Bounding box
      class: "person",               // Detected class label
      score: 0.95                    // Confidence score
    },
    {
      bbox: [x, y, width, height],
      class: "cup",
      score: 0.87
    }
  ]
```

**Supported Object Classes (COCO-SSD):**
- Common objects: person, bicycle, car, motorcycle, airplane, bus, train, truck, boat, traffic light, fire hydrant, stop sign, parking meter, bench, bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe, backpack, umbrella, handbag, tie, suitcase, frisbee, skis, snowboard, sports ball, kite, baseball bat, baseball glove, skateboard, surfboard, tennis racket, bottle, wine glass, cup, fork, knife, spoon, bowl, banana, apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake, chair, couch, potted plant, bed, dining table, toilet, tv, laptop, mouse, remote, keyboard, cell phone, microwave, oven, toaster, sink, refrigerator, book, clock, vase, scissors, teddy bear, hair drier, toothbrush

#### Step 3: Vocabulary Lookup API Call

```
Mobile App:
- Extract top detected object (highest confidence, > threshold)
- Map detected class to vocabulary word:
  - "apple" → "apple"
  - "chair" → "chair"
  - "person" → (skip or map to "person")
- Call API: GET /api/v1/ar/vocabulary/:word

API Response:
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "word": "apple",
      "phonetic": "/ˈæp.əl/",
      "partOfSpeech": "noun",
      "definition": "a round fruit with red or green skin",
      "exampleSentence": "I ate an apple for breakfast.",
      "audioUrl": "https://...",
      "difficulty": "A1",
      "object": { ... }
    }
  ]
}
```

#### Step 4: Display Vocabulary Card

```
Mobile App:
- Parse API response
- Display VocabularyCard overlay on camera view:
  - Show word, phonetic, definition
  - Show example sentence with audio
  - Show "Save" and "Learn More" buttons
- Animate card appearance
```

#### Step 5: Record Scan Event (Optional)

```
When user taps on vocabulary word or "Save":
- Call API: POST /api/v1/ar/scan
  Body: {
    objectId: "uuid",
    vocabularyItemId: "uuid"
  }

API:
- Upsert ScannedObject (increment timesScanned if exists)
- Create ScanHistory entry
- Return success

Mobile App:
- Show "Saved!" confirmation
- Update local state
```

### 4.3 Detection Parameters

```typescript
// Recommended configuration
const DETECTION_CONFIG = {
  // Frame sampling
  scanIntervalMs: 500,              // Run detection every 500ms
  framesToSkip: 10,                 // Or every N frames
  
  // Confidence thresholds
  minConfidence: 0.7,               // Minimum confidence to accept detection
  maxDetections: 3,                 // Maximum objects to detect per frame
  
  // Object mapping
  classToWordMap: {                  // Map COCO classes to vocabulary words
    "apple": "apple",
    "book": "book",
    "chair": "chair",
    // ... additional mappings
  },
  
  // Debouncing
  stableDetectionMs: 1000,          // Require stable detection for N ms
  cooldownMs: 2000,                // Cooldown after successful lookup
};
```

### 4.4 Error Handling

| Error Case | Handling |
|------------|----------|
| Camera permission denied | Show permission request screen with settings link |
| No object detected | Continue scanning, show subtle "Point at an object" hint |
| Low confidence detection | Ignore, wait for better detection |
| API lookup fails | Show error toast, allow retry |
| No vocabulary found | Show "Unknown object" message with manual search option |
| Network offline | Cache last results, queue scan for later |

---

## 5. UX Flow for Scanning and Learning

### 5.1 Main User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AR VOCABULARY SCANNER                            │
│                              User Journey Map                                │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │  User Opens App  │
                              │  Navigates to    │
                              │  AR Scanner Tab  │
                              └────────┬─────────┘
                                       │
                                       ▼
                         ┌────────────────────────┐
                         │  Permission Check      │
                         │  ┌──────────────────┐  │
                         │  │ Has Permission?  │──┼──Yes──┌─────────────┐
                         │  └──────────────────┘  │        │             │
                         │         │ No           │        ▼             │
                         │         ▼              │  ┌───────────┐     │
                         │  ┌───────────────┐      │  │ Camera    │     │
                         │  │ Show Permission│     │  │ Preview   │     │
                         │  │ Request UI    │      │  │ Active    │     │
                         │  └───────┬───────┘      │  └─────┬─────┘     │
                         │          │              │        │           │
                         │    User Grants         │        ▼           │
                         │    Permission          │  ┌─────────────┐  │
                         └──────────┬─────────────┘  │ ML Model    │  │
                                    │                │ Running     │  │
                                    └───────────────>│ Continuously│  │
                                                     └──────┬──────┘  │
                                                            │           │
                                                            ▼           │
                                                     ┌─────────────┐  │
                                                     │ Object      │  │
                                                     │ Detected?   │──┼──No──┐
                                                     └──────┬──────┘       │
                                                            │ Yes          │
                                                            ▼              │
                                                     ┌─────────────┐  │
                                                     │ API Lookup  │  │
                                                     │ (vocabulary)│  │
                                                     └──────┬──────┘  │
                                                            │           │
                                                            ▼           │
                                                     ┌─────────────┐  │
                                                     │ Show        │  │
                                                     │ Vocabulary  │  │
                                                     │ Card        │  │
                                                     └──────┬──────┘  │
                                                            │           │
                                          ┌───────────────┼───────────┐│
                                          │               ▼           ││
                                          │  ┌─────────────────────┐  ││
                                          │  │ User Actions:       │  ││
                                          │  │ • Listen Pronounce  │  ││
                                          │  │ • View Definition   │  ││
                                          │  │ • Read Example      │  ││
                                          │  │ • Save to List      │  ││
                                          │  │ • Continue Scanning │  ││
                                          │  └─────────────────────┘  ││
                                          │                           ││
                                          └───────────────────────────┘│
                                                                            │
                                                                            ▼
                                                     ┌─────────────────────┐
                                                     │  User can:          │
                                                     │  • Scan more objects│
                                                     │  • View scan history│
                                                     │  • Review saved     │
                                                     │    vocabulary       │
                                                     └─────────────────────┘
```

### 5.2 Screen-by-Screen UX

#### Screen 1: AR Scanner (Initial State)

**Layout:**
- Full-screen camera preview
- Semi-transparent top bar with:
  - Back button (left)
  - Title "Scan Object" (center)
  - Settings gear icon (right)
- Bottom overlay with:
  - Hint text: "Point your camera at any object"
  - Circular scan indicator (animated)
- Floating category filter chips (horizontal scroll)

**States:**
- `permission-pending`: Show permission request UI
- `permission-denied`: Show settings redirect UI
- `scanning`: Live camera with ML overlay
- `object-detected`: Camera with vocabulary card overlay
- `loading`: Spinner while API call in progress
- `error`: Error message with retry button

#### Screen 2: Vocabulary Card (Overlay)

**Layout:**
- Bottom sheet / card (slides up from bottom)
- Rounded corners, white background
- Drag handle at top
- Max height: 60% of screen

**Content:**
```
┌────────────────────────────────────┐
│  ≡                                │  <- Drag handle
├────────────────────────────────────┤
│  🍎  Apple                    A1   │  <- Object name, CEFR badge
│      /ˈæp.əl/              noun   │  <- Phonetic, part of speech
├────────────────────────────────────┤
│  Definition:                       │
│  A round fruit with red or green   │
│  skin and white flesh.            │
├────────────────────────────────────┤
│  Example:                          │
│  "I ate an apple for breakfast."  │
│                           🔊 ▶    │  <- Play audio button
├────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────────┐ │
│  │   Save   │  │  Listen Again  │ │
│  │    ★     │  │      🔊       │ │
│  └──────────┘  └─────────────────┘ │
└────────────────────────────────────┘
```

**Interactions:**
- Swipe down to dismiss
- Tap "Save" to add to vocabulary list (triggers POST /scan)
- Tap speaker icon to play pronunciation
- Tap example sentence speaker to play example
- Tap "Listen Again" to replay both

#### Screen 3: Scan History

**Layout:**
- Standard list view with headers
- Each item shows:
  - Object thumbnail/icon
  - Object name
  - Vocabulary words found
  - Scan date
  - Times scanned badge

**Features:**
- Pull to refresh
- Filter by category
- Search by object name
- Delete individual entries (swipe)
- "Clear All" option in header

#### Screen 4: My Vocabulary

**Layout:**
- Grid or list toggle
- Each card shows:
  - Word (large)
  - Phonetic
  - Definition preview
  - Category badge

**Features:**
- Sort by: Date Added, Alphabetical, Difficulty
- Filter by: Category, Difficulty
- Study mode (flashcards)
- Search functionality

### 5.3 Micro-Interactions and Feedback

| Action | Feedback |
|--------|----------|
| Object detected | Subtle haptic vibration + bounding box highlight |
| Vocabulary loaded | Card slides up with spring animation |
| Save clicked | Button transforms to "Saved ✓" with checkmark |
| Audio playing | Speaker icon pulses/animate |
| Network error | Toast notification with retry option |
| No object found | Hint text appears briefly, then fades |
| Low confidence | "Trying to identify..." indicator |

### 5.4 Accessibility Considerations

- **VoiceOver/TalkBack:** All UI elements have proper labels
- **Reduced Motion:** Disable animations for users who prefer reduced motion
- **Text Scaling:** Support dynamic type scaling
- **High Contrast:** Ensure text is readable in all lighting conditions
- **Audio Descriptions:** Provide audio feedback for all interactions

---

## Appendix: Data Models Summary

### Complete VocabularyItem Structure

```typescript
interface VocabularyItem {
  id: string;
  objectId: string;
  word: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  definition: string;
  exampleSentence: string | null;
  audioUrl: string | null;
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  createdAt: string;
}

interface ARObject {
  id: string;
  objectName: string;
  category: AR_OBJECT_CATEGORY;
  imageUrl: string | null;
  difficulty: CEFR_LEVEL;
  createdAt: string;
  vocabularyItems: VocabularyItem[];
}

interface ScanHistoryItem {
  id: string;
  object: {
    id: string;
    objectName: string;
    category: AR_OBJECT_CATEGORY;
    imageUrl: string | null;
  };
  vocabularyItem: {
    id: string;
    word: string;
    definition: string;
  } | null;
  scannedAt: string;
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial architecture document |

---

*Document generated for AR Vocabulary Scanner feature implementation.*
