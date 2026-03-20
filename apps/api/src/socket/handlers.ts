import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  User,
  SocketUser,
  JoinLobbyPayload,
  SendMessagePayload,
  TypingIndicatorPayload,
  EndSessionPayload,
  ChatMessage,
  PracticeSession,
} from './types';
import { matchmakingService } from './matchmaking';

interface AuthenticatedSocket extends Socket {
  user?: User;
}

const connectedUsers: Map<string, SocketUser> = new Map();
const userSockets: Map<string, string> = new Map();
const activeSessions: Map<string, { user1: string; user2: string }> = new Map();

export function setupSocketHandlers(io: Server): void {
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
        userId: string;
        username: string;
        proficiencyLevel: string;
      };

      socket.user = {
        id: decoded.userId,
        username: decoded.username,
        proficiencyLevel: decoded.proficiencyLevel as User['proficiencyLevel'],
      };

      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) {
      socket.disconnect();
      return;
    }

    const socketUser: SocketUser = {
      userId: socket.user.id,
      username: socket.user.username,
      proficiencyLevel: socket.user.proficiencyLevel,
      socketId: socket.id,
      isSearching: false,
    };

    connectedUsers.set(socket.id, socketUser);
    userSockets.set(socket.user.id, socket.id);

    socket.emit('matchmaking_progress', `Connected as ${socket.user.username}`);

    socket.on('join_lobby', (payload: JoinLobbyPayload) => {
      handleJoinLobby(socket, payload, io);
    });

    socket.on('leave_lobby', () => {
      handleLeaveLobby(socket);
    });

    socket.on('start_session', (payload: { scenarioId: string }) => {
      handleStartSession(socket, payload, io);
    });

    socket.on('send_message', (payload: SendMessagePayload) => {
      handleSendMessage(socket, payload, io);
    });

    socket.on('typing_indicator', (payload: TypingIndicatorPayload) => {
      handleTypingIndicator(socket, payload, io);
    });

    socket.on('end_session', (payload: EndSessionPayload) => {
      handleEndSession(socket, payload, io);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket, io);
    });
  });
}

function handleJoinLobby(
  socket: AuthenticatedSocket,
  payload: JoinLobbyPayload,
  io: Server
): void {
  if (!socket.user) return;

  const socketUser = connectedUsers.get(socket.id);
  if (!socketUser) return;

  if (matchmakingService.isInQueue(socket.user.id)) {
    socket.emit('error', { message: 'Already in queue' });
    return;
  }

  socketUser.proficiencyLevel = payload.proficiencyLevel;
  socketUser.isSearching = true;
  connectedUsers.set(socket.id, socketUser);

  const match = matchmakingService.addToQueue(socketUser);

  if (match) {
    const partnerSocketId = userSockets.get(match.user2.id);
    const partnerSocket = partnerSocketId ? io.sockets.sockets.get(partnerSocketId) : null;

    if (partnerSocket) {
      const session = matchmakingService.createSession(
        socketUser,
        connectedUsers.get(partnerSocketId || '') || socketUser,
        match.scenarioId
      );

      activeSessions.set(session.id, {
        user1: socket.user.id,
        user2: match.user2.id,
      });

      socketUser.sessionId = session.id;
      socketUser.isSearching = false;
      connectedUsers.set(socket.id, socketUser);

      if (partnerSocketId) {
        const partnerUser = connectedUsers.get(partnerSocketId);
        if (partnerUser) {
          partnerUser.sessionId = session.id;
          partnerUser.isSearching = false;
          connectedUsers.set(partnerSocketId, partnerUser);
        }
      }

      const matchPayload = {
        sessionId: session.id,
        partner: match.user2,
        scenarioId: match.scenarioId,
        scenarioTitle: session.scenarioTitle,
      };

      socket.emit('match_found', matchPayload);
      partnerSocket.emit('match_found', {
        sessionId: session.id,
        partner: match.user1,
        scenarioId: match.scenarioId,
        scenarioTitle: session.scenarioTitle,
      });

      const practiceSession: PracticeSession = {
        id: session.id,
        user1Id: match.user1.id,
        user2Id: match.user2.id,
        scenarioId: match.scenarioId,
        scenarioTitle: session.scenarioTitle,
        startedAt: session.startedAt,
      };

      socket.emit('session_started', practiceSession);
      partnerSocket.emit('session_started', practiceSession);
    }
  } else {
    const position = matchmakingService.getQueuePosition(socket.user.id);
    socket.emit('matchmaking_progress', `Waiting for a partner... (Position: ${position})`);
  }
}

function handleLeaveLobby(socket: AuthenticatedSocket): void {
  if (!socket.user) return;

  matchmakingService.removeFromQueue(socket.user.id);

  const socketUser = connectedUsers.get(socket.id);
  if (socketUser) {
    socketUser.isSearching = false;
    connectedUsers.set(socket.id, socketUser);
  }

  socket.emit('matchmaking_progress', 'Left the lobby');
}

function handleStartSession(
  socket: AuthenticatedSocket,
  payload: { scenarioId: string },
  io: Server
): void {
  if (!socket.user) return;

  const socketUser = connectedUsers.get(socket.id);
  if (!socketUser || socketUser.isSearching) {
    socket.emit('error', { message: 'Not in a valid state to start session' });
    return;
  }

  const partnerSocketId = getPartnerSocketId(socket.user.id, socketUser.sessionId);
  if (!partnerSocketId) {
    socket.emit('error', { message: 'No partner found' });
    return;
  }

  const partnerSocket = io.sockets.sockets.get(partnerSocketId);
  if (!partnerSocket) {
    socket.emit('error', { message: 'Partner disconnected' });
    return;
  }

  const scenarios = matchmakingService.getAvailableScenarios();
  const scenario = scenarios.find(s => s.id === payload.scenarioId) || scenarios[0];

  const session = matchmakingService.createSession(socketUser, connectedUsers.get(partnerSocketId) || socketUser, scenario.id);

  activeSessions.set(session.id, {
    user1: socket.user.id,
    user2: connectedUsers.get(partnerSocketId)?.userId || '',
  });

  socketUser.sessionId = session.id;
  connectedUsers.set(socket.id, socketUser);

  const partnerUser = connectedUsers.get(partnerSocketId);
  if (partnerUser) {
    partnerUser.sessionId = session.id;
    connectedUsers.set(partnerSocketId, partnerUser);
  }

  const practiceSession: PracticeSession = {
    id: session.id,
    user1Id: socket.user.id,
    user2Id: partnerUser?.userId || '',
    scenarioId: scenario.id,
    scenarioTitle: session.scenarioTitle,
    startedAt: session.startedAt,
  };

  socket.emit('session_started', practiceSession);
  partnerSocket.emit('session_started', practiceSession);
}

function handleSendMessage(
  socket: AuthenticatedSocket,
  payload: SendMessagePayload,
  io: Server
): void {
  if (!socket.user) return;

  const socketUser = connectedUsers.get(socket.id);
  if (!socketUser || !socketUser.sessionId) {
    socket.emit('error', { message: 'Not in a session' });
    return;
  }

  const message: ChatMessage = {
    id: uuidv4(),
    sessionId: payload.sessionId,
    userId: socket.user.id,
    content: payload.content,
    timestamp: new Date(),
  };

  const partnerSocketId = getPartnerSocketId(socket.user.id, socketUser.sessionId);
  if (partnerSocketId) {
    const partnerSocket = io.sockets.sockets.get(partnerSocketId);
    if (partnerSocket) {
      partnerSocket.emit('receive_message', message);
    }
  }

  socket.emit('receive_message', message);
}

function handleTypingIndicator(
  socket: AuthenticatedSocket,
  payload: TypingIndicatorPayload,
  io: Server
): void {
  if (!socket.user) return;

  const socketUser = connectedUsers.get(socket.id);
  if (!socketUser || !socketUser.sessionId) {
    return;
  }

  const partnerSocketId = getPartnerSocketId(socket.user.id, socketUser.sessionId);
  if (partnerSocketId) {
    const partnerSocket = io.sockets.sockets.get(partnerSocketId);
    if (partnerSocket) {
      partnerSocket.emit('partner_typing', {
        userId: socket.user.id,
        isTyping: payload.isTyping,
      });
    }
  }
}

function handleEndSession(
  socket: AuthenticatedSocket,
  payload: EndSessionPayload,
  io: Server
): void {
  if (!socket.user) return;

  const socketUser = connectedUsers.get(socket.id);
  if (!socketUser || !socketUser.sessionId) {
    socket.emit('error', { message: 'Not in a session' });
    return;
  }

  const partnerSocketId = getPartnerSocketId(socket.user.id, socketUser.sessionId);

  if (partnerSocketId) {
    const partnerSocket = io.sockets.sockets.get(partnerSocketId);
    if (partnerSocket) {
      partnerSocket.emit('session_ended', payload);
    }

    const partnerUser = connectedUsers.get(partnerSocketId);
    if (partnerUser) {
      partnerUser.sessionId = undefined;
      connectedUsers.set(partnerSocketId, partnerUser);
    }
  }

  matchmakingService.endSession(socketUser.sessionId);
  activeSessions.delete(socketUser.sessionId);

  socketUser.sessionId = undefined;
  connectedUsers.set(socket.id, socketUser);

  socket.emit('session_ended', payload);
}

function handleDisconnect(socket: AuthenticatedSocket, io: Server): void {
  const socketUser = connectedUsers.get(socket.id);
  if (!socketUser) return;

  if (socketUser.isSearching) {
    matchmakingService.removeFromQueue(socketUser.userId);
  }

  if (socketUser.sessionId) {
    const partnerSocketId = getPartnerSocketId(socketUser.userId, socketUser.sessionId);

    if (partnerSocketId) {
      const partnerSocket = io.sockets.sockets.get(partnerSocketId);
      if (partnerSocket) {
        partnerSocket.emit('session_ended', {
          sessionId: socketUser.sessionId,
          reason: 'left',
        });
      }

      const partnerUser = connectedUsers.get(partnerSocketId);
      if (partnerUser) {
        partnerUser.sessionId = undefined;
        connectedUsers.set(partnerSocketId, partnerUser);
      }
    }

    matchmakingService.endSession(socketUser.sessionId);
    activeSessions.delete(socketUser.sessionId);
  }

  connectedUsers.delete(socket.id);
  userSockets.delete(socketUser.userId);
}

function getPartnerSocketId(userId: string, sessionId?: string): string | undefined {
  if (!sessionId) return undefined;

  const session = activeSessions.get(sessionId);
  if (!session) return undefined;

  const partnerId = session.user1 === userId ? session.user2 : session.user1;
  return userSockets.get(partnerId);
}

export { connectedUsers, userSockets, activeSessions };
