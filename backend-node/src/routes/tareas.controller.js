/**
 * Controladores de tareas.
 * Replican las vistas de apps/tareas de Django.
 */
const mongoose = require('mongoose');
const { Tarea } = require('../models');

const ESTADOS_VALIDOS = ['por_hacer', 'en_progreso', 'completado'];

function serializarTarea(tarea) {
    return {
        id: String(tarea._id),
        titulo: tarea.titulo,
        descripcion: tarea.descripcion || '',
        estado: tarea.estado,
        etiqueta: tarea.etiqueta || '',
        color_etiqueta: tarea.color_etiqueta,
        fecha_limite: tarea.fecha_limite ? tarea.fecha_limite.toISOString() : null,
        origen_nodo: tarea.origen_nodo || '',
        proyecto: tarea.proyecto || '',
        fecha_creacion: tarea.fecha_creacion ? tarea.fecha_creacion.toISOString() : null,
    };
}

/**
 * GET/POST /api/tareas/
 */
async function listaTareas(req, res) {
    if (req.method !== 'POST') {
        // GET: listar tareas del usuario ordenadas por fecha (desc)
        const tareas = await Tarea.find({ usuario: req.user._id }).sort({ fecha_creacion: -1 });
        return res.status(200).json(tareas.map(serializarTarea));
    }

    // POST: crear tarea
    const { titulo, descripcion, estado, etiqueta, color_etiqueta, fecha_limite, proyecto } = req.body || {};

    if (!titulo || !String(titulo).trim()) {
        return res.status(400).json({ titulo: ['El título no puede estar vacío.'] });
    }
    if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({ estado: [`Estado no válido. Opciones: ${ESTADOS_VALIDOS.join(', ')}`] });
    }

    let fechaLimite = null;
    if (fecha_limite) {
        fechaLimite = new Date(fecha_limite);
        if (isNaN(fechaLimite.getTime())) fechaLimite = null;
    }

    const tarea = new Tarea({
        titulo: String(titulo).trim(),
        descripcion: descripcion || '',
        estado: estado || 'por_hacer',
        etiqueta: etiqueta || '',
        color_etiqueta: color_etiqueta || '#00E5FF',
        fecha_limite: fechaLimite,
        proyecto: proyecto || '',
        usuario: req.user._id,
    });
    await tarea.save();
    return res.status(201).json(serializarTarea(tarea));
}

/**
 * GET/PUT/PATCH/DELETE /api/tareas/:id
 */
async function detalleTarea(req, res) {
    const { tarea_id } = req.params;

    if (!mongoose.isValidObjectId(tarea_id)) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const tarea = await Tarea.findOne({ _id: tarea_id, usuario: req.user._id });
    if (!tarea) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const metodo = req.method;

    if (metodo === 'GET') {
        return res.status(200).json(serializarTarea(tarea));
    }

    if (metodo === 'PUT' || metodo === 'PATCH') {
        const { titulo, descripcion, estado, etiqueta, color_etiqueta, fecha_limite, proyecto } = req.body || {};
        const parcial = metodo === 'PATCH';

        const errores = {};
        if (titulo !== undefined && !String(titulo).trim()) {
            errores.titulo = ['El título no puede estar vacío.'];
        }
        if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado)) {
            errores.estado = [`Estado no válido. Opciones: ${ESTADOS_VALIDOS.join(', ')}`];
        }
        if (Object.keys(errores).length > 0) {
            return res.status(400).json(errores);
        }

        if (!parcial || titulo !== undefined) tarea.titulo = String(titulo || tarea.titulo).trim();
        if (!parcial || descripcion !== undefined) tarea.descripcion = descripcion || '';
        if (!parcial || estado !== undefined) tarea.estado = estado || 'por_hacer';
        if (!parcial || etiqueta !== undefined) tarea.etiqueta = etiqueta || '';
        if (!parcial || color_etiqueta !== undefined) tarea.color_etiqueta = color_etiqueta || '#00E5FF';
        if (!parcial || fecha_limite !== undefined) {
            if (fecha_limite) {
                const f = new Date(fecha_limite);
                tarea.fecha_limite = isNaN(f.getTime()) ? null : f;
            } else {
                tarea.fecha_limite = null;
            }
        }
        if (!parcial || proyecto !== undefined) tarea.proyecto = proyecto || '';

        await tarea.save();
        return res.status(200).json(serializarTarea(tarea));
    }

    if (metodo === 'DELETE') {
        await Tarea.deleteOne({ _id: tarea._id });
        return res.status(200).json({ mensaje: 'Tarea eliminada' });
    }
}

module.exports = { listaTareas, detalleTarea, serializarTarea };