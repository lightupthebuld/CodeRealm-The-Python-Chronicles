// Socket.IO game event handlers

const rooms = {};

module.exports = function (io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a game room
    socket.on('join-room', (data) => {
      // For lobby data could be { roomCode, username, isHost }
      const roomCode = data.roomCode || data;
      const username = data.username || 'Anonymous';
      const isHost = data.isHost || false;
      
      socket.join(roomCode);
      
      // Initialize room if it doesn't exist
      if (!rooms[roomCode]) {
        rooms[roomCode] = { players: [], currentTurnIndex: 0, boss: { hp: 100 } };
      }
      
      // Store user info in the socket for disconnect handling
      socket.roomCode = roomCode;
      socket.username = username;
      
      // Add player to the room tracking (avoid duplicates if they reconnect)
      const existingPlayer = rooms[roomCode].players.find(p => p.username === username);
      if (!existingPlayer) {
        rooms[roomCode].players.push({ id: socket.id, username, isReady: isHost, isHost, score: 0, hp: 100 });
      } else {
        existingPlayer.id = socket.id; // Update socket id
      }
      
      console.log(`Socket ${socket.id} (${username}) joined room ${roomCode}`);
      
      // Broadcast updated player list to everyone in the room
      io.to(roomCode).emit('update-player-list', rooms[roomCode].players);
    });

    // Player ready
    socket.on('player-ready', (data) => {
      const roomCode = data.roomCode;
      const username = data.username;
      
      if (rooms[roomCode]) {
        const player = rooms[roomCode].players.find(p => p.username === username);
        if (player) {
          player.isReady = true;
          io.to(roomCode).emit('update-player-list', rooms[roomCode].players);
        }
      }
    });

    // Player cancel ready
    socket.on('player-unready', (data) => {
      const roomCode = data.roomCode;
      const username = data.username;
      
      if (rooms[roomCode]) {
        const player = rooms[roomCode].players.find(p => p.username === username);
        if (player && !player.isHost) {
          player.isReady = false;
          io.to(roomCode).emit('update-player-list', rooms[roomCode].players);
        }
      }
    });

    // Game start
    socket.on('game-start', (data) => {
      if (rooms[data.roomCode]) {
        rooms[data.roomCode].currentTurnIndex = 0; // Initialize turn
        io.to(data.roomCode).emit('game-start', data);
      }
    });

    // Get current game state (called by play.ejs on load)
    socket.on('get-game-state', (roomCode) => {
      if (rooms[roomCode]) {
        socket.emit('game-state-sync', {
          players: rooms[roomCode].players,
          currentTurnIndex: rooms[roomCode].currentTurnIndex,
          boss: rooms[roomCode].boss
        });
      }
    });

    // Player turn update (End turn or action)
    socket.on('turn-update', (data) => {
      if (rooms[data.roomCode] && data.action === 'end_turn') {
        const room = rooms[data.roomCode];
        // Cycle turn
        room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
        
        io.to(data.roomCode).emit('turn-update', {
          ...data,
          currentTurnIndex: room.currentTurnIndex,
          players: room.players
        });
      } else {
        io.to(data.roomCode).emit('turn-update', data);
      }
    });

    // Question result
    socket.on('question-result', (data) => {
      // Update in-memory score for the room leaderboard
      if (rooms[data.roomCode]) {
        const player = rooms[data.roomCode].players.find(p => p.username === data.player);
        if (player && data.points) {
          player.score += data.points;
        }
        
        // Broadcast the result text AND the new state
        io.to(data.roomCode).emit('question-result', data);
        io.to(data.roomCode).emit('game-state-sync', {
          players: rooms[data.roomCode].players,
          currentTurnIndex: rooms[data.roomCode].currentTurnIndex
        });
      }
    });

    // Dice roll result
    socket.on('dice-result', (data) => {
      io.to(data.roomCode).emit('dice-result', data);
    });

    // Player stats update
    socket.on('player-update', (data) => {
      io.to(data.roomCode).emit('player-update', data);
    });

    // Game over
    socket.on('game-over', (data) => {
      io.to(data.roomCode).emit('game-over', data);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      if (socket.roomCode && rooms[socket.roomCode]) {
        // Find if the disconnecting player was the host
        const disconnectedPlayer = rooms[socket.roomCode].players.find(p => p.id === socket.id);
        const wasHost = disconnectedPlayer ? disconnectedPlayer.isHost : false;

        // Remove the player from the room tracking
        rooms[socket.roomCode].players = rooms[socket.roomCode].players.filter(p => p.id !== socket.id);
        
        if (rooms[socket.roomCode].players.length === 0) {
          // Clean up empty rooms
          delete rooms[socket.roomCode];
        } else {
          // Host migration
          if (wasHost) {
            rooms[socket.roomCode].players[0].isHost = true;
            rooms[socket.roomCode].players[0].isReady = true; // Auto ready the new host
          }
          // Broadcast the updated list
          io.to(socket.roomCode).emit('update-player-list', rooms[socket.roomCode].players);
        }
      }
    });
  });
};

// Export rooms for access from routes
module.exports.rooms = rooms;
