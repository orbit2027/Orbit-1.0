/**
 * Controladores de estadisticas.
 * Replican las vistas de apps/estadisticas de Django.
 */
const { Tarea } = require('../models');

function inicioDelDia(fecha) {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * GET /api/estadisticas/
 * RF-EST-01/02/03: Estadísticas individuales del usuario (4 semanas).
 */
async function estadisticasUsuario(req, res) {
    const usuarioId = req.user._id;
    const ahora = new Date();

    const [total, porHacer, enProgreso, completadas] = await Promise.all([
        Tarea.countDocuments({ usuario: usuarioId }),
        Tarea.countDocuments({ usuario: usuarioId, estado: 'por_hacer' }),
        Tarea.countDocuments({ usuario: usuarioId, estado: 'en_progreso' }),
        Tarea.countDocuments({ usuario: usuarioId, estado: 'completado' }),
    ]);

    // Datos semanales de las ultimas 4 semanas (la mas antigua primero).
    const semanales = [];
    for (let i = 3; i >= 0; i--) {
        const fechaInicio = new Date(ahora.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const fechaFin = new Date(ahora.getTime() - i * 7 * 24 * 60 * 60 * 1000);

        const creadasSemana = await Tarea.countDocuments({
            usuario: usuarioId,
            fecha_creacion: { $gte: fechaInicio, $lt: fechaFin },
        });
        const completadasSemana = await Tarea.countDocuments({
            usuario: usuarioId,
            estado: 'completado',
            fecha_creacion: { $gte: fechaInicio, $lt: fechaFin },
        });

        semanales.push({
            semana: `Sem ${4 - i}`,
            creadas: creadasSemana,
            completadas: completadasSemana,
        });
    }

    return res.status(200).json({
        total,
        por_hacer: porHacer,
        en_progreso: enProgreso,
        completadas,
        semanal: semanales,
    });
}

module.exports = { estadisticasUsuario };