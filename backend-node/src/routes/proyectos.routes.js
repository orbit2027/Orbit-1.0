/**
 * Rutas del modulo proyectos.
 * Nota: 'admin/todos/' se registra ANTES que ':proyecto_id'
 * para no ser capturado por el parametro (igual que en Django).
 */
const express = require('express');
const ctrl = require('./proyectos.controller');
const { requerirRol } = require('../middlewares/roles');

const router = express.Router();

router.get('/admin/todos/', requerirRol('administrador'), ctrl.proyectosTodos);
router.get('/', ctrl.listaProyectos);
router.post('/', ctrl.listaProyectos);
router.get('/:proyecto_id', ctrl.detalleProyecto);
router.put('/:proyecto_id', ctrl.detalleProyecto);
router.patch('/:proyecto_id', ctrl.detalleProyecto);
router.delete('/:proyecto_id', ctrl.detalleProyecto);
router.patch('/:proyecto_id/archivar/', ctrl.archivarProyecto);

module.exports = router;