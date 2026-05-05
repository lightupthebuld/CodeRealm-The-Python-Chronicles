const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { testConnection } = require('./database/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const playerRoutes = require('./routes/player');
const gameRoutes = require('./routes/game');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set('io', io);

// ========================================
// Middleware
// ========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'coderealm_default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
  }
});
app.use(sessionMiddleware);

// Make session available to Socket.IO
io.engine.use(sessionMiddleware);

// Make user data available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  // Clear flash messages after reading
  delete req.session.success;
  delete req.session.error;
  next();
});

// Method override for PUT/DELETE in forms
app.use((req, res, next) => {
  if (req.body && req.body._method) {
    req.method = req.body._method;
    delete req.body._method;
  }
  next();
});

// ========================================
// Routes
// ========================================
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/game', gameRoutes);
app.use('/', playerRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Page Not Found',
    message: 'The page you are looking for does not exist.',
    code: 404
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: '500 - Server Error',
    message: 'Something went wrong on our end.',
    code: 500
  });
});

// ========================================
// Socket.IO
// ========================================
require('./socket/gameSocket')(io);

// ========================================
// Start Server
// ========================================
const PORT = process.env.PORT || 3000;

async function startServer() {
  await testConnection();
  server.listen(PORT, () => {
    console.log(`\n🎮 CodeRealm server running at http://localhost:${PORT}\n`);
  });
}

startServer();
