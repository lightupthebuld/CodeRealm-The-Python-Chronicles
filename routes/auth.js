const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/db');

// ========================================
// GET /auth/login
// ========================================
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/');
  }
  res.render('auth/login', { title: 'Login - CodeRealm' });
});

// ========================================
// POST /auth/login
// ========================================
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', {
      title: 'Login - CodeRealm',
      errors: errors.array(),
      old: req.body
    });
  }

  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM User WHERE username = ? OR email = ?', [username, username]);

    if (rows.length === 0) {
      return res.render('auth/login', {
        title: 'Login - CodeRealm',
        errors: [{ msg: 'Invalid username or password' }],
        old: req.body
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Login - CodeRealm',
        errors: [{ msg: 'Invalid username or password' }],
        old: req.body
      });
    }

    // Set session
    req.session.user = {
      userid: user.userid,
      username: user.username,
      email: user.email,
      role: user.role
    };

    req.session.success = `Welcome back, ${user.username}!`;

    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/');

  } catch (err) {
    console.error('Login error:', err);
    return res.render('auth/login', {
      title: 'Login - CodeRealm',
      errors: [{ msg: 'An error occurred. Please try again.' }],
      old: req.body
    });
  }
});

// ========================================
// GET /auth/register
// ========================================
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/register', { title: 'Register - CodeRealm' });
});

// ========================================
// POST /auth/register
// ========================================
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: 'Register - CodeRealm',
      errors: errors.array(),
      old: req.body
    });
  }

  try {
    const { username, email, password } = req.body;

    // Check if username or email already exists
    const [existing] = await pool.query(
      'SELECT * FROM User WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      const field = existing[0].username === username ? 'Username' : 'Email';
      return res.render('auth/register', {
        title: 'Register - CodeRealm',
        errors: [{ msg: `${field} is already taken` }],
        old: req.body
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO User (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'player']
    );

    // Set session
    req.session.user = {
      userid: result.insertId,
      username: username,
      email: email,
      role: 'player'
    };

    req.session.success = 'Welcome to CodeRealm! Your account has been created.';
    return res.redirect('/');

  } catch (err) {
    console.error('Register error:', err);
    return res.render('auth/register', {
      title: 'Register - CodeRealm',
      errors: [{ msg: 'An error occurred. Please try again.' }],
      old: req.body
    });
  }
});

// ========================================
// POST /auth/logout
// ========================================
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/auth/login');
  });
});

module.exports = router;
