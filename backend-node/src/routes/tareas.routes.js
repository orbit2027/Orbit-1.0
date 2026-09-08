/**
 * Rutas del modulo tareas.
 */
const express = require('express');
const ctrl = require('./tareas.controller');

const router = express.Router();

router.get('/', ctrl.listaTareas);
router.post('/', ctrl.listaTareas);
router.get('/:tarea_id', ctrl.detalleTarea);
router.put('/:tarea_id', ctrl.detalleTarea);
router.patch('/:tarea_id', ctrl.detalleTarea);
router.delete('/:tarea_id', ctrl.detalleTarea);

module.exports = router;