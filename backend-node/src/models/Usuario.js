/**
 * Modelo de Usuario (Mongoose).
 * Equivalente al documento Usuario de MongoEngine.
 * Coleccion: usuarios
 */
const mongoose = require('mongoose');
const { cifrarContrasena, verificarContrasena } = require('../utils/password');

const usuarioSchema = new mongoose.Schema(
    {
        nombre_completo: { type: String, required: [true, 'El nombre es obligatorio'], maxlength: 150 },
        correo: {
            type: String,
            required: [true, 'El correo es obligatorio'],
            unique: true,
            maxlength: 254,
            lowercase: true,
            trim: true,
        },
        contrasena: { type: String, required: true, maxlength: 128 },
        rol: {
            type: String,
            required: true,
            enum: ['usuario', 'administrador'],
            default: 'usuario',
            maxlength: 20,
        },
        activo: { type: Boolean, default: true },
    },
    {
        collection: 'usuarios',
        timestamps: { createdAt: 'fecha_registro', updatedAt: false },
        toJSON: { virtuals: true, versionKey: false, transform: docToJson },
    }
);

function docToJson(doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.contrasena;
    return ret;
}

// ── Metodos de instancia (equivalentes a set_contrasena/verificar) ──
usuarioSchema.methods.definirContrasena = function (plana) {
    this.contrasena = cifrarContrasena(plana);
};

usuarioSchema.methods.validarContrasena = function (plana) {
    return verificarContrasena(plana, this.contrasena);
};

usuarioSchema.index({ rol: 1, activo: 1 });

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);
