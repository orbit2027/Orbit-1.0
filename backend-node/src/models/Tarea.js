/**
 * Modelo de Tarea (Mongoose).
 * Equivalente al documento Tarea de MongoEngine.
 * Coleccion: tareas
 */
const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema(
    {
        titulo: { type: String, required: [true, 'El titulo es obligatorio'], maxlength: 200 },
        descripcion: { type: String, maxlength: 2000, default: '' },
        estado: {
            type: String,
            required: true,
            enum: ['por_hacer', 'en_progreso', 'completado'],
            default: 'por_hacer',
            maxlength: 20,
        },
        etiqueta: { type: String, maxlength: 50, default: '' },
        color_etiqueta: { type: String, maxlength: 7, default: '#00E5FF' },
        fecha_limite: { type: Date, default: null },
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
        // ID del nodo del mapa mental si fue creado desde RF-MAP-06
        origen_nodo: { type: String, maxlength: 50, default: '' },
        // ID del proyecto si la tarea pertenece a un proyecto (RF-PRO-03)
        proyecto: { type: String, maxlength: 50, default: '' },
    },
    {
        collection: 'tareas',
        timestamps: { createdAt: 'fecha_creacion', updatedAt: false },
        toJSON: { virtuals: true, versionKey: false, transform: docToJson },
    }
);

function docToJson(doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    if (ret.fecha_creacion) ret.fecha_creacion = ret.fecha_creacion.toISOString();
    if (ret.fecha_limite) ret.fecha_limite = ret.fecha_limite.toISOString();
    return ret;
}

tareaSchema.index({ usuario: 1, estado: 1 });
tareaSchema.index({ usuario: 1, fecha_creacion: -1 });

module.exports = mongoose.models.Tarea || mongoose.model('Tarea', tareaSchema);
