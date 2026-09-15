/**
 * Crea o actualiza la cuenta de administrador inicial.
 */
const config = require('../src/config');
const { conectarDB } = require('../src/config/db');
const { Usuario } = require('../src/models');

async function crearAdmin() {
    await conectarDB();

    const correo = process.env.ADMIN_CORREO || 'admin@orbit.local';
    const contrasena = process.env.ADMIN_CONTRASENA || 'Admin1234';
    const nombre = process.env.ADMIN_NOMBRE || 'App Admin';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        console.error('Correo de administrador invalido.');
        process.exit(1);
    }

    const existente = await Usuario.findOne({ correo: correo.toLowerCase().trim() });
    if (existente) {
        console.log('El administrador ya existe, no se modifica.');
        process.exit(0);
    }

    const admin = new Usuario({
        nombre_completo: nombre,
        correo: correo.toLowerCase().trim(),
        rol: 'administrador',
    });
    admin.definirContrasena(contrasena);
    await admin.save();

    console.log(`Administrador creado: ${correo}`);
    process.exit(0);
}

crearAdmin().catch(err => {
    console.error('Error creando el administrador:', err);
    process.exit(1);
});