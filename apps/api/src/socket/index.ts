import { Server } from 'socket.io';
import { setupSocketHandlers } from './handlers';

export type IOServer = Server;

export function initializeSocket(io: IOServer): IOServer {
  setupSocketHandlers(io);

  return io;
}

export { setupSocketHandlers } from './handlers';
export { matchmakingService } from './matchmaking';
export * from './types';
