/**
 * Rutas del modulo administracion (solo admin).
 */
const express = require('express');
const ctrl = require('./administracion.controller');
const { requerirRol } = require('../middlewares/roles');

const router = express.Router();

router.use(requerirRol('administrador'));

router.get('/estadisticas/', ctrl.estadisticasGlobales);
router.post('/usuarios/crear/', ctrl.crearUsuario);
router.get('/usuarios/', ctrl.listarUsuarios);
router.get('/usuarios/:usuario_id', ctrl.detalleUsuario);
router.put('/usuarios/:usuario_id', ctrl.detalleUsuario);
router.patch('/usuarios/:usuario_id/toggle/', ctrl.toggleUsuario);

module.exports = router;