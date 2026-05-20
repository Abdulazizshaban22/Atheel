import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: '*', credentials: true },
})
export class ExecutionsGateway {
  @WebSocketServer() server!: Server;

  constructor(private readonly realtime: RealtimeService) {}

  afterInit(server: Server) {
    this.realtime.setServer(server);
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() socket: Socket, @MessageBody() body: { room?: string }) {
    if (body?.room) {
      socket.join(body.room);
      return { ok: true, joined: body.room };
    }
    return { ok: true };
  }
}
