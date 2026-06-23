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

dotenv.config({ path: path.resolve(__dirname, '../config.env') });

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
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

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

registerSocketHandlers(io);

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Biddr API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Biddr API:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
