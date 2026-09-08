/**
 * Rutas del modulo usuarios.
 * Registro y login son publicos; el resto requiere autenticacion.
 */
const express = require('express');
const ctrl = require('./usuarios.controller');
const { requerirAutenticacion } = require('../middlewares/auth');

const router = express.Router();

router.post('/registro/', ctrl.registrarUsuario);
router.post('/login/', ctrl.iniciarSesion);

router.use(requerirAutenticacion);

router.get('/perfil/', ctrl.verPerfil);
router.put('/editar/', ctrl.editarPerfil);
router.delete('/eliminar/', ctrl.eliminarCuenta);
router.post('/logout/', ctrl.cerrarSesion);

module.exports = router;