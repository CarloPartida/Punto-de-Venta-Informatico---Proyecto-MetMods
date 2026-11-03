const conexion = require('../database');

async function buscarPorUsuario(nom_user) {
    const db = await conexion();

    const sql = `
        SELECT ID_Sesion, nom_user, Contrasena, intentos_fallidos, bloqueado_hasta 
        FROM login 
        WHERE nom_user = ?
    `;

    const [resultado] = await db.execute(sql, [nom_user]);
    await db.end();

    return resultado[0] || null;
}

async function registrarIntentoFallido(id, nuevosIntentos, tiempoBloqueo = null) {
    const db = await conexion();

    const sql = `
        UPDATE login 
        SET intentos_fallidos = ?, bloqueado_hasta = ? 
        WHERE ID_Sesion = ?
    `;

    await db.execute(sql, [nuevosIntentos, tiempoBloqueo, id]);
    await db.end();
}

async function resetearIntentos(id) {
    const db = await conexion();

    const sql = `
        UPDATE login 
        SET intentos_fallidos = 0, bloqueado_hasta = NULL 
        WHERE ID_Sesion = ?
    `;

    await db.execute(sql, [id]);
    await db.end();
}

module.exports = {
    buscarPorUsuario,
    registrarIntentoFallido,
    resetearIntentos
};