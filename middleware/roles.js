function requireRole(allowed = []) {
  return (req, res, next) => {
    const role = req.session?.user?.role;
    if (!role) return res.redirect('/');
    if (!allowed.includes(role)) return res.status(403).send('Forbidden');
    next();
  };
}

module.exports = { requireRole };

