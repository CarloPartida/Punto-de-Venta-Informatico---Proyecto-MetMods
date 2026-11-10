const conexion = require('../database');

// Crea un error con código HTTP para que el controlador lo responda tal cual
function errorHttp(mensaje, status) {
    const error = new Error(mensaje);
    error.status = status;
    return error;
}

// Revisa si ya existe otro técnico con el mismo nombre y teléfono
async function existeDuplicado(db, { nombre, telefono }, ignorarId = 0) {
    const [filas] = await db.execute(
        'SELECT ID_Soporte FROM soporte WHERE Nombre = ? AND Telefono <=> ? AND ID_Soporte <> ? LIMIT 1',
        [nombre, telefono, ignorarId]
    );
    return filas.length > 0;
}

// Obtiene la lista completa del personal de soporte
async function listar() {
    const db = await conexion();
    try {
        const [filas] = await db.execute(
            'SELECT ID_Soporte, Nombre, Edad, Telefono, Localidad FROM soporte ORDER BY ID_Soporte'
        );
        return filas;
    } finally {
        await db.end();
    }
}

// Obtiene un técnico por su ID
async function obtenerPorId(id) {
    const db = await conexion();
    try {
        const [filas] = await db.execute(
            'SELECT ID_Soporte, Nombre, Edad, Telefono, Localidad FROM soporte WHERE ID_Soporte = ?',
            [id]
        );
        return filas[0] || null;
    } finally {
        await db.end();
    }
}

// Registra un nuevo técnico (RQF 15)
async function crear(datos) {
    const db = await conexion();
    try {
        if (await existeDuplicado(db, datos)) {
            throw errorHttp('Ya existe un técnico con ese nombre y teléfono', 409);
        }

        const [resultado] = await db.execute(
            'INSERT INTO soporte (Nombre, Edad, Telefono, Localidad) VALUES (?, ?, ?, ?)',
            [datos.nombre, datos.edad, datos.telefono, datos.localidad]
        );
        return resultado.insertId;
    } finally {
        await db.end();
    }
}

// Actualiza un técnico existente (RQF 16). Devuelve false si no existe
async function actualizar(id, datos) {
    const db = await conexion();
    try {
        const [actual] = await db.execute(
            'SELECT ID_Soporte FROM soporte WHERE ID_Soporte = ?',
            [id]
        );
        if (!actual[0]) return false;

        if (await existeDuplicado(db, datos, id)) {
            throw errorHttp('Ya existe un técnico con ese nombre y teléfono', 409);
        }

        await db.execute(
            'UPDATE soporte SET Nombre = ?, Edad = ?, Telefono = ?, Localidad = ? WHERE ID_Soporte = ?',
            [datos.nombre, datos.edad, datos.telefono, datos.localidad, id]
        );
        return true;
    } finally {
        await db.end();
    }
}

// Elimina un técnico (RQF 17). Devuelve false si no existe
async function eliminar(id) {
    const db = await conexion();
    try {
        const [resultado] = await db.execute('DELETE FROM soporte WHERE ID_Soporte = ?', [id]);
        return resultado.affectedRows > 0;
    } catch (error) {
        // 1451: si más adelante otra tabla referencia al técnico, la llave foránea lo impide
        if (error.errno === 1451) {
            throw errorHttp('No se puede eliminar: el técnico está en uso', 409);
        }
        throw error;
    } finally {
        await db.end();
    }
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
