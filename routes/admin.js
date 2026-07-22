const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');

// Slide 1: Admin Dashboard
router.get('/dashboard', requireAdmin, (req, res) => {
  res.render('admin/dashboard', { title: 'Admin Dashboard - CodeRealm' });
});

// Database integration
const { pool } = require('../database/db');
const bcrypt = require('bcryptjs');

// Slide 2: User Management
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT userid, username, email, role, createtime FROM User ORDER BY userid DESC');
    users.forEach(u => {
        if (u.role === 'admin') {
            u.displayId = 'A' + u.userid;
        } else {
            u.displayId = 'P' + u.userid;
        }
    });
    res.render('admin/users', { title: 'User Management - CodeRealm', users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.render('admin/users', { title: 'User Management - CodeRealm', users: [] });
  }
});

// Delete User
router.post('/users/:id/delete', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    // Don't allow admin to delete themselves
    if (userId == req.session.user.userid) {
      req.session.error = "You cannot delete your own account.";
      return res.redirect('/admin/users');
    }
    await pool.query('DELETE FROM User WHERE userid = ?', [userId]);
    req.session.success = "User deleted successfully.";
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error deleting user:', err);
    req.session.error = "Error deleting user.";
    res.redirect('/admin/users');
  }
});

// Slide 3: Add User
router.get('/users/add', requireAdmin, (req, res) => {
  res.render('admin/user-add', { title: 'Add User - CodeRealm' });
});

router.post('/users/add', requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await pool.query('INSERT INTO User (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, role]);
    req.session.success = "User added successfully.";
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error adding user:', err);
    req.session.error = "Failed to add user. Username or email might already exist.";
    res.redirect('/admin/users/add');
  }
});

// Slide 4: Edit User
router.get('/users/:id/edit', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT userid, username, email, role FROM User WHERE userid = ?', [req.params.id]);
    if (rows.length === 0) return res.redirect('/admin/users');
    res.render('admin/user-edit', { title: 'Edit User - CodeRealm', editUser: rows[0] });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.redirect('/admin/users');
  }
});

router.post('/users/:id/edit', requireAdmin, async (req, res) => {
  try {
    const { username, email, resetPassword, role } = req.body;
    if (resetPassword && resetPassword.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(resetPassword, salt);
      await pool.query('UPDATE User SET username = ?, email = ?, password = ?, role = ? WHERE userid = ?', [username, email, hashedPassword, role, req.params.id]);
    } else {
      await pool.query('UPDATE User SET username = ?, email = ?, role = ? WHERE userid = ?', [username, email, role, req.params.id]);
    }
    req.session.success = "User updated successfully.";
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error updating user:', err);
    req.session.error = "Failed to update user.";
    res.redirect(`/admin/users/${req.params.id}/edit`);
  }
});

// Slide 6: Question Management
router.get('/questions', requireAdmin, async (req, res) => {
  try {
    const [questions] = await pool.query('SELECT questionid, questiontext, concept, difficulty, mark FROM Question ORDER BY questionid DESC');
    res.render('admin/questions', { title: 'Question Management - CodeRealm', questions });
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.render('admin/questions', { title: 'Question Management - CodeRealm', questions: [] });
  }
});

// Delete Question
router.post('/questions/:id/delete', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM Question WHERE questionid = ?', [req.params.id]);
    req.session.success = "Question deleted successfully.";
    res.redirect('/admin/questions');
  } catch (err) {
    console.error('Error deleting question:', err);
    req.session.error = "Error deleting question.";
    res.redirect('/admin/questions');
  }
});

// Slide 7: Add Question
router.get('/questions/add', requireAdmin, (req, res) => {
  res.render('admin/question-add', { title: 'Add Question - CodeRealm' });
});

router.post('/questions/add', requireAdmin, async (req, res) => {
  try {
    const { questiontext, difficulty, option_a, option_b, option_c, option_d, correct } = req.body;
    const concept = 'classes_objects';
    if (![questiontext, option_a, option_b, option_c, option_d].every(value => value && value.trim()) || !['A', 'B', 'C', 'D'].includes(correct)) {
      req.session.error = 'Enter a question, all four answers, and select one correct answer.';
      return res.redirect('/admin/questions/add');
    }
    
    // Insert Question
    const [qResult] = await pool.query(
      'INSERT INTO Question (questiontext, concept, difficulty, mark) VALUES (?, ?, ?, 10)', 
      [questiontext, concept, difficulty]
    );
    const questionId = qResult.insertId;

    // Insert Answers
    const options = [option_a, option_b, option_c, option_d];
    const correctIndex = correct === 'A' ? 0 : (correct === 'B' ? 1 : (correct === 'C' ? 2 : 3));
    
    for (let i = 0; i < options.length; i++) {
      const isCorrect = (i === correctIndex) ? 1 : 0;
      await pool.query(
        'INSERT INTO Answer (questionid, answertext, iscorrect) VALUES (?, ?, ?)',
        [questionId, options[i], isCorrect]
      );
    }
    
    req.session.success = "Question added successfully.";
    res.redirect('/admin/questions');
  } catch (err) {
    console.error('Error adding question:', err);
    req.session.error = "Failed to add question.";
    res.redirect('/admin/questions/add');
  }
});

// Slide 8: Edit Question
router.get('/questions/:id/edit', requireAdmin, async (req, res) => {
  try {
    const [qRows] = await pool.query('SELECT * FROM Question WHERE questionid = ?', [req.params.id]);
    if (qRows.length === 0) return res.redirect('/admin/questions');
    
    const [aRows] = await pool.query('SELECT * FROM Answer WHERE questionid = ? ORDER BY answerid ASC', [req.params.id]);
    
    res.render('admin/question-edit', { 
      title: 'Edit Question - CodeRealm', 
      editQuestion: qRows[0],
      editAnswers: aRows
    });
  } catch (err) {
    console.error('Error fetching question:', err);
    res.redirect('/admin/questions');
  }
});

router.post('/questions/:id/edit', requireAdmin, async (req, res) => {
  try {
    const questionId = req.params.id;
    const { questiontext, difficulty, options, answerids, correct } = req.body;
    const concept = 'classes_objects';
    const optionList = Array.isArray(options) ? options : [options];
    const answerIdList = Array.isArray(answerids) ? answerids : [answerids];
    if (!questiontext || optionList.length !== 4 || optionList.some(value => !value || !value.trim()) || !Number.isInteger(Number(correct)) || Number(correct) < 0 || Number(correct) > 3) {
      req.session.error = 'Enter a question, all four answers, and select one correct answer.';
      return res.redirect(`/admin/questions/${req.params.id}/edit`);
    }
    
    // Update Question
    await pool.query(
      'UPDATE Question SET questiontext = ?, concept = ?, difficulty = ? WHERE questionid = ?',
      [questiontext, concept, difficulty, questionId]
    );

    // Update Answers
    const correctIndex = parseInt(correct);
    for (let i = 0; i < optionList.length; i++) {
      const isCorrect = (i === correctIndex) ? 1 : 0;
      if (answerIdList[i]) {
        await pool.query(
          'UPDATE Answer SET answertext = ?, iscorrect = ? WHERE answerid = ?',
          [optionList[i], isCorrect, answerIdList[i]]
        );
      }
    }

    req.session.success = "Question updated successfully.";
    res.redirect('/admin/questions');
  } catch (err) {
    console.error('Error updating question:', err);
    req.session.error = "Failed to update question.";
    res.redirect(`/admin/questions/${req.params.id}/edit`);
  }
});

// Slide 10: Rules Management
const fs = require('fs');
const path = require('path');

router.get('/rules', requireAdmin, (req, res) => {
  let rulesContent = '';
  try {
    const rulesPath = path.join(__dirname, '../data/rules.txt');
    if (fs.existsSync(rulesPath)) {
      rulesContent = fs.readFileSync(rulesPath, 'utf8');
    } else {
      rulesContent = `CodeRealm: Python Classes and Objects - Game Rules

1. SETUP
   - Each player creates an account and joins a game room.
   - The physical board game is set up with the map and QR cards.
   - Each player starts with 100 HP, 100 SAN, and base skill values.

2. GAMEPLAY
   - Players take turns rolling a physical die to move on the board.
   - When landing on an event space, scan the QR card to trigger an event.
   - The web app will display a Python Classes and Objects question related to the event.
   - Answer correctly to gain a skill bonus for the dice check.
   - The web app rolls a D100 and compares against your skill value.`;
    }
  } catch (err) {
    console.error('Error reading rules:', err);
  }
  
  res.render('admin/rules', { title: 'Rules Management - CodeRealm', rulesContent });
});

router.post('/rules', requireAdmin, (req, res) => {
  try {
    const { rules_content } = req.body;
    const rulesPath = path.join(__dirname, '../data/rules.txt');
    fs.writeFileSync(rulesPath, rules_content, 'utf8');
    req.session.success = "Rules saved successfully.";
  } catch (err) {
    console.error('Error saving rules:', err);
    req.session.error = "Failed to save rules.";
  }
  res.redirect('/admin/rules');
});

// Admin Physical Components
router.get('/components', requireAdmin, (req, res) => {
  let components = { mapImage: "/images/coderealm_map.png", qrCards: [] };
  try {
    const componentsPath = path.join(__dirname, '../data/components.json');
    if (fs.existsSync(componentsPath)) {
      components = JSON.parse(fs.readFileSync(componentsPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading components:', err);
  }
  res.render('admin/components', { title: 'Physical Components - Admin', components });
});

router.post('/components/map', requireAdmin, (req, res) => {
  try {
    const { mapImage } = req.body;
    const componentsPath = path.join(__dirname, '../data/components.json');
    let components = { mapImage: "/images/coderealm_map.png", qrCards: [] };
    if (fs.existsSync(componentsPath)) {
      components = JSON.parse(fs.readFileSync(componentsPath, 'utf8'));
    }
    components.mapImage = mapImage || "/images/coderealm_map.png";
    fs.writeFileSync(componentsPath, JSON.stringify(components, null, 4), 'utf8');
    req.session.success = "Map image updated successfully.";
  } catch (err) {
    console.error('Error updating map:', err);
    req.session.error = "Failed to update map image.";
  }
  res.redirect('/admin/components');
});

router.post('/components/qr/add', requireAdmin, (req, res) => {
  try {
    const { id, title, data, description } = req.body;
    const componentsPath = path.join(__dirname, '../data/components.json');
    let components = { mapImage: "/images/coderealm_map.png", qrCards: [] };
    if (fs.existsSync(componentsPath)) {
      components = JSON.parse(fs.readFileSync(componentsPath, 'utf8'));
    }
    components.qrCards.push({ id, title, data, description });
    fs.writeFileSync(componentsPath, JSON.stringify(components, null, 4), 'utf8');
    req.session.success = "QR Card added successfully.";
  } catch (err) {
    console.error('Error adding QR Card:', err);
    req.session.error = "Failed to add QR Card.";
  }
  res.redirect('/admin/components');
});

router.post('/components/qr/delete/:id', requireAdmin, (req, res) => {
  try {
    const cardId = req.params.id;
    const componentsPath = path.join(__dirname, '../data/components.json');
    let components = { mapImage: "/images/coderealm_map.png", qrCards: [] };
    if (fs.existsSync(componentsPath)) {
      components = JSON.parse(fs.readFileSync(componentsPath, 'utf8'));
    }
    components.qrCards = components.qrCards.filter(c => c.id !== cardId);
    fs.writeFileSync(componentsPath, JSON.stringify(components, null, 4), 'utf8');
    req.session.success = "QR Card deleted successfully.";
  } catch (err) {
    console.error('Error deleting QR Card:', err);
    req.session.error = "Failed to delete QR Card.";
  }
  res.redirect('/admin/components');
});

// Admin Profile
router.get('/profile', requireAdmin, (req, res) => {
  res.render('admin/profile', { title: 'Admin Profile - CodeRealm' });
});

module.exports = router;
