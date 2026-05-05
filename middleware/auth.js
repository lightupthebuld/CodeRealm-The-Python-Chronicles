// Authentication middleware

function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.error = 'Please log in to access this page.';
    return res.redirect('/auth/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    req.session.error = 'Please log in to access this page.';
    return res.redirect('/auth/login');
  }
  if (req.session.user.role !== 'admin') {
    req.session.error = 'Access denied. Admin privileges required.';
    return res.redirect('/');
  }
  next();
}

function requirePlayer(req, res, next) {
  if (!req.session.user) {
    req.session.error = 'Please log in to access this page.';
    return res.redirect('/auth/login');
  }
  if (req.session.user.role !== 'player') {
    req.session.error = 'Access denied.';
    return res.redirect('/admin/dashboard');
  }
  next();
}

module.exports = { requireLogin, requireAdmin, requirePlayer };
