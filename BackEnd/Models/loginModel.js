const conexion = require('../database');

async function buscarPorUsuario(nom_user) {
    const db = await conexion();

    const sql = `
        SELECT ID_Sesion, nom_user, Contrasena 
        FROM login 
        WHERE nom_user = ?
    `;

    const [resultado] = await db.execute(sql, [nom_user]);

    await db.end(); // Cerramos la conexión individual

    return resultado[0] || null;
}

module.exports = {
    buscarPorUsuario
};