const conexion = require('../database');

// Función para buscar un usuario por su nombre
async function buscarPorUsuario(nom_user) 
{
    const db = await conexion(); // Hacemos conexion a la BD

    const [obtenido] = await db.execute // Ejecuta la consulta
    (
        'SELECT ID_Sesion, nom_user, Contrasena, intentos_fallidos, bloqueado_hasta FROM login WHERE nom_user = ?', 
        [nom_user]
    );

    await db.end(); // Finalizamos conexion a la BD

    return obtenido[0] || null; // Devolvemos el registro encontrado o null si no existe
}

// Función para guardar los intentos fallidos y el tiempo de bloqueo
async function registrarIntentoFallido(id, nuevosIntentos, tiempoBloqueo = null) 
{
    const db = await conexion(); // Hacemos conexion a la BD

    await db.execute // Actualiza el contador y la fecha de bloqueo
    (
        'UPDATE login SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE ID_Sesion = ?', 
        [nuevosIntentos, tiempoBloqueo, id]
    );

    await db.end(); // Finalizamos conexion a la BD
}

// Función para limpiar los intentos fallidos al iniciar sesión bien
async function resetearIntentos(id) 
{
    const db = await conexion(); // Hacemos conexion a la BD

    await db.execute // Reinicia los intentos a 0 y quita el bloqueo
    (
        'UPDATE login SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE ID_Sesion = ?', 
        [id]
    );

    await db.end(); // Finalizamos conexion a la BD
}

module.exports = 
{
    buscarPorUsuario,
    registrarIntentoFallido,
    resetearIntentos
};