/**
 * Modelo NodoMapa (Mongoose).
 * Equivalente al documento NodoMapa de MongoEngine.
 * Coleccion: nodos_mapa
 */
const mongoose = require('mongoose');

const nodoMapaSchema = new mongoose.Schema(
    {
        texto: { type: String, required: [true, 'El texto es obligatorio'], maxlength: 200 },
        color: { type: String, maxlength: 7, default: '#00E5FF' },
        posicion_x: { type: Number, default: 0.0 },
        posicion_y: { type: Number, default: 0.0 },
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
        convertido_en_tarea: { type: Boolean, default: false },
        id_tarea_generada: { type: String, maxlength: 50, default: '' },
    },
    {
        collection: 'nodos_mapa',
        timestamps: { createdAt: 'fecha_creacion', updatedAt: false },
        toJSON: { virtuals: true, versionKey: false, transform: docToJson },
    }
);

function docToJson(doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    if (ret.fecha_creacion) ret.fecha_creacion = ret.fecha_creacion.toISOString();
    return ret;
}

nodoMapaSchema.index({ usuario: 1, convertido_en_tarea: 1 });

module.exports = mongoose.models.NodoMapa || mongoose.model('NodoMapa', nodoMapaSchema);
