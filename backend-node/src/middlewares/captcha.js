/**
 * Middleware de verificacion de reCAPTCHA v2 (registro y login).
 * Replica el VerificarCaptchaMiddleware de Django.
 */
const { verificarCaptcha } = require('../utils/captcha');

const RUTAS_CAPTCHA = ['/api/usuarios/registro/', '/api/usuarios/login/'];

async function verificarCaptchaRoute(req, res, next) {
    if (req.method === 'POST' && RUTAS_CAPTCHA.includes(req.path)) {
        const token = req.body && req.body.captcha_token;
        const valido = await verificarCaptcha(token);
        if (!valido) {
            return res.status(403).json({ error: 'Verificación CAPTCHA fallida' });
        }
    }
    next();
}

module.exports = { verificarCaptchaRoute };