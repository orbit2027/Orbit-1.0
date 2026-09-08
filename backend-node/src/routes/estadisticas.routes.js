/**
 * Rutas del modulo estadisticas.
 */
const express = require('express');
const ctrl = require('./estadisticas.controller');

const router = express.Router();

router.get('/', ctrl.estadisticasUsuario);

module.exports = router;