// Socket.IO game event handlers

const rooms = {};

module.exports = function (io) {
  io.on('connection', (socket) => {
    const user = socket.request.session && socket.request.session.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }
    socket.user = user;
    console.log(`Socket connected: ${socket.id}`);

    // Join a game room
    socket.on('join-room', (data) => {
      // For lobby data could be { roomCode, username, isHost }
      const roomCode = data.roomCode || data;
      const username = socket.user.username;
      const isHost = data.isHost === true;
      
      socket.join(roomCode);
      
      // Initialize room if it doesn't exist
      if (!rooms[roomCode]) {
        if (!isHost) {
          socket.emit('room-error', 'This room does not exist. Ask the host to create it first.');
          return;
        }
        rooms[roomCode] = { players: [], currentTurnIndex: null, boss: { hp: 100 }, status: 'lobby', activeQuestion: null };
      }
      
      // Store user info in the socket for disconnect handling
      socket.roomCode = roomCode;
      socket.username = username;
      
      // Add player to the room tracking (avoid duplicates if they reconnect)
      const existingPlayer = rooms[roomCode].players.find(p => p.username === username);
      if (!existingPlayer) {
        rooms[roomCode].players.push({ id: socket.id, username, isReady: isHost, isHost, score: 0, hp: 5, connected: true });
      } else {
        existingPlayer.id = socket.id; // Update socket id
        existingPlayer.connected = true;
      }
      
      // Clear any pending deletion timeouts for this room
      if (rooms[roomCode].deleteTimeout) {
          clearTimeout(rooms[roomCode].deleteTimeout);
          rooms[roomCode].deleteTimeout = null;
      }
      
      console.log(`Socket ${socket.id} (${username}) joined room ${roomCode}`);
      
      // Broadcast updated player list to everyone in the room
      io.to(roomCode).emit('update-player-list', rooms[roomCode].players);
    });

    // Player ready
    socket.on('player-ready', (data) => {
      const roomCode = data.roomCode;
      const username = socket.user.username;
      
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
      const username = socket.user.username;
      
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
        const room = rooms[data.roomCode];
        const player = room.players.find(p => p.username === socket.user.username);
        if (!player || !player.isHost || room.players.length < 2 || !room.players.every(p => p.isReady)) {
          socket.emit('room-error', 'Only the host can start a game after at least two ready players have joined.');
          return;
        }
        room.status = 'playing';
        room.currentTurnIndex = Math.floor(Math.random() * room.players.length);
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
        const playerCount = room.players.length;
        
        // Cycle turn, skipping dead players
        let nextIndex = (room.currentTurnIndex + 1) % playerCount;
        let checked = 0;
        while (checked < playerCount) {
          if (room.players[nextIndex].hp > 0) break;
          nextIndex = (nextIndex + 1) % playerCount;
          checked++;
        }
        room.currentTurnIndex = nextIndex;
        
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

    // Explicit leave room (when clicking Leave Game)
    socket.on('leave-room', (data) => {
      const roomCode = data.roomCode;
      const username = data.username;
      
      if (rooms[roomCode]) {
        const player = rooms[roomCode].players.find(p => p.username === username);
        const wasHost = player ? player.isHost : false;
        
        rooms[roomCode].players = rooms[roomCode].players.filter(p => p.username !== username);
        
        if (rooms[roomCode].players.length === 0) {
          delete rooms[roomCode];
        } else {
          if (wasHost) {
            rooms[roomCode].players[0].isHost = true;
            rooms[roomCode].players[0].isReady = true;
          }
          io.to(roomCode).emit('update-player-list', rooms[roomCode].players);
          
          if (rooms[roomCode].currentTurnIndex !== undefined) {
             io.to(roomCode).emit('game-state-sync', {
                players: rooms[roomCode].players,
                currentTurnIndex: rooms[roomCode].currentTurnIndex,
                boss: rooms[roomCode].boss
             });
          }
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      if (socket.roomCode && rooms[socket.roomCode]) {
        const roomCode = socket.roomCode;
        const player = rooms[roomCode].players.find(p => p.id === socket.id);
        if (player) {
          player.connected = false;
        }

        if (rooms[roomCode].status === 'lobby') {
          // In Lobby: Remove player immediately
          const wasHost = player ? player.isHost : false;
          rooms[roomCode].players = rooms[roomCode].players.filter(p => p.id !== socket.id);
          
          if (rooms[roomCode].players.length === 0) {
            delete rooms[roomCode];
          } else {
            if (wasHost) {
              rooms[roomCode].players[0].isHost = true;
              rooms[roomCode].players[0].isReady = true;
            }
            io.to(roomCode).emit('update-player-list', rooms[roomCode].players);
          }
        } else {
          // In Game: Keep player in room, clean up if empty for 5 minutes
          if (rooms[roomCode].deleteTimeout) {
              clearTimeout(rooms[roomCode].deleteTimeout);
          }
          rooms[roomCode].deleteTimeout = setTimeout(() => {
            if (rooms[roomCode]) {
              const anyConnected = rooms[roomCode].players.some(p => p.connected !== false);
              if (!anyConnected) {
                console.log(`Room ${roomCode} empty for 5 minutes, deleting.`);
                delete rooms[roomCode];
              }
            }
          }, 5 * 60 * 1000);
        }
      }
    });
  });
};

// Export rooms for access from routes
module.exports.rooms = rooms;
