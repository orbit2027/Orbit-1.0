/**
 * Middleware de control de acceso por rol y helpers de permisos.
 * Replica el decorador requerir_rol y verificar_propietario_o_admin de Django.
 */

function requerirRol(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Autenticación requerida' });
        }
        if (!rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({ error: 'No tienes permisos para acceder a este recurso' });
        }
        next();
    };
}

function esPropietarioOAdmin(req, recursoUsuarioId) {
    if (req.user.rol === 'administrador') return true;
    return String(recursoUsuarioId) === String(req.user._id);
}

module.exports = { requerirRol, esPropietarioOAdmin };