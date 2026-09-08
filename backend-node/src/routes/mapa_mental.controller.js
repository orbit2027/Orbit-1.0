/**
 * Controladores de mapa mental.
 * Replican las vistas de apps/mapa_mental de Django.
 */
const mongoose = require('mongoose');
const { NodoMapa, ConexionNodo, Tarea } = require('../models');

const esObjIdValido = (id) => mongoose.isValidObjectId(id);

function serializarNodo(nodo) {
    return {
        id: String(nodo._id),
        texto: nodo.texto,
        color: nodo.color,
        posicion_x: nodo.posicion_x,
        posicion_y: nodo.posicion_y,
        convertido_en_tarea: Boolean(nodo.convertido_en_tarea),
        id_tarea_generada: nodo.id_tarea_generada || '',
        fecha_creacion: nodo.fecha_creacion ? nodo.fecha_creacion.toISOString() : null,
    };
}

function serializarConexion(conexion) {
    return {
        id: String(conexion._id),
        nodo_origen: String(conexion.nodo_origen),
        nodo_destino: String(conexion.nodo_destino),
    };
}

/**
 * GET /api/mapa-mental/
 * RF-MAP-05: Mapa completo del usuario (nodos + conexiones).
 */
async function mapaCompleto(req, res) {
    const nodos = await NodoMapa.find({ usuario: req.user._id });
    const conexiones = await ConexionNodo.find({ usuario: req.user._id });
    return res.status(200).json({
        nodos: nodos.map(serializarNodo),
        conexiones: conexiones.map(serializarConexion),
    });
}

/**
 * POST /api/mapa-mental/nodos/
 * RF-MAP-01: Crear nodo.
 */
async function crearNodo(req, res) {
    const { texto, color, posicion_x, posicion_y } = req.body || {};

    const errores = {};
    if (!texto || !String(texto).trim()) {
        errores.texto = ['El texto del nodo no puede estar vacío.'];
    }
    if (Object.keys(errores).length > 0) {
        return res.status(400).json(errores);
    }

    const nodo = new NodoMapa({
        texto: String(texto).trim(),
        color: color || '#00E5FF',
        posicion_x: typeof posicion_x === 'number' ? posicion_x : 0.0,
        posicion_y: typeof posicion_y === 'number' ? posicion_y : 0.0,
        usuario: req.user._id,
    });
    await nodo.save();
    return res.status(201).json(serializarNodo(nodo));
}

/**
 * PATCH/DELETE /api/mapa-mental/nodos/:nodo_id
 * RF-MAP-03/04: Editar o eliminar nodo (y sus conexiones).
 */
async function detalleNodo(req, res) {
    const { nodo_id } = req.params;
    if (!esObjIdValido(nodo_id)) {
        return res.status(404).json({ error: 'Nodo no encontrado' });
    }

    const nodo = await NodoMapa.findOne({ _id: nodo_id, usuario: req.user._id });
    if (!nodo) {
        return res.status(404).json({ error: 'Nodo no encontrado' });
    }

    if (req.method === 'PATCH') {
        const { texto, color, posicion_x, posicion_y } = req.body || {};
        if (texto !== undefined && !String(texto).trim()) {
            return res.status(400).json({ texto: ['El texto del nodo no puede estar vacío.'] });
        }
        if (texto !== undefined) nodo.texto = String(texto).trim();
        if (color !== undefined) nodo.color = color;
        if (posicion_x !== undefined) nodo.posicion_x = posicion_x;
        if (posicion_y !== undefined) nodo.posicion_y = posicion_y;
        await nodo.save();
        return res.status(200).json(serializarNodo(nodo));
    }

    if (req.method === 'DELETE') {
        await ConexionNodo.deleteMany({ $or: [{ nodo_origen: nodo._id }, { nodo_destino: nodo._id }], usuario: req.user._id });
        await NodoMapa.deleteOne({ _id: nodo._id });
        return res.status(200).json({ mensaje: 'Nodo y conexiones eliminados' });
    }
}

/**
 * POST /api/mapa-mental/conexiones/
 * RF-MAP-02: Crear conexión visual entre dos nodos.
 */
async function crearConexion(req, res) {
    const { nodo_origen, nodo_destino } = req.body || {};

    if (!nodo_origen || !nodo_destino) {
        return res.status(400).json({ error: 'Se requieren los nodos de origen y destino.' });
    }
    if (nodo_origen === nodo_destino) {
        return res.status(400).json({ error: 'No se puede conectar un nodo consigo mismo.' });
    }

    if (!esObjIdValido(nodo_origen) || !esObjIdValido(nodo_destino)) {
        return res.status(400).json({ error: 'Nodo no encontrado' });
    }

    const origen = await NodoMapa.findOne({ _id: nodo_origen, usuario: req.user._id });
    const destino = await NodoMapa.findOne({ _id: nodo_destino, usuario: req.user._id });
    if (!origen || !destino) {
        return res.status(400).json({ error: 'Nodo no encontrado' });
    }

    const conexion = new ConexionNodo({
        nodo_origen: origen._id,
        nodo_destino: destino._id,
        usuario: req.user._id,
    });
    await conexion.save();
    return res.status(201).json(serializarConexion(conexion));
}

/**
 * DELETE /api/mapa-mental/conexiones/:conexion_id
 * Eliminar una conexión.
 */
async function eliminarConexion(req, res) {
    const { conexion_id } = req.params;
    if (!esObjIdValido(conexion_id)) {
        return res.status(404).json({ error: 'Conexión no encontrada' });
    }

    const conexion = await ConexionNodo.findOneAndDelete({ _id: conexion_id, usuario: req.user._id });
    if (!conexion) {
        return res.status(404).json({ error: 'Conexión no encontrada' });
    }
    return res.status(200).json({ mensaje: 'Conexión eliminada' });
}

/**
 * POST /api/mapa-mental/nodos/:nodo_id/convertir-tarea/
 * RF-MAP-06: Convertir nodo en una única tarea Kanban (sin duplicados).
 */
async function convertirNodoEnTarea(req, res) {
    const { nodo_id } = req.params;
    if (!esObjIdValido(nodo_id)) {
        return res.status(404).json({ error: 'Nodo no encontrado' });
    }

    const nodo = await NodoMapa.findOne({ _id: nodo_id, usuario: req.user._id });
    if (!nodo) {
        return res.status(404).json({ error: 'Nodo no encontrado' });
    }

    if (nodo.convertido_en_tarea) {
        return res.status(400).json({ error: 'Este nodo ya fue convertido en tarea' });
    }

    const tarea = new Tarea({
        titulo: nodo.texto,
        descripcion: (req.body && req.body.descripcion) || '',
        estado: 'por_hacer',
        usuario: req.user._id,
        origen_nodo: String(nodo._id),
        color_etiqueta: nodo.color,
    });

    if (req.body && req.body.etiqueta) tarea.etiqueta = req.body.etiqueta;
    if (req.body && req.body.color_etiqueta) tarea.color_etiqueta = req.body.color_etiqueta;
    if (req.body && req.body.fecha_limite) {
        const f = new Date(req.body.fecha_limite);
        tarea.fecha_limite = isNaN(f.getTime()) ? null : f;
    }

    await tarea.save();

    nodo.convertido_en_tarea = true;
    nodo.id_tarea_generada = String(tarea._id);
    await nodo.save();

    return res.status(201).json({
        mensaje: 'Nodo convertido en tarea exitosamente',
        tarea_id: String(tarea._id),
    });
}

module.exports = {
    mapaCompleto,
    crearNodo,
    detalleNodo,
    crearConexion,
    eliminarConexion,
    convertirNodoEnTarea,
    serializarNodo,
    serializarConexion,
};