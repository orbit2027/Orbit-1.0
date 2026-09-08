/**
 * Controladores de usuarios.
 * Replican las vistas de apps/usuarios de Django.
 */
const { Usuario, Tarea, NodoMapa, ConexionNodo } = require('../models');
const { generarTokens } = require('../utils/jwt');
const { verificarContrasena, cifrarContrasena } = require('../utils/password');

// Validadores compartidos
const esCorreoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const tieneMayuscula = (v) => /[A-Z]/.test(v);
const tieneNumero = (v) => /\d/.test(v);

function serializarPerfil(usuario) {
    return {
        id: String(usuario._id),
        nombre_completo: usuario.nombre_completo,
        correo: usuario.correo,
        rol: usuario.rol,
        fecha_registro: usuario.fecha_registro ? usuario.fecha_registro.toISOString() : null,
    };
}

/**
 * RF-USU-01: Registro de nuevo usuario con CAPTCHA.
 */
async function registrarUsuario(req, res) {
    const { nombre_completo, correo, contrasena } = req.body || {};

    // Validacion de campos
    const errores = {};
    if (!nombre_completo || !String(nombre_completo).trim()) {
        errores.nombre_completo = ['El nombre es obligatorio.'];
    }
    if (!correo) {
        errores.correo = ['El correo es obligatorio.'];
    } else if (!esCorreoValido(correo)) {
        errores.correo = ['Ingrese un correo electrónico válido.'];
    }
    if (!contrasena || String(contrasena).length < 8) {
        errores.contrasena = ['La contraseña debe tener al menos 8 caracteres.'];
    } else {
        if (!tieneMayuscula(contrasena)) {
            errores.contrasena = ['La contraseña debe contener al menos una mayúscula.'];
        }
        if (!tieneNumero(contrasena)) {
            errores.contrasena = ['La contraseña debe contener al menos un número.'];
        }
    }
    if (Object.keys(errores).length > 0) {
        return res.status(400).json(errores);
    }

    const correoNormalizado = String(correo).toLowerCase().trim();

    // Correo unico
    const existente = await Usuario.findOne({ correo: correoNormalizado });
    if (existente) {
        return res.status(400).json({ correo: ['Este correo ya está registrado.'] });
    }

    const usuario = new Usuario({
        nombre_completo: String(nombre_completo).trim(),
        correo: correoNormalizado,
        rol: 'usuario',
    });
    usuario.definirContrasena(contrasena);
    await usuario.save();

    const tokens = generarTokens(usuario);

    return res.status(201).json({
        mensaje: 'Usuario registrado exitosamente',
        usuario: serializarPerfil(usuario),
        tokens,
    });
}

/**
 * RF-USU-02: Inicio de sesion.
 */
async function iniciarSesion(req, res) {
    const { correo, contrasena } = req.body || {};

    if (!correo || !esCorreoValido(correo) || !contrasena) {
        return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const usuario = await Usuario.findOne({
        correo: String(correo).toLowerCase().trim(),
        activo: true,
    });

    if (!usuario || !usuario.validarContrasena(contrasena)) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const tokens = generarTokens(usuario);
    return res.status(200).json({
        usuario: serializarPerfil(usuario),
        tokens,
    });
}

/**
 * RF-USU-03: Visualizar perfil del usuario autenticado.
 */
async function verPerfil(req, res) {
    return res.status(200).json(serializarPerfil(req.user));
}

/**
 * RF-USU-04: Editar perfil (nombre, correo, contrasena).
 */
async function editarPerfil(req, res) {
    const { nombre_completo, correo, contrasena_actual, contrasena_nueva } = req.body || {};
    const usuario = req.user;

    // Validaciones de campos enviados
    const errores = {};
    if (nombre_completo !== undefined && !String(nombre_completo).trim()) {
        errores.nombre_completo = ['El nombre no puede estar vacío.'];
    }
    if (correo !== undefined) {
        if (!esCorreoValido(correo)) {
            errores.correo = ['Ingrese un correo electrónico válido.'];
        } else {
            const enUso = await Usuario.findOne({
                correo: String(correo).toLowerCase().trim(),
                _id: { $ne: usuario._id },
            });
            if (enUso) errores.correo = ['Este correo ya está en uso.'];
        }
    }
    if (contrasena_nueva !== undefined && String(contrasena_nueva).length >= 1) {
        if (String(contrasena_nueva).length < 8) {
            errores.contrasena_nueva = ['La contraseña debe tener al menos 8 caracteres.'];
        }
        if (!tieneMayuscula(String(contrasena_nueva))) {
            errores.contrasena_nueva = ['La contraseña debe contener al menos una mayúscula.'];
        }
        if (!tieneNumero(String(contrasena_nueva))) {
            errores.contrasena_nueva = ['La contraseña debe contener al menos un número.'];
        }
    }
    if (Object.keys(errores).length > 0) {
        return res.status(400).json(errores);
    }

    if (nombre_completo !== undefined && String(nombre_completo).trim()) {
        usuario.nombre_completo = String(nombre_completo).trim();
    }
    if (correo !== undefined && esCorreoValido(correo)) {
        usuario.correo = String(correo).toLowerCase().trim();
    }

    // Cambiar contrasena solo si se envian ambos campos
    if (contrasena_nueva !== undefined && contrasena_actual !== undefined) {
        if (!usuario.validarContrasena(contrasena_actual)) {
            return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
        }
        usuario.definirContrasena(contrasena_nueva);
    }

    await usuario.save();
    return res.status(200).json({
        mensaje: 'Perfil actualizado exitosamente',
        usuario: serializarPerfil(usuario),
    });
}

/**
 * RF-USU-05: Eliminar cuenta con cascada (tareas, nodos, conexiones).
 */
async function eliminarCuenta(req, res) {
    const { contrasena } = req.body || {};
    const usuario = req.user;

    if (!usuario.validarContrasena(contrasena || '')) {
        return res.status(400).json({ contrasena: ['Contraseña incorrecta.'] });
    }

    await ConexionNodo.deleteMany({ usuario: usuario._id });
    await NodoMapa.deleteMany({ usuario: usuario._id });
    await Tarea.deleteMany({ usuario: usuario._id });
    await Usuario.deleteOne({ _id: usuario._id });

    return res.status(200).json({ mensaje: 'Cuenta eliminada permanentemente' });
}

/**
 * Cierre de sesion (el JWT se borra del lado del cliente).
 */
async function cerrarSesion(req, res) {
    return res.status(200).json({ mensaje: 'Sesión cerrada exitosamente' });
}

module.exports = {
    registrarUsuario,
    iniciarSesion,
    verPerfil,
    editarPerfil,
    eliminarCuenta,
    cerrarSesion,
    serializarPerfil,
    cifrarContrasena,
    verificarContrasena,
};