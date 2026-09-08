/**
 * Middleware de autenticacion JWT.
 * Replica el AutenticacionJWT de Django: lee el header Authorization
 * con prefijo 'Bearer ', valida el token y coloca request.user.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { Usuario } = require('../models');

function autenticarJWT(req, res, next) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
        return next(); // sin credenciales -> el controlador decide (403)
    }

    const token = header.split(' ')[1];
    try {
        const datos = jwt.verify(token, config.JWT_SECRET_KEY);
        const usuarioId = datos.user_id;

        Usuario.findOne({ _id: usuarioId, activo: true })
            .then(usuario => {
                if (!usuario) {
                    return res.status(401).json({ detail: 'Usuario no encontrado o desactivado.' });
                }
                req.user = usuario;
                next();
            })
            .catch(() => res.status(401).json({ detail: 'Usuario no encontrado o desactivado.' }));
    } catch (error) {
        res.status(401).json({ detail: 'Token inválido o expirado.' });
    }
}

/**
 * Middleware que exige autenticacion.
 * Replica el comportamiento de DRF + simplejwt 5.x: sin credenciales
 * responde 403 con code 'not_authenticated' (el frontend lo usa para
 * redirigir al login). Tokens inválidos/expirados ya producen 401 arriba.
 */
function requerirAutenticacion(req, res, next) {
    if (!req.user) {
        return res.status(403).json({
            detail: 'Las credenciales de autenticación no fueron proporcionadas.',
            code: 'not_authenticated',
        });
    }
    next();
}

module.exports = { autenticarJWT, requerirAutenticacion };