const http = require('http');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const registerSocketHandlers = require('./socket');
const authRoutes = require('./routes/auth.routes');
const tournamentRoutes = require('./routes/tournament.routes');
const lotRoutes = require('./routes/lot.routes');
const userRoutes = require('./routes/user.routes');
const errorHandler = require('./middleware/error');

// Load env from the conventional `server/config.env` first (local dev),
// then fall back to Render's automatic environment variables. This lets
// the same code run locally (with config.env) and on Render (with the
// dashboard env vars) without any code changes.
dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const app = express();
const server = http.createServer(app);

// Render sets PORT automatically; for local dev we still default to 5001.
const PORT = process.env.PORT || 5001;

// CLIENT_URL may be a single origin or a comma-separated list. We always
// echo a known-good list back to the browser so local dev, a Netlify
// preview deploy, and the production biddr.app all work at once.
const ALLOWED_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

console.log('[boot] ALLOWED_ORIGINS =', JSON.stringify(ALLOWED_ORIGINS));

const corsOptions = {
  origin: (origin, cb) => {
    // Same-origin / curl / mobile requests have no Origin header → allow.
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'Biddr API',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/lots', lotRoutes);
app.use('/api/users', userRoutes);
app.use('/api/franchises', require('./routes/franchise.routes'));

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

// Socket.IO uses the same allowed-origin list as Express so live updates
// stay in sync without separate CORS configuration.
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

// Share `io` with REST controllers so they can broadcast room
// events (lot:activated, lot:hammered, lot:passed) using
// `req.app.get('io').to('tournament:<id>').emit(...)`. This is the
// standard Express + Socket.IO sharing pattern. See
// /Users/onehash/.claude/plans/spicy-greeting-hickey.md.
app.set('io', io);

registerSocketHandlers(io);

const startServer = async () => {
  try {
    // Print a one-line summary of which env vars are present before we
    // try to connect. This makes misconfiguration obvious in the Render
    // log without exposing secret values.
    console.log(
      '[boot] env check:',
      Object.entries({
        MONGO_URI: !!process.env.MONGO_URI,
        JWT_SECRET: !!process.env.JWT_SECRET,
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        CLIENT_URL: process.env.CLIENT_URL || '(unset)',
        RESEND_API_KEY: !!process.env.RESEND_API_KEY,
        RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || '(default)',
      })
        .map(([k, v]) => `${k}=${v === true ? 'yes' : v}`)
        .join(' '),
    );

    await connectDB();

    server.listen(PORT, () => {
      // Log only the configured port; the host name is irrelevant because
      // Render (and most PaaS hosts) bind to 0.0.0.0 internally.
      console.log(`Biddr API listening on port ${PORT}`);
      console.log(`CORS origins: ${ALLOWED_ORIGINS.join(', ') || '(none)'}`);
    });
  } catch (error) {
    // Use console.log (not error) so Render's log tail shows the line —
    // some Render log views filter stderr but always show stdout.
    console.log('Failed to start Biddr API:', error.message);
    if (error.stack) console.log(error.stack);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

// Export both the Express app (for supertest) and the http.Server
// (for the Render shim, which calls `server.listen()` so socket.io
// is attached to the same listener).
module.exports = app;
module.exports.httpServer = server;
