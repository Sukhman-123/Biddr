import { io, Socket } from 'socket.io-client';

import { environment } from '@/config/environment';
import { tokenStorage } from '@/services/auth/token-storage';

export async function createSocket(): Promise<Socket> {
  const token = await tokenStorage.get();

  return io(environment.socketUrl, {
    autoConnect: false,
    auth: token ? { token } : undefined,
    transports: ['websocket', 'polling'],
  });
}
