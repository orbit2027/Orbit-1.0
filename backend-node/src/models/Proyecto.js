/**
 * Modelo Proyecto (Mongoose).
 * Equivalente al documento Proyecto de MongoEngine.
 * Coleccion: proyectos
 */
const mongoose = require('mongoose');

const proyectoSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: [true, 'El nombre es obligatorio'], maxlength: 150 },
        descripcion: { type: String, maxlength: 500, default: '' },
        color: { type: String, maxlength: 7, default: '#00E5FF' },
        estado: {
            type: String,
            enum: ['activo', 'archivado'],
            default: 'activo',
            maxlength: 20,
        },
        fecha_limite: { type: Date, default: null },
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    },
    {
        collection: 'proyectos',
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

proyectoSchema.index({ usuario: 1, estado: 1 });
proyectoSchema.index({ usuario: 1, fecha_creacion: -1 });

module.exports = mongoose.models.Proyecto || mongoose.model('Proyecto', proyectoSchema);