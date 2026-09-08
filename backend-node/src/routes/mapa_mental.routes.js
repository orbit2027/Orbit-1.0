/**
 * Rutas del modulo mapa mental.
 */
const express = require('express');
const ctrl = require('./mapa_mental.controller');

const router = express.Router();

router.get('/', ctrl.mapaCompleto);
router.post('/nodos/', ctrl.crearNodo);
router.patch('/nodos/:nodo_id', ctrl.detalleNodo);
router.delete('/nodos/:nodo_id', ctrl.detalleNodo);
router.post('/nodos/:nodo_id/convertir-tarea/', ctrl.convertirNodoEnTarea);
router.post('/conexiones/', ctrl.crearConexion);
router.delete('/conexiones/:conexion_id', ctrl.eliminarConexion);

module.exports = router;