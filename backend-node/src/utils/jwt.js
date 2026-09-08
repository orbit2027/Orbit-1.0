/**
 * utilidades: generacion y verificacion de tokens JWT.
 * Replica el comportamiento de djangorestframework-simplejwt:
 * - Access token con vida de 24h (configurable) y claim 'user_id'.
 * - Refresh token con vida de 7 dias.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

function generarTokens(usuario) {
    const access = jwt.sign(
        { user_id: String(usuario._id || usuario.id), role: usuario.rol },
        config.JWT_SECRET_KEY,
        { expiresIn: `${config.JWT_ACCESS_TOKEN_LIFETIME}h` }
    );
    const refresh = jwt.sign(
        { user_id: String(usuario._id || usuario.id) },
        config.JWT_SECRET_KEY,
        { expiresIn: `${config.JWT_REFRESH_TOKEN_LIFETIME}d` }
    );
    return { access, refresh };
}

function verificarAccessToken(token) {
    return jwt.verify(token, config.JWT_SECRET_KEY);
}

module.exports = { generarTokens, verificarAccessToken, config };
