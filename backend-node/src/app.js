/**
 * Configuracion principal de la aplicacion Express.
 */
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { verificarCaptchaRoute } = require('./middlewares/captcha');
const { autenticarJWT, requerirAutenticacion } = require('./middlewares/auth');

const app = express();

app.use(cors({
    origin(origin, callback) {
        // Permitir origenes sin header (curl, pruebas locales) y los configurados.
        if (!origin || config.CORS_ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Verificacion de reCAPTCHA global (se aplica a registro/login).
app.use(verificarCaptchaRoute);

// Autenticacion JWT global: si hay token valido, deja req.user;
// de lo contrario continua y cada ruta protegida decide (403/401).
app.use(autenticarJWT);

// Montaje de modulos. Registro y login son publicos (AllowAny en Django);
// el resto exige autenticacion (403 con code not_authenticated si falta token).
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/tareas', requerirAutenticacion, require('./routes/tareas.routes'));
app.use('/api/mapa-mental', requerirAutenticacion, require('./routes/mapa_mental.routes'));
app.use('/api/estadisticas', requerirAutenticacion, require('./routes/estadisticas.routes'));
app.use('/api/administracion', requerirAutenticacion, require('./routes/administracion.routes'));
app.use('/api/proyectos', requerirAutenticacion, require('./routes/proyectos.routes'));

// Ruta de salud
app.get('/api/salud/', (req, res) => res.status(200).json({ estado: 'ok' }));

// 404 para rutas no registradas
app.use((req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado' });
});

// Manejador de errores central
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err && err.message === 'No permitido por CORS') {
        return res.status(403).json({ error: 'Origen no permitido por CORS' });
    }
    console.error('Error no controlado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;