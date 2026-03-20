import { SocketUser, ProficiencyLevel, MatchedPair, PracticeSession } from './types';
import { v4 as uuidv4 } from 'uuid';

const PROFICIENCY_ORDER: ProficiencyLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const SCENARIOS = [
  { id: '1', title: 'At the Restaurant' },
  { id: '2', title: 'Asking for Directions' },
  { id: '3', title: 'Making a Phone Call' },
  { id: '4', title: 'Shopping at a Store' },
  { id: '5', title: 'Job Interview' },
  { id: '6', title: 'At the Hotel' },
  { id: '7', title: 'Travel Booking' },
  { id: '8', title: 'Meeting New People' },
  { id: '9', title: 'At the Doctor' },
  { id: '10', title: 'Banking Services' },
];

class MatchmakingService {
  private waitingUsers: Map<ProficiencyLevel, SocketUser[]> = new Map();
  private activeSessions: Map<string, PracticeSession> = new Map();

  constructor() {
    PROFICIENCY_ORDER.forEach(level => this.waitingUsers.set(level, []));
  }

  addToQueue(user: SocketUser): MatchedPair | null {
    const userLevel = user.proficiencyLevel;
    const waitingList = this.waitingUsers.get(userLevel) || [];

    const match = waitingList.find(
      waitingUser => waitingUser.userId !== user.userId
    );

    if (match) {
      const filteredList = waitingList.filter(
        waitingUser => waitingUser.userId !== user.userId
      );
      this.waitingUsers.set(userLevel, filteredList);

      const scenario = this.getRandomScenario();

      return {
        user1: {
          id: user.userId,
          username: user.username,
          proficiencyLevel: user.proficiencyLevel,
        },
        user2: {
          id: match.userId,
          username: match.username,
          proficiencyLevel: match.proficiencyLevel,
        },
        scenarioId: scenario.id,
      };
    }

    waitingList.push(user);
    this.waitingUsers.set(userLevel, waitingList);
    return null;
  }

  removeFromQueue(userId: string): void {
    for (const [level, users] of this.waitingUsers.entries()) {
      const filtered = users.filter(u => u.userId !== userId);
      if (filtered.length !== users.length) {
        this.waitingUsers.set(level, filtered);
        break;
      }
    }
  }

  getQueuePosition(userId: string): number {
    for (const [level, users] of this.waitingUsers.entries()) {
      const position = users.findIndex(u => u.userId === userId);
      if (position !== -1) {
        return position + 1;
      }
    }
    return -1;
  }

  isInQueue(userId: string): boolean {
    for (const users of this.waitingUsers.values()) {
      if (users.some(u => u.userId === userId)) {
        return true;
      }
    }
    return false;
  }

  createSession(user1: SocketUser, user2: SocketUser, scenarioId: string): PracticeSession {
    const scenario = SCENARIOS.find(s => s.id === scenarioId) || SCENARIOS[0];

    const session: PracticeSession = {
      id: uuidv4(),
      user1Id: user1.userId,
      user2Id: user2.userId,
      scenarioId,
      scenarioTitle: scenario.title,
      startedAt: new Date(),
    };

    this.activeSessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): PracticeSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  endSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  getWaitingCount(): number {
    let count = 0;
    for (const users of this.waitingUsers.values()) {
      count += users.length;
    }
    return count;
  }

  private getRandomScenario(): { id: string; title: string } {
    const randomIndex = Math.floor(Math.random() * SCENARIOS.length);
    return SCENARIOS[randomIndex];
  }

  getAvailableScenarios(): Array<{ id: string; title: string }> {
    return [...SCENARIOS];
  }
}

export const matchmakingService = new MatchmakingService();
