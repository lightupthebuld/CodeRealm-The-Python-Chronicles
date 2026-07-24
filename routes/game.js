const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const { pool } = require('../database/db');
const { rooms } = require('../socket/gameSocket');

async function updateGlobalScore(userId, scoreChange) {
  if (scoreChange === 0) return;
  const [roomRows] = await pool.query('SELECT roomid FROM GameRoom WHERE roomcode = ? LIMIT 1', ['GLOBAL']);
  let roomId = roomRows[0] && roomRows[0].roomid;
  if (!roomId) {
    const [newRoom] = await pool.query('INSERT INTO GameRoom (roomname, roomcode, hostid) VALUES (?, ?, ?)', ['Global Leaderboard', 'GLOBAL', userId]);
    roomId = newRoom.insertId;
  }
  const [characters] = await pool.query('SELECT characterid FROM `Character` WHERE userid = ? LIMIT 1', [userId]);
  if (characters.length > 0) {
    await pool.query('UPDATE `Character` SET score = GREATEST(0, score + ?) WHERE characterid = ?', [scoreChange, characters[0].characterid]);
  } else {
    await pool.query('INSERT INTO `Character` (userid, roomid, score) VALUES (?, ?, ?)', [userId, roomId, Math.max(0, scoreChange)]);
  }
}

function advanceToNextAlivePlayer(room) {
  const playerCount = room.players.length;
  if (playerCount === 0) return;
  let nextIndex = (room.currentTurnIndex + 1) % playerCount;
  let checked = 0;
  while (checked < playerCount && room.players[nextIndex].hp <= 0) {
    nextIndex = (nextIndex + 1) % playerCount;
    checked++;
  }
  room.currentTurnIndex = nextIndex;
}

// Slide 11: Create Room → Lobby (host view)
router.get('/create', requireLogin, (req, res) => {
  // Generate random 6-character alphanumeric room code
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  res.render('game/lobby-host', { title: 'Game Lobby - CodeRealm', roomCode });
});

// Slide 12: Join Room
router.get('/join', requireLogin, (req, res) => {
  res.render('game/join', { title: 'Join Room - CodeRealm' });
});

// Slide 13: Lobby (player/guest view)
router.get('/lobby/:code', requireLogin, (req, res) => {
  res.render('game/lobby-player', { title: 'Game Lobby - CodeRealm', roomCode: req.params.code });
});

// Slide 14: Gameplay
router.get('/play/:code', requireLogin, (req, res) => {
  res.render('game/play', { title: 'Gameplay - CodeRealm', roomCode: req.params.code });
});

// Slide 15: Scan QR
router.get('/scan/:code', requireLogin, (req, res) => {
  res.render('game/scan', { title: 'Scan QR - CodeRealm', roomCode: req.params.code });
});

router.post('/scan/:code', requireLogin, async (req, res) => {
  const { eventcode } = req.body;
  
  try {
    const room = rooms[req.params.code];
    const currentPlayer = room && room.players[room.currentTurnIndex];
    if (!room || room.status !== 'playing' || !currentPlayer || currentPlayer.username !== req.session.user.username) {
      req.session.error = 'Only the current player can scan a QR card during an active game.';
      return res.redirect(`/game/play/${req.params.code}`);
    }
    let query = 'SELECT questionid FROM Question';
    
    // Determine tile type from QR Code
    let tileType = 'NORMAL';
    if (typeof eventcode === 'string' && eventcode.toUpperCase().startsWith('TILE-')) {
      tileType = eventcode.toUpperCase().split('-')[1];
    } else if (eventcode === 'EVENT') {
      tileType = 'EVENT';
    }
    
    // If it's an EVENT tile, randomly select a specific event type
    if (tileType === 'EVENT') {
      const eventTypes = ['HEAL', 'MONSTER', 'TREASURE', 'TRAP'];
      tileType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    }

    const noQuestionEvents = {
      START: { scoreChange: 5, hpChange: 1, message: 'Start bonus: +5 Score and +1 Heart!' },
      NORMAL: { scoreChange: 0, hpChange: 0, message: 'Normal tile: nothing happens.' },
      REST: { scoreChange: 0, hpChange: 1, message: 'Rest stop: +1 Heart!' }
    };
    if (noQuestionEvents[tileType]) {
      const result = noQuestionEvents[tileType];
      const player = room.players.find(item => item.username === req.session.user.username);
      player.score = Math.max(0, player.score + result.scoreChange);
      player.hp = Math.min(5, Math.max(0, player.hp + result.hpChange));
      await updateGlobalScore(req.session.user.userid, result.scoreChange);
      const io = req.app.get('io');
      io.to(req.params.code).emit('event-triggered', { player: player.username, tileType });
      io.to(req.params.code).emit('question-result', { player: player.username, points: result.scoreChange, correct: true, eventMessage: result.message });
      advanceToNextAlivePlayer(room);
      io.to(req.params.code).emit('turn-update', { roomCode: req.params.code, action: 'end_turn', player: player.username, autoEnded: true, currentTurnIndex: room.currentTurnIndex, players: room.players });
      io.to(req.params.code).emit('game-state-sync', { players: room.players, currentTurnIndex: room.currentTurnIndex, boss: room.boss });
      req.session.success = result.message;
      return res.redirect(`/game/play/${req.params.code}`);
    }
    if (!['MONSTER', 'TREASURE', 'TRAP', 'HEAL'].includes(tileType)) {
      req.session.error = 'Invalid QR event code.';
      return res.redirect(`/game/play/${req.params.code}`);
    }
    
    // Optional: no difficulty filtering as requested
    query += ' ORDER BY RAND() LIMIT 1';
    
    const [rows] = await pool.query(query);
    
    if (rows.length > 0) {
      room.activeQuestion = {
        username: req.session.user.username,
        questionid: rows[0].questionid,
        tileType
      };
      req.session.success = `Triggered a random event: ${tileType}!`;
      
      // Broadcast event type to all players in the room
      const io = req.app.get('io');
      io.to(req.params.code).emit('event-triggered', {
        player: req.session.user.username,
        tileType: tileType
      });
      
      // Redirect to the question display view with the drawn ID and tile type
      res.redirect(`/game/question/${req.params.code}?qId=${rows[0].questionid}&tile=${tileType}`);
    } else {
      req.session.error = 'No questions available in the database.';
      res.redirect(`/game/play/${req.params.code}`);
    }
  } catch (error) {
    console.error(error);
    req.session.error = 'Failed to process the QR code.';
    res.redirect(`/game/play/${req.params.code}`);
  }
});

// Slide 16: Question Display
router.get('/question/:code', requireLogin, async (req, res) => {
  const qId = req.query.qId;
  
  try {
    if (!qId) {
      // If no ID provided, just grab a random one
      const [randomQ] = await pool.query('SELECT questionid FROM Question ORDER BY RAND() LIMIT 1');
      if (randomQ.length > 0) {
        return res.redirect(`/game/question/${req.params.code}?qId=${randomQ[0].questionid}`);
      }
      return res.render('game/question', { title: 'Question - CodeRealm', roomCode: req.params.code, question: null, answers: [] });
    }
    
    const [questions] = await pool.query('SELECT * FROM Question WHERE questionid = ?', [qId]);
    if (questions.length === 0) {
      req.session.error = 'Question not found.';
      return res.redirect(`/game/play/${req.params.code}`);
    }
    
    const [answers] = await pool.query('SELECT * FROM Answer WHERE questionid = ?', [qId]);
    
    res.render('game/question', { 
      title: 'Question - CodeRealm', 
      roomCode: req.params.code,
      question: questions[0],
      answers: answers,
      tileType: req.query.tile || 'NORMAL'
    });
  } catch (error) {
    console.error(error);
    req.session.error = 'Error loading question.';
    res.redirect(`/game/play/${req.params.code}`);
  }
});

// Slide 17: Submit Answer API & DB Score Sync
router.post('/submit-answer/:code', requireLogin, async (req, res) => {
  const { questionid, answerid } = req.body;
  const userId = req.session.user.userid;
  const username = req.session.user.username;
  const roomCode = req.params.code;
  
  try {
    const room = rooms[roomCode];
    const activeQuestion = room && room.activeQuestion;
    if (!activeQuestion || activeQuestion.username !== username || Number(activeQuestion.questionid) !== Number(questionid)) {
      return res.status(400).json({ error: 'This question is no longer active for you.' });
    }
    const tileType = activeQuestion.tileType;
    room.activeQuestion = null;
    let isCorrect = false;
    let points = 0;
    
    // 1. Check if the answer is correct and fetch details for review
    let correctAnswerText = '';
    let chosenAnswerText = 'Timeout / No Answer';
    let questionText = '';

    if (questionid) {
        const [q] = await pool.query('SELECT questiontext FROM Question WHERE questionid = ?', [questionid]);
        if (q.length > 0) questionText = q[0].questiontext;
        
        const [answers] = await pool.query('SELECT answerid, answertext, iscorrect FROM Answer WHERE questionid = ?', [questionid]);
        
        for (const ans of answers) {
            if (ans.iscorrect === 1) {
                correctAnswerText = ans.answertext;
            }
            if (ans.answerid == answerid) {
                chosenAnswerText = ans.answertext;
                if (ans.iscorrect === 1) isCorrect = true;
            }
        }
    }

    // 2. Calculate Rewards and Penalties based on Tile Type
    let scoreChange = 0;
    let hpChange = 0;
    let eventMessage = "";

    if (isCorrect) {
        if (tileType === 'MONSTER') { scoreChange = 10; eventMessage = "Monster defeated! +10 Score"; }
        else if (tileType === 'TREASURE') { scoreChange = 20; eventMessage = "Treasure Found! +20 Score"; }
        else if (tileType === 'HEAL') { hpChange = 1; eventMessage = "Heal successful! +1 Heart"; }
        else if (tileType === 'TRAP') { scoreChange = 5; eventMessage = "Trap evaded! +5 Score"; }
    } else {
        if (tileType === 'MONSTER') { hpChange = -1; eventMessage = "Monster attack! -1 Heart"; }
        else if (tileType === 'TREASURE') { hpChange = -1; eventMessage = "Treasure lost! -1 Heart"; }
        else if (tileType === 'HEAL') { eventMessage = "Heal failed! No Hearts gained."; }
        else if (tileType === 'TRAP') { scoreChange = -10; hpChange = -1; eventMessage = "Trap triggered! -1 Heart and -10 Score"; }
    }

    // 3. Update in-memory room stats (Live Game State)
    let gameOverData = null;
    if (rooms[roomCode]) {
        const player = rooms[roomCode].players.find(p => p.username === username);
        if (player) {
            player.score += scoreChange;
            // Cap HP at 5 and floor at 0
            player.hp = Math.min(5, Math.max(0, player.hp + hpChange));
        }
        
        // Broadcast updated state to ALL players
        const io = req.app.get('io');
        
        // Broadcast question result first
        io.to(roomCode).emit('question-result', {
            player: username,
            points: scoreChange,
            correct: isCorrect,
            eventMessage: eventMessage
        });
        
        // Broadcast game state sync (so others see HP changes immediately)
        io.to(roomCode).emit('game-state-sync', {
            players: rooms[roomCode].players,
            currentTurnIndex: rooms[roomCode].currentTurnIndex,
            boss: rooms[roomCode].boss
        });
        
        // Check game-over condition: if only 1 alive player remains, end the game
        const alivePlayers = rooms[roomCode].players.filter(p => p.hp > 0);
        const totalPlayers = rooms[roomCode].players.length;
        
        if (totalPlayers >= 2 && alivePlayers.length <= 1) {
            // Game Over! Build final standings sorted by score
            const finalStandings = [...rooms[roomCode].players]
                .sort((a, b) => b.score - a.score)
                .map((p, i) => ({
                    rank: i + 1,
                    username: p.username,
                    score: p.score,
                    alive: p.hp > 0
                }));
            
            gameOverData = {
                roomCode: roomCode,
                standings: finalStandings,
                winner: alivePlayers.length === 1 ? alivePlayers[0].username : null,
                reason: alivePlayers.length === 1 
                    ? `${alivePlayers[0].username} is the last one standing!`
                    : 'All players have been eliminated!'
            };
            io.to(roomCode).emit('game-over', gameOverData);

            // Broadcast final game state sync
            io.to(roomCode).emit('game-state-sync', {
                players: rooms[roomCode].players,
                currentTurnIndex: rooms[roomCode].currentTurnIndex,
                boss: rooms[roomCode].boss
            });
        } else {
            // Game continues: auto-advance turn to next alive player
            const room = rooms[roomCode];
            const playerCount = room.players.length;
            if (playerCount > 0) {
                let nextIndex = (room.currentTurnIndex + 1) % playerCount;
                // Skip dead players (hp <= 0)
                let checked = 0;
                while (checked < playerCount) {
                    if (room.players[nextIndex].hp > 0) break;
                    nextIndex = (nextIndex + 1) % playerCount;
                    checked++;
                }
                room.currentTurnIndex = nextIndex;
            }

            // Broadcast the turn change
            io.to(roomCode).emit('turn-update', {
                roomCode: roomCode,
                action: 'end_turn',
                player: username,
                autoEnded: true,
                currentTurnIndex: rooms[roomCode].currentTurnIndex,
                players: rooms[roomCode].players
            });

            // Broadcast full game state sync
            io.to(roomCode).emit('game-state-sync', {
                players: rooms[roomCode].players,
                currentTurnIndex: rooms[roomCode].currentTurnIndex,
                boss: rooms[roomCode].boss
            });
        }
    }

    // 4. Save to Database for Global Leaderboard (Only Score matters here)
    await updateGlobalScore(userId, scoreChange);

    const didAnswer = !!answerid;
    res.json({ 
        correct: isCorrect, 
        points: scoreChange, 
        hpChange: hpChange, 
        eventMessage: eventMessage,
        player: username,
        questionText: questionText,
        correctAnswerText: didAnswer ? correctAnswerText : null,
        chosenAnswerText: didAnswer ? chosenAnswerText : 'Timeout / No Answer',
        didAnswer: didAnswer,
        gameOver: gameOverData
    });
  } catch (error) {
    console.error('Answer submission error:', error);
    res.status(500).json({ error: 'Server error', correct: false, points: 0 });
  }
});

// Slide 17: Answer Result
router.get('/result/:code', requireLogin, (req, res) => {
  res.render('game/answer-result', { title: 'Answer Result - CodeRealm', roomCode: req.params.code });
});

// Slide 18: Game Result
router.get('/gameover/:code', requireLogin, (req, res) => {
  res.render('game/game-result', { title: 'Game Result - CodeRealm', roomCode: req.params.code });
});


// Review Answer Route
router.get('/review/:code', requireLogin, (req, res) => {
  res.render('game/review', { title: 'Answer Review - CodeRealm', roomCode: req.params.code });
});

module.exports = router;
