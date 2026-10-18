const conexion = require('../database');

// Crea un error con código HTTP para que el controlador lo responda tal cual
function errorHttp(mensaje, status) {
    const error = new Error(mensaje);
    error.status = status;
    return error;
}

// Revisa si ya existe otro cliente con el mismo nombre y teléfono
async function existeDuplicado(db, { nombre, telefono }, ignorarId = 0) {
    const [filas] = await db.execute(
        'SELECT ID_Cliente FROM Cartera_Cliente WHERE Nombre = ? AND Telefono <=> ? AND ID_Cliente <> ? LIMIT 1',
        [nombre, telefono, ignorarId]
    );
    return filas.length > 0;
}

// Obtiene toda la cartera de clientes
async function listar() {
    const db = await conexion();
    try {
        const [filas] = await db.execute(
            'SELECT ID_Cliente, Nombre, Telefono, Localidad FROM Cartera_Cliente ORDER BY ID_Cliente'
        );
        return filas;
    } finally {
        await db.end();
    }
}

// Obtiene los datos completos de un cliente por su ID
async function obtenerPorId(id) {
    const db = await conexion();
    try {
        const [filas] = await db.execute(
            'SELECT ID_Cliente, Nombre, Edad, Telefono, Localidad FROM Cartera_Cliente WHERE ID_Cliente = ?',
            [id]
        );
        return filas[0] || null;
    } finally {
        await db.end();
    }
}

// Registra un nuevo cliente (RQF 8)
async function crear(datos) {
    const db = await conexion();
    try {
        if (await existeDuplicado(db, datos)) {
            throw errorHttp('Ya existe un cliente con ese nombre y teléfono', 409);
        }

        const [resultado] = await db.execute(
            'INSERT INTO Cartera_Cliente (Nombre, Edad, Telefono, Localidad) VALUES (?, ?, ?, ?)',
            [datos.nombre, datos.edad, datos.telefono, datos.localidad]
        );
        return resultado.insertId;
    } finally {
        await db.end();
    }
}

// Actualiza un cliente existente (RQF 9). Devuelve false si no existe
async function actualizar(id, datos) {
    const db = await conexion();
    try {
        const [actual] = await db.execute(
            'SELECT ID_Cliente FROM Cartera_Cliente WHERE ID_Cliente = ?',
            [id]
        );
        if (!actual[0]) return false;

        if (await existeDuplicado(db, datos, id)) {
            throw errorHttp('Ya existe un cliente con ese nombre y teléfono', 409);
        }

        await db.execute(
            'UPDATE Cartera_Cliente SET Nombre = ?, Edad = ?, Telefono = ?, Localidad = ? WHERE ID_Cliente = ?',
            [datos.nombre, datos.edad, datos.telefono, datos.localidad, id]
        );
        return true;
    } finally {
        await db.end();
    }
}

// Elimina un cliente (RQF 10). Devuelve false si no existe
async function eliminar(id) {
    const db = await conexion();
    try {
        const [resultado] = await db.execute(
            'DELETE FROM Cartera_Cliente WHERE ID_Cliente = ?',
            [id]
        );
        return resultado.affectedRows > 0;
    } catch (error) {
        // 1451: la llave foránea impide borrar (el cliente tiene servicios)
        if (error.errno === 1451) {
            throw errorHttp('No se puede eliminar: el cliente tiene servicios registrados', 409);
        }
        throw error;
    } finally {
        await db.end();
    }
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
