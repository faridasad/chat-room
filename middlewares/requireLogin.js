function requireLogin(req, res, next) {
    if (req.session && req.session.user) {
      // User is logged in, so allow the request to continue
      next();
    } else {
      // User is not logged in, so redirect to the login page
      res.redirect('/');
    }
}

module.exports = requireLogin;