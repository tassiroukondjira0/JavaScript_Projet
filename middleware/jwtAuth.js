const { verifyToken } = require('../utils/jwt');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Accès refusé : token manquant.' });
  }

  const [scheme, token] = String(authHeader).split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Accès refusé : token invalide.' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, ... }
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

