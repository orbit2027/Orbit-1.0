/**
 * utilidades: verificacion de reCAPTCHA v2 del lado del servidor.
 * Replica el middleware de verificar_captcha de Django.
 */
const config = require('../config');

/**
 * Verifica el token de reCAPTCHA con el servidor de Google.
 * Retorna true si pasa, false en caso contrario.
 */
async function verificarCaptcha(tokenCaptcha) {
    if (!config.RECAPTCHA_SECRET_KEY) {
        // En desarrollo sin claves, permitir peticiones
        return true;
    }
    if (!tokenCaptcha) {
        return false;
    }

    const url = 'https://www.google.com/recaptcha/api/siteverify';
    const cuerpo = new URLSearchParams();
    cuerpo.append('secret', config.RECAPTCHA_SECRET_KEY);
    cuerpo.append('response', tokenCaptcha);

    try {
        const respuesta = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: cuerpo.toString(),
        });
        const resultado = await respuesta.json();
        return Boolean(resultado.success);
    } catch (error) {
        // Si falla la conexion con Google, permitir en desarrollo
        return config.DEBUG;
    }
}

module.exports = { verificarCaptcha };
