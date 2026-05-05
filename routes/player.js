const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const { pool } = require('../database/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Slide 24: Homepage (public, with login button if not logged in)
// Slide 10: User Main Page (when logged in)
router.get('/', (req, res) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.render('player/home', { title: 'CodeRealm: The OOP Chronicles' });
});

// Slide 19: Physical Component Download
router.get('/download', requireLogin, (req, res) => {
  res.render('player/download', { title: 'Physical Components - CodeRealm' });
});

// Slide 20: Rules
router.get('/rules', (req, res) => {
  let rulesContent = 'Rules are not available at the moment.';
  try {
    const rulesPath = path.join(__dirname, '../data/rules.txt');
    if (fs.existsSync(rulesPath)) {
      rulesContent = fs.readFileSync(rulesPath, 'utf8');
    }
  } catch (err) {
    console.error('Error reading rules:', err);
  }
  res.render('player/rules', { title: 'Rules - CodeRealm', rulesContent });
});

// Slide 21: Leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const [leaders] = await pool.query(`
      SELECT u.username, COALESCE(SUM(c.score), 0) as total_score 
      FROM User u 
      LEFT JOIN \`Character\` c ON u.userid = c.userid 
      WHERE u.role = 'player' 
      GROUP BY u.userid 
      ORDER BY total_score DESC, u.userid ASC
      LIMIT 10
    `);
    res.render('player/leaderboard', { title: 'Leaderboard - CodeRealm', leaders });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.render('player/leaderboard', { title: 'Leaderboard - CodeRealm', leaders: [] });
  }
});

// Slide 25: Profile
router.get('/profile', requireLogin, (req, res) => {
  if (req.session.user.role === 'admin') {
    return res.redirect('/admin/profile');
  }
  res.render('player/profile', { title: 'Profile - CodeRealm' });
});

// Slide 25: Profile
router.get('/profile/edit', requireLogin, (req, res) => {
  res.render('player/profile-edit', { title: 'Edit Profile - CodeRealm' });
});

router.post('/profile/edit', requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.userid;
    const { username, email, currentPassword, newPassword } = req.body;

    // Fetch current user from DB
    const [rows] = await pool.query('SELECT password FROM User WHERE userid = ?', [userId]);
    const user = rows[0];

    // If they want to change password, they MUST provide currentPassword
    if (newPassword && newPassword.trim() !== '') {
      if (!currentPassword) {
        req.session.error = "Current password is required to set a new password.";
        return res.redirect('/profile/edit');
      }
      
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        req.session.error = "Incorrect current password.";
        return res.redirect('/profile/edit');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      await pool.query('UPDATE User SET username = ?, email = ?, password = ? WHERE userid = ?', [username, email, hashedPassword, userId]);
    } else {
      // Just update username and email
      await pool.query('UPDATE User SET username = ?, email = ? WHERE userid = ?', [username, email, userId]);
    }

    // Update session so it reflects immediately
    req.session.user.username = username;
    req.session.user.email = email;
    
    req.session.success = "Profile updated successfully!";
    res.redirect('/profile');

  } catch (err) {
    console.error('Error updating profile:', err);
    // Check for duplicate username/email error
    if (err.code === 'ER_DUP_ENTRY') {
      req.session.error = "Username or email already in use.";
    } else {
      req.session.error = "Failed to update profile.";
    }
    res.redirect('/profile/edit');
  }
});

module.exports = router;
