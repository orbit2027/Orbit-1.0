/**
 * Carga de variables de entorno.
 * Lee el archivo .env de la raiz del backend-node.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

module.exports = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/orbit',
    RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY || '',
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || 'clave_secreta_por_defecto',
    JWT_ACCESS_TOKEN_LIFETIME: parseInt(process.env.JWT_ACCESS_TOKEN_LIFETIME || '24', 10),
    JWT_REFRESH_TOKEN_LIFETIME: parseInt(process.env.JWT_REFRESH_TOKEN_LIFETIME || '7', 10),
    CORS_ALLOWED_ORIGINS: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5500')
        .split(',').map(s => s.trim()).filter(Boolean),
    PORT: parseInt(process.env.PORT || '4000', 10),
    DEBUG: (process.env.DEBUG || 'true') === 'true',
};
