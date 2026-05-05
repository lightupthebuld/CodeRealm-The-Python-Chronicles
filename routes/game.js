const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const { pool } = require('../database/db');
const { rooms } = require('../socket/gameSocket');

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
    let query = 'SELECT questionid FROM Question';
    let params = [];
    
    // Determine tile type from QR Code
    let tileType = 'NORMAL'; // Default
    if (eventcode.startsWith('TILE-')) {
      tileType = eventcode.split('-')[1]; // e.g. NORMAL, MONSTER, TREASURE, BOSS
    }
    
    // Optional: map tile type to question difficulty
    if (tileType === 'BOSS') {
      query += ' WHERE difficulty = "hard"';
    } else if (tileType === 'NORMAL' || tileType === 'TREASURE') {
      query += ' WHERE difficulty = "easy" OR difficulty = "medium"';
    }
    
    query += ' ORDER BY RAND() LIMIT 1';
    
    const [rows] = await pool.query(query, params);
    
    if (rows.length > 0) {
      req.session.success = `Landed on ${tileType} tile!`;
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
  const { questionid, answerid, tileType } = req.body;
  const userId = req.session.user.userid;
  const username = req.session.user.username;
  const roomCode = req.params.code;
  
  try {
    let isCorrect = false;
    let points = 0;
    
    // 1. Check if the answer is correct
    if (answerid) {
        const [ans] = await pool.query('SELECT iscorrect FROM Answer WHERE answerid = ? AND questionid = ?', [answerid, questionid]);
        if (ans.length > 0 && ans[0].iscorrect === 1) {
            isCorrect = true;
        }
    }

    // 2. Calculate Rewards and Penalties based on Tile Type
    let scoreChange = 0;
    let hpChange = 0;
    let bossHpChange = 0;
    let eventMessage = "";

    if (isCorrect) {
        if (tileType === 'NORMAL') { scoreChange = 10; hpChange = 5; eventMessage = "Correct! +10 Score, +5 HP"; }
        else if (tileType === 'MONSTER') { scoreChange = 10; eventMessage = "Monster Defeated! +10 Score"; }
        else if (tileType === 'TREASURE') { scoreChange = 20; eventMessage = "Treasure Found! +20 Score"; }
        else if (tileType === 'BOSS') { bossHpChange = -20; eventMessage = "Boss hit! -20 Boss HP"; }
    } else {
        if (tileType === 'NORMAL' || tileType === 'MONSTER') { hpChange = -10; eventMessage = "Wrong! -10 HP"; }
        else if (tileType === 'BOSS') { hpChange = -15; eventMessage = "Boss attacks! -15 HP"; }
        else if (tileType === 'TREASURE') { eventMessage = "Wrong! Treasure lost."; }
    }

    // 3. Update in-memory room stats (Live Game State)
    if (rooms[roomCode]) {
        const player = rooms[roomCode].players.find(p => p.username === username);
        if (player) {
            player.score += scoreChange;
            player.hp = Math.max(0, player.hp + hpChange);
        }
        
        if (rooms[roomCode].boss) {
            rooms[roomCode].boss.hp = Math.max(0, rooms[roomCode].boss.hp + bossHpChange);
        }
        
        // Broadcast updated state to ALL players
        const io = req.app.get('io');
        io.to(roomCode).emit('game-state-sync', {
            players: rooms[roomCode].players,
            currentTurnIndex: rooms[roomCode].currentTurnIndex,
            boss: rooms[roomCode].boss
        });
        io.to(roomCode).emit('question-result', {
            player: username,
            points: scoreChange,
            correct: isCorrect,
            eventMessage: eventMessage
        });
    }

    // 4. Save to Database for Global Leaderboard (Only Score matters here)
    if (scoreChange > 0) {
        const [room] = await pool.query('SELECT roomid FROM GameRoom LIMIT 1');
        let roomId = room.length > 0 ? room[0].roomid : null;
        if (!roomId) {
            const [newRoom] = await pool.query('INSERT INTO GameRoom (roomname, roomcode, hostid) VALUES ("Global", "GLOBAL", ?)', [userId]);
            roomId = newRoom.insertId;
        }
        
        const [char] = await pool.query('SELECT characterid FROM `Character` WHERE userid = ? LIMIT 1', [userId]);
        if (char.length > 0) {
            await pool.query('UPDATE `Character` SET score = score + ? WHERE characterid = ?', [scoreChange, char[0].characterid]);
        } else {
            await pool.query('INSERT INTO `Character` (userid, roomid, score) VALUES (?, ?, ?)', [userId, roomId, scoreChange]);
        }
    }

    res.json({ correct: isCorrect, points: scoreChange, hpChange: hpChange, eventMessage: eventMessage });
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

module.exports = router;
