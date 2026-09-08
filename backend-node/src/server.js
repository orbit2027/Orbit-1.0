/**
 * Arranque del servidor.
 */
const app = require('./app');
const config = require('./config');
const { conectarDB } = require('./config/db');

async function iniciar() {
    await conectarDB();
    app.listen(config.PORT, () => {
        console.log(`Orbit Node.js API corriendo en http://localhost:${config.PORT}/api`);
    });
}

iniciar().catch(err => {
    console.error('No se pudo iniciar el servidor:', err);
    process.exit(1);
});