const crypto = require('node:crypto');

// Nombre de la cookie de sesión (el mismo que ya usaba el sistema)
const NOMBRE_COOKIE = 'sesion_activa';

// Sesiones activas en memoria: token aleatorio -> datos del usuario.
// Al reiniciar el servidor las sesiones se pierden y hay que volver a iniciar sesión.
const sesiones = new Map();

// Extrae el token de la cabecera Cookie de la petición
function leerToken(req) {
    const cabecera = req.headers.cookie || '';
    for (const par of cabecera.split(';')) {
        const i = par.indexOf('=');
        if (i === -1) continue;
        if (par.slice(0, i).trim() === NOMBRE_COOKIE) return par.slice(i + 1).trim();
    }
    return null;
}

// Crea una sesión para el usuario y retorna el valor de la cabecera Set-Cookie
function crear({ idSesion, usuario }) {
    const token = crypto.randomBytes(32).toString('hex');
    sesiones.set(token, { idSesion, usuario });
    return `${NOMBRE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax`;
}

// Retorna { idSesion, usuario } si la petición trae una sesión válida, o null
function obtener(req) {
    const token = leerToken(req);
    return token ? sesiones.get(token) || null : null;
}

// Elimina la sesión de la petición (cierre de sesión)
function destruir(req) {
    const token = leerToken(req);
    if (token) sesiones.delete(token);
}

module.exports = { crear, obtener, destruir };
