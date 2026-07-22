const jwt = require('../utils/jwt');
const userModel = require('../models/userModel');
const { signRefreshToken, verifyToken } = require('../utils/jwt');

/**
 * Rafraîchir le token JWT
 * POST /api/auth/refresh-token
 */
async function refreshToken(req, res) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({ error: 'Refresh token requis' });
    }

    // Vérifier le refresh token
    const decoded = verifyToken(refresh_token);

    // Vérifier que l'utilisateur existe toujours
    const user = await userModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Générer un nouveau access token
    const accessToken = jwt.signToken({
      userId: user.id,
      email: user.email,
      role: user.role
    }, { expiresIn: '24h' });

    // Générer un nouveau refresh token
    const newRefreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return res.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: 24 * 60 * 60 // 24h en secondes
    });

  } catch (error) {
    return res.status(401).json({ error: 'Refresh token invalide ou expiré' });
  }
}

module.exports = { refreshToken };