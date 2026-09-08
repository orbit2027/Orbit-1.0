/**
 * Modelo ConexionNodo (Mongoose).
 * Equivalente al documento ConexionNodo de MongoEngine.
 * Coleccion: conexiones_nodo
 */
const mongoose = require('mongoose');

const conexionNodoSchema = new mongoose.Schema(
    {
        nodo_origen: { type: mongoose.Schema.Types.ObjectId, ref: 'NodoMapa', required: true, index: true },
        nodo_destino: { type: mongoose.Schema.Types.ObjectId, ref: 'NodoMapa', required: true, index: true },
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    },
    {
        collection: 'conexiones_nodo',
        timestamps: false,
        toJSON: { virtuals: true, versionKey: false, transform: docToJson },
    }
);

function docToJson(doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    ret.nodo_origen = String(ret.nodo_origen);
    ret.nodo_destino = String(ret.nodo_destino);
    return ret;
}

conexionNodoSchema.index({ usuario: 1, nodo_origen: 1, nodo_destino: 1 });

module.exports = mongoose.models.ConexionNodo || mongoose.model('ConexionNodo', conexionNodoSchema);