export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface User {
  id: string;
  username: string;
  proficiencyLevel: ProficiencyLevel;
}

export interface MatchedPair {
  user1: User;
  user2: User;
  scenarioId: string;
}

export interface PracticeSession {
  id: string;
  user1Id: string;
  user2Id: string;
  scenarioId: string;
  scenarioTitle: string;
  startedAt: Date;
}

export interface SocketUser {
  userId: string;
  username: string;
  proficiencyLevel: ProficiencyLevel;
  socketId: string;
  lobbyId?: string;
  sessionId?: string;
  isSearching: boolean;
}

export interface TypingStatus {
  userId: string;
  isTyping: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  timestamp: Date;
}

export interface LobbyUser {
  oders: SocketUser[];
}

export interface JoinLobbyPayload {
  proficiencyLevel: ProficiencyLevel;
}

export interface MatchFoundPayload {
  sessionId: string;
  partner: User;
  scenarioId: string;
  scenarioTitle: string;
}

export interface SendMessagePayload {
  sessionId: string;
  content: string;
}

export interface TypingIndicatorPayload {
  sessionId: string;
  isTyping: boolean;
}

export interface EndSessionPayload {
  sessionId: string;
  reason: 'completed' | 'left' | 'timeout';
}

export interface ServerToClientEvents {
  match_found: (payload: MatchFoundPayload) => void;
  session_started: (session: PracticeSession) => void;
  receive_message: (message: ChatMessage) => void;
  partner_typing: (status: TypingStatus) => void;
  session_ended: (payload: EndSessionPayload) => void;
  matchmaking_progress: (message: string) => void;
  error: (error: { message: string }) => void;
}

export interface ClientToServerEvents {
  join_lobby: (payload: JoinLobbyPayload) => void;
  leave_lobby: () => void;
  start_session: (payload: { scenarioId: string }) => void;
  send_message: (payload: SendMessagePayload) => void;
  typing_indicator: (payload: TypingIndicatorPayload) => void;
  end_session: (payload: EndSessionPayload) => void;
}

export interface SocketData {
  user: User;
}
