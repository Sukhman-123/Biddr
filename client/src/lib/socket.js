import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { tokenStorage } from './api'
import { config } from './config'

// Returns a singleton Socket.IO client connected to the backend.
// In production (Netlify + Render) the relative path `''` means the
// browser will use the current origin, and Netlify's redirect rule
// (`/socket.io/*` -> Render) forwards the upgrade + poll requests
// transparently with no CORS or port-juggling.
//
// In dev, Vite's proxy already handles `/socket.io` to localhost:5001
// (see client/vite.config.js), so the same empty string works.

let socket = null

function getSocket() {
  if (socket) return socket
  socket = io(config.socketBase || undefined, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: (cb) => {
      const token = tokenStorage.get()
      cb({ token: token || '' })
    },
  })
  return socket
}

// React hook that connects/disconnects on mount and tracks the
// connection state. We grab the singleton synchronously (it's a module
// variable, not a ref) so there's no need to read .current during render.
export function useSocket() {
  const [connected, setConnected] = useState(() => getSocket().connected)
  const s = getSocket()

  useEffect(() => {
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onConnectError = () => setConnected(false)

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('connect_error', onConnectError)

    // Sync immediately in case the singleton socket is already connected
    // before this hook subscribes to events.
    setConnected(s.connected)

    if (!s.connected) {
      s.connect()
    }

    return () => {
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
      s.off('connect_error', onConnectError)
      setConnected(false)
      s.disconnect()
    }
  }, [s])

  return { socket: s, connected }
}

export default getSocket
