function requireAuth(req, res, next) {
  if (req.session && req.session.admin === true) return next();
  res.redirect('/admin/login');
}

module.exports = { requireAuth };
