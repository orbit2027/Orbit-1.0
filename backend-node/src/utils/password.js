/**
 * utilidades: cifrado de contrasenas con bcryptjs (rounds 10)
 * Equivalente al set_contrasena/verificar_contrasena de MongoEngine + bcrypt.
 */
const bcrypt = require('bcryptjs');

const ROUNDS = 10;

function cifrarContrasena(contrasenaPlana) {
    return bcrypt.hashSync(contrasenaPlana, ROUNDS);
}

function verificarContrasena(contrasenaPlana, hash) {
    return bcrypt.compareSync(contrasenaPlana, hash);
}

module.exports = { cifrarContrasena, verificarContrasena, ROUNDS };
