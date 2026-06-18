const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.emit('auction:connected', {
      message: 'Connected to Biddr live auction server',
      socketId: socket.id,
    });

    socket.on('bid:place', (bid) => {
      io.emit('bid:placed', {
        ...bid,
        socketId: socket.id,
        placedAt: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = registerSocketHandlers;
