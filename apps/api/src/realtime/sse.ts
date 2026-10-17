import { Response } from 'express';
import { logger } from '../utils/logger';
import { Role } from '@prisma/client';

export interface SSEClient {
  id: string;
  userId: string;
  role: Role;
  res: Response;
  joinedRooms: Set<string>;
}

export class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private keepAliveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startKeepAlive();
  }

  private startKeepAlive(): void {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
    this.keepAliveTimer = setInterval(() => {
      for (const client of this.clients.values()) {
        try {
          client.res.write(': keepalive\n\n');
        } catch (err: any) {
          this.removeClient(client.id);
        }
      }
    }, 25000);
  }

  public registerClient(clientId: string, userId: string, role: Role, res: Response): SSEClient {
    // Set proper SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    res.flushHeaders?.();

    // Send initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

    const client: SSEClient = {
      id: clientId,
      userId,
      role,
      res,
      joinedRooms: new Set([`user:${userId}`]),
    };

    if (role === Role.ADMIN || role === Role.SUPER_ADMIN || role === Role.STAFF) {
      client.joinedRooms.add('staff_admin');
    }

    this.clients.set(clientId, client);
    logger.debug({ clientId, userId, role }, 'SSE client connected');

    return client;
  }

  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.res.end();
      } catch {}
      this.clients.delete(clientId);
      logger.debug({ clientId }, 'SSE client disconnected');
    }
  }

  public joinRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.joinedRooms.add(room);
    }
  }

  public leaveRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.joinedRooms.delete(room);
    }
  }

  public sendToUser(userId: string, event: string, data: any): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        try {
          client.res.write(payload);
        } catch (err) {
          this.removeClient(client.id);
        }
      }
    }
  }

  public sendToRoom(room: string, event: string, data: any): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients.values()) {
      if (client.joinedRooms.has(room)) {
        try {
          client.res.write(payload);
        } catch (err) {
          this.removeClient(client.id);
        }
      }
    }
  }

  public notifyStaffAndAdmin(event: string, data: any): void {
    this.sendToRoom('staff_admin', event, data);
  }

  public broadcast(event: string, data: any): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients.values()) {
      try {
        client.res.write(payload);
      } catch (err) {
        this.removeClient(client.id);
      }
    }
  }
}

export const sseManager = new SSEManager();
