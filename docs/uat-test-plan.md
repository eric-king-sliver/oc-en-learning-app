# UAT Test Plan - English Learning App

## App Information
- **App Name**: English Learning
- **Package**: `com.englishlearning.app`
- **Version**: 1.0.0
- **Build**: Development Preview APK

---

## Test Environment Setup

### Prerequisites
1. Android device or emulator (Android 7.0+)
2. Install APK from EAS Build or local build

### Installation Methods

#### Option 1: EAS Build (Recommended)
```bash
# Login to EAS
eas login

# Build for Android
cd apps/mobile
eas build --platform android --profile preview --non-interactive

# Download APK from build URL
```

#### Option 2: Local Build
```bash
cd apps/mobile
npm install
eas build --platform android --local --profile preview
```

#### Option 3: Expo Go (Development)
```bash
cd apps/mobile
npx expo start
# Scan QR code with Expo Go app
```

---

## Test Scenarios

### Phase 1: Authentication

| Test ID | Feature | Test Case | Expected Result | Status |
|---------|---------|-----------|------------------|--------|
| AUTH-01 | Register | Register with valid email/password | Account created, verification email sent | ⬜ |
| AUTH-02 | Register | Register with existing email | Error: Email already registered | ⬜ |
| AUTH-03 | Register | Register with invalid email | Error: Invalid email format | ⬜ |
| AUTH-04 | Login | Login with correct credentials | Redirect to Home screen | ⬜ |
| AUTH-05 | Login | Login with wrong password | Error: Invalid credentials | ⬜ |
| AUTH-06 | Logout | Tap logout button | Redirect to Login screen | ⬜ |
| AUTH-07 | Password Reset | Request password reset | Success message, email sent | ⬜ |

### Phase 2: Core Learning

| Test ID | Feature | Test Case | Expected Result | Status |
|---------|---------|-----------|------------------|--------|
| CORE-01 | Home Screen | View personalized feed | Daily content displayed | ⬜ |
| CORE-02 | Scenario List | Browse scenarios by category | Filtered list displayed | ⬜ |
| CORE-03 | Scenario List | Search scenarios | Search results displayed | ⬜ |
| CORE-04 | Scenario Detail | View scenario info | Title, description, difficulty shown | ⬜ |
| CORE-05 | Practice Session | Start scenario | Player screen opens | ⬜ |
| CORE-06 | Practice Session | Complete dialogue turns | Progress tracked | ⬜ |
| CORE-07 | Practice Session | Record voice | Recording saved, score displayed | ⬜ |
| CORE-08 | Progress | View learning statistics | Stats displayed correctly | ⬜ |

### Phase 3: Video Content

| Test ID | Feature | Test Case | Expected Result | Status |
|---------|---------|-----------|------------------|--------|
| VIDEO-01 | Video List | Browse video library | Videos listed with thumbnails | ⬜ |
| VIDEO-02 | Video Player | Play video | Video plays with captions | ⬜ |
| VIDEO-03 | Video Player | Control playback | Pause/seek works | ⬜ |

### Phase 4: Chatbot

| Test ID | Feature | Test Case | Expected Result | Status |
|---------|---------|-----------|------------------|--------|
| CHAT-01 | Chat List | View conversation history | List displayed | ⬜ |
| CHAT-02 | New Chat | Start new conversation | Chat interface opens | ⬜ |
| CHAT-03 | Chat | Send message | AI responds | ⬜ |
| CHAT-04 | Chat | Delete conversation | Conversation removed | ⬜ |

### Phase 5: Social Features

| Test ID | Feature | Test Case | Expected Result | Status |
|---------|---------|-----------|------------------|--------|
| SOC-01 | Friends | View friends list | Friends displayed | ⬜ |
| SOC-02 | Friends | Send friend request | Request sent | ⬜ |
| SOC-03 | Friends | Accept friend request | Friend added | ⬜ |
| SOC-04 | Leaderboard | View top learners | Rankings displayed | ⬜ |
| SOC-05 | Share | Share progress | Post created | ⬜ |

### Phase 6: Live Practice

| Test ID | Feature | Test Case | Expected Result | Status |
|---------|---------|-----------|------------------|--------|
| LIVE-01 | Lobby | Enter live practice lobby | Lobby screen displayed | ⬜ |
| LIVE-02 | Matchmaking | Find practice partner | Match found notification | ⬜ |
| LIVE-03 | Session | Practice with partner | Session active | ⬜ |
| LIVE-04 | Session | Send message | Message delivered | ⬜ |
| LIVE-05 | Session | End session | Results displayed | ⬜ |

### Phase 7: Analytics

| Test ID | Feature | Test Case | Expected Result | Status |
|---------|---------|-----------|------------------|--------|
| ANAL-01 | Dashboard | View analytics overview | Stats cards displayed | ⬜ |
| ANAL-02 | Performance | View performance chart | Chart rendered | ⬜ |
| ANAL-03 | Strengths | View strengths analysis | Skills breakdown shown | ⬜ |
| ANAL-04 | Recommendations | View recommendations | Suggestions displayed | ⬜ |

### Phase 8: AR Scanner

| Test ID | Feature | Test Case | Expected Result | Status |
|---------|---------|-----------|------------------|--------|
| AR-01 | Camera | Open AR scanner | Camera view displayed | ⬜ |
| AR-02 | Scan | Scan real-world object | Vocabulary card appears | ⬜ |
| AR-03 | Vocabulary | View word details | Definition, examples shown | ⬜ |
| AR-04 | Audio | Play pronunciation | Audio plays | ⬜ |
| AR-05 | History | View scan history | History list displayed | ⬜ |

### Phase 9: Offline Mode

| Test ID | Feature | Test Case | Expected Result | Status |
|---------|---------|-----------|------------------|--------|
| OFF-01 | Download | Download scenario | Saved to device | ⬜ |
| OFF-02 | Download | Download video | Saved to device | ⬜ |
| OFF-03 | Offline | Practice offline | Content available | ⬜ |
| OFF-04 | Delete | Remove offline content | Storage freed | ⬜ |

---

## Bug Report Template

```markdown
## Bug Report

**Bug ID**: [AUTO]
**Date**: [DATE]
**Tester**: [NAME]
**Device**: [DEVICE MODEL]
**OS Version**: [ANDROID VERSION]

### Description
[Clear description of the bug]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Screenshots/Video
[Attach if available]

### Severity
- [ ] Critical - App crashes
- [ ] Major - Feature not working
- [ ] Minor - UI issue
- [ ] Trivial - Cosmetic

### Priority
- [ ] High - Fix immediately
- [ ] Medium - Fix in sprint
- [ ] Low - Fix when possible
```

---

## Test Summary

| Phase | Test Cases | Passed | Failed | Blocked |
|-------|------------|--------|--------|---------|
| Authentication | 7 | 0 | 0 | 0 |
| Core Learning | 8 | 0 | 0 | 0 |
| Video Content | 3 | 0 | 0 | 0 |
| Chatbot | 4 | 0 | 0 | 0 |
| Social Features | 5 | 0 | 0 | 0 |
| Live Practice | 5 | 0 | 0 | 0 |
| Analytics | 4 | 0 | 0 | 0 |
| AR Scanner | 5 | 0 | 0 | 0 |
| Offline Mode | 4 | 0 | 0 | 0 |
| **TOTAL** | **45** | **0** | **0** | **0** |

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| QA Lead | | | |
| Product Owner | | | |
