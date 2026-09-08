/**
 * Controladores de proyectos.
 * Replican las vistas de apps/proyectos de Django (RF-PRO-01 al 06).
 */
const mongoose = require('mongoose');
const { Proyecto, Tarea, Usuario } = require('../models');

function serializarProyecto(proyecto) {
    return {
        id: String(proyecto._id),
        nombre: proyecto.nombre,
        descripcion: proyecto.descripcion || '',
        color: proyecto.color,
        estado: proyecto.estado,
        fecha_limite: proyecto.fecha_limite ? proyecto.fecha_limite.toISOString() : null,
        fecha_creacion: proyecto.fecha_creacion ? proyecto.fecha_creacion.toISOString() : null,
    };
}

async function serializarConMetricas(proyecto) {
    const datos = serializarProyecto(proyecto);
    const [totales, completadas, activas] = await Promise.all([
        Tarea.countDocuments({ proyecto: String(proyecto._id) }),
        Tarea.countDocuments({ proyecto: String(proyecto._id), estado: 'completado' }),
        Tarea.countDocuments({ proyecto: String(proyecto._id), estado: { $in: ['por_hacer', 'en_progreso'] } }),
    ]);
    datos.tareas_totales = totales;
    datos.tareas_completadas = completadas;
    datos.tareas_activas = activas;
    return datos;
}

/**
 * GET/POST /api/proyectos/
 * Crear o listar los proyectos propios.
 */
async function listaProyectos(req, res) {
    if (req.method === 'GET') {
        const proyectos = await Proyecto.find({ usuario: req.user._id }).sort({ fecha_creacion: -1 });
        const resultado = [];
        for (const p of proyectos) {
            resultado.push(await serializarConMetricas(p));
        }
        return res.status(200).json(resultado);
    }

    // POST
    const { nombre, descripcion, color, estado, fecha_limite } = req.body || {};
    const errores = {};
    if (!nombre || !String(nombre).trim()) {
        errores.nombre = ['El nombre del proyecto no puede estar vacío.'];
    }
    if (estado !== undefined && !['activo', 'archivado'].includes(estado)) {
        errores.estado = ['Seleccione un estado válido.'];
    }
    if (Object.keys(errores).length > 0) {
        return res.status(400).json(errores);
    }

    let fechaLimite = null;
    if (fecha_limite) {
        const f = new Date(fecha_limite);
        fechaLimite = isNaN(f.getTime()) ? null : f;
    }

    const proyecto = new Proyecto({
        nombre: String(nombre).trim(),
        descripcion: descripcion || '',
        color: color || '#00E5FF',
        estado: estado || 'activo',
        fecha_limite: fechaLimite,
        usuario: req.user._id,
    });
    await proyecto.save();
    return res.status(201).json(serializarProyecto(proyecto));
}

/**
 * GET/PUT/PATCH/DELETE /api/proyectos/:proyecto_id/
 */
async function detalleProyecto(req, res) {
    const { proyecto_id } = req.params;
    if (!mongoose.isValidObjectId(proyecto_id)) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const proyecto = await Proyecto.findOne({ _id: proyecto_id, usuario: req.user._id });
    if (!proyecto) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    if (req.method === 'GET') {
        const datos = await serializarConMetricas(proyecto);
        const tareas = await Tarea.find({ proyecto: String(proyecto._id) }).sort({ fecha_creacion: -1 });
        datos.tareas = tareas.map(t => ({
            id: String(t._id),
            titulo: t.titulo,
            estado: t.estado,
            etiqueta: t.etiqueta || '',
            color_etiqueta: t.color_etiqueta,
            fecha_limite: t.fecha_limite ? t.fecha_limite.toISOString() : null,
        }));
        return res.status(200).json(datos);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
        const { nombre, descripcion, color, estado, fecha_limite } = req.body || {};
        const parcial = req.method === 'PATCH';
        const errores = {};

        if (nombre !== undefined) {
            if (!String(nombre).trim()) {
                errores.nombre = ['El nombre del proyecto no puede estar vacío.'];
            } else {
                proyecto.nombre = String(nombre).trim();
            }
        } else if (!parcial && !nombre) {
            errores.nombre = ['El nombre del proyecto no puede estar vacío.'];
        }
        if (estado !== undefined && !['activo', 'archivado'].includes(estado)) {
            errores.estado = ['Seleccione un estado válido.'];
        } else if (estado !== undefined) {
            proyecto.estado = estado;
        }

        if (Object.keys(errores).length > 0) {
            return res.status(400).json(errores);
        }

        if (descripcion !== undefined) proyecto.descripcion = descripcion || '';
        if (color !== undefined) proyecto.color = color || '#00E5FF';
        if (fecha_limite !== undefined) {
            if (fecha_limite) {
                const f = new Date(fecha_limite);
                proyecto.fecha_limite = isNaN(f.getTime()) ? null : f;
            } else {
                proyecto.fecha_limite = null;
            }
        }

        await proyecto.save();
        return res.status(200).json(await serializarConMetricas(proyecto));
    }

    if (req.method === 'DELETE') {
        // Las tareas del proyecto se conservan, solo se desvinculan.
        await Tarea.updateMany({ proyecto: String(proyecto._id) }, { $set: { proyecto: '' } });
        await Proyecto.deleteOne({ _id: proyecto._id });
        return res.status(200).json({ mensaje: 'Proyecto eliminado' });
    }
}

/**
 * PATCH /api/proyectos/:proyecto_id/archivar/
 * Archivar/restaurar proyecto (toggle de estado).
 */
async function archivarProyecto(req, res) {
    const { proyecto_id } = req.params;
    if (!mongoose.isValidObjectId(proyecto_id)) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const proyecto = await Proyecto.findOne({ _id: proyecto_id, usuario: req.user._id });
    if (!proyecto) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    proyecto.estado = proyecto.estado === 'activo' ? 'archivado' : 'activo';
    await proyecto.save();

    return res.status(200).json({
        mensaje: `Proyecto ${proyecto.estado === 'archivado' ? 'archivado' : 'restaurado'}`,
        estado: proyecto.estado,
    });
}

/**
 * GET /api/proyectos/admin/todos/
 * Proyectos de todos los usuarios (solo admin), con propietario.
 */
async function proyectosTodos(req, res) {
    const proyectos = await Proyecto.find({}).sort({ fecha_creacion: -1 });
    const resultado = [];
    for (const p of proyectos) {
        const datos = await serializarConMetricas(p);
        const propietario = await Usuario.findById(p.usuario);
        datos.propietario = propietario ? propietario.nombre_completo : 'Usuario eliminado';
        resultado.push(datos);
    }
    return res.status(200).json(resultado);
}

module.exports = {
    listaProyectos,
    detalleProyecto,
    archivarProyecto,
    proyectosTodos,
    serializarProyecto,
    serializarConMetricas,
};