/**
 * Controladores de administracion (solo rol administrador).
 * Replican las vistas de apps/administracion de Django.
 */
const mongoose = require('mongoose');
const { Usuario, Tarea } = require('../models');

const MESES_CORTOS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function serializarUsuarioAdmin(usuario) {
    return {
        id: String(usuario._id),
        nombre_completo: usuario.nombre_completo,
        correo: usuario.correo,
        rol: usuario.rol,
        activo: Boolean(usuario.activo),
        fecha_registro: usuario.fecha_registro ? usuario.fecha_registro.toISOString() : null,
    };
}

/**
 * GET /api/administracion/estadisticas/
 * Estadisticas globales del sistema para el admin.
 */
async function estadisticasGlobales(req, res) {
    const ahora = new Date();
    const inicioDia = new Date(ahora);
    inicioDia.setHours(0, 0, 0, 0);

    const [totalUsuarios, tareasActivas, completadasHoy, activosHoy] = await Promise.all([
        Usuario.countDocuments({}),
        Tarea.countDocuments({ estado: { $in: ['por_hacer', 'en_progreso'] } }),
        Tarea.countDocuments({ estado: 'completado', fecha_creacion: { $gte: inicioDia } }),
        Usuario.countDocuments({ activo: true, fecha_registro: { $gte: inicioDia } }),
    ]);

    // Crecimiento mensual de los ultimos 6 meses.
    const crecimiento = [];
    for (let i = 5; i >= 0; i--) {
        const fechaInicio = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000 * (i + 1));
        const fechaFin = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000 * i);

        const registros = await Usuario.countDocuments({
            fecha_registro: { $gte: fechaInicio, $lt: fechaFin },
        });

        crecimiento.push({
            mes: MESES_CORTOS[fechaInicio.getMonth()],
            registros,
        });
    }

    return res.status(200).json({
        total_usuarios: totalUsuarios,
        tareas_activas: tareasActivas,
        completadas_hoy: completadasHoy,
        activos_hoy: activosHoy,
        crecimiento_mensual: crecimiento,
    });
}

/**
 * GET /api/administracion/usuarios/
 * RF-GES-02: Listar todos los usuarios.
 */
async function listarUsuarios(req, res) {
    const usuarios = await Usuario.find({}).sort({ fecha_registro: -1 });
    return res.status(200).json(usuarios.map(serializarUsuarioAdmin));
}

/**
 * POST /api/administracion/usuarios/crear/
 * Crear un usuario desde el panel de admin.
 */
async function crearUsuario(req, res) {
    const { nombre_completo, correo, contrasena, rol } = req.body || {};

    const errores = {};
    if (!nombre_completo || !String(nombre_completo).trim()) {
        errores.nombre_completo = ['Este campo es obligatorio.'];
    }
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        errores.correo = ['Ingrese un correo electrónico válido.'];
    }
    if (!contrasena || String(contrasena).length < 8) {
        errores.contrasena = ['La contraseña debe tener al menos 8 caracteres.'];
    } else if (!/[A-Z]/.test(contrasena)) {
        errores.contrasena = ['La contraseña debe tener al menos una mayúscula.'];
    } else if (!/\d/.test(contrasena)) {
        errores.contrasena = ['La contraseña debe tener al menos un número.'];
    }
    const rolValido = ['usuario', 'administrador'].includes(rol);
    if (!rolValido) {
        errores.rol = ['Seleccione un rol válido.'];
    }
    if (Object.keys(errores).length > 0) {
        return res.status(400).json(errores);
    }

    const correoNormalizado = String(correo).toLowerCase().trim();
    const existente = await Usuario.findOne({ correo: correoNormalizado });
    if (existente) {
        return res.status(400).json({ correo: ['Este correo ya esta registrado.'] });
    }

    const usuario = new Usuario({
        nombre_completo: String(nombre_completo).trim(),
        correo: correoNormalizado,
        rol: rolValido ? rol : 'usuario',
    });
    usuario.definirContrasena(contrasena);
    await usuario.save();

    return res.status(201).json(serializarUsuarioAdmin(usuario));
}

/**
 * GET/PUT /api/administracion/usuarios/:usuario_id/
 * Ver detalle o editar un usuario.
 */
async function detalleUsuario(req, res) {
    const { usuario_id } = req.params;
    if (!mongoose.isValidObjectId(usuario_id)) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = await Usuario.findById(usuario_id);
    if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (req.method === 'GET') {
        return res.status(200).json(serializarUsuarioAdmin(usuario));
    }

    if (req.method === 'PUT') {
        const { nombre_completo, correo, rol } = req.body || {};
        const errores = {};

        if (nombre_completo !== undefined) {
            if (!String(nombre_completo).trim()) {
                errores.nombre_completo = ['Este campo es obligatorio.'];
            } else {
                usuario.nombre_completo = String(nombre_completo).trim();
            }
        }
        if (correo !== undefined) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
                errores.correo = ['Ingrese un correo electrónico válido.'];
            } else {
                const enUso = await Usuario.findOne({
                    correo: String(correo).toLowerCase().trim(),
                    _id: { $ne: usuario._id },
                });
                if (enUso) {
                    errores.correo = ['Este correo ya esta en uso.'];
                } else {
                    usuario.correo = String(correo).toLowerCase().trim();
                }
            }
        }
        if (rol !== undefined) {
            if (['usuario', 'administrador'].includes(rol)) {
                usuario.rol = rol;
            } else {
                errores.rol = ['Seleccione un rol válido.'];
            }
        }

        if (Object.keys(errores).length > 0) {
            return res.status(400).json(errores);
        }

        await usuario.save();
        return res.status(200).json(serializarUsuarioAdmin(usuario));
    }
}

/**
 * PATCH /api/administracion/usuarios/:usuario_id/toggle/
 * Activar/desactivar usuario (el admin nunca elimina).
 */
async function toggleUsuario(req, res) {
    const { usuario_id } = req.params;
    if (!mongoose.isValidObjectId(usuario_id)) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = await Usuario.findById(usuario_id);
    if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    usuario.activo = !usuario.activo;
    await usuario.save();

    return res.status(200).json({
        mensaje: `Usuario ${usuario.activo ? 'activado' : 'desactivado'}`,
        activo: usuario.activo,
    });
}

module.exports = {
    estadisticasGlobales,
    listarUsuarios,
    crearUsuario,
    detalleUsuario,
    toggleUsuario,
    serializarUsuarioAdmin,
};