import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server?: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emit(event: string, payload: any) {
    if (!this.server) return;
    this.server.emit(event, payload);
  }

  emitToRoom(room: string, event: string, payload: any) {
    if (!this.server) return;
    this.server.to(room).emit(event, payload);
  }
}
