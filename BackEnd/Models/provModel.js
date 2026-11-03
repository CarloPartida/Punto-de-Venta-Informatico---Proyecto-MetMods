const conexion = require('../database');

// Crea un error con código HTTP para que el controlador lo responda tal cual
function errorHttp(mensaje, status) {
    const error = new Error(mensaje);
    error.status = status;
    return error;
}

// Revisa si ya existe otro proveedor con el mismo nombre y teléfono
async function existeDuplicado(db, { nombre, telefono }, ignorarId = 0) {
    const [filas] = await db.execute(
        'SELECT ID_Proveedor FROM Proveedor WHERE Nombre_Prov = ? AND Telefono <=> ? AND ID_Proveedor <> ? LIMIT 1',
        [nombre, telefono, ignorarId]
    );
    return filas.length > 0;
}

// Obtiene la lista completa de proveedores
async function listar() {
    const db = await conexion();
    try {
        const [filas] = await db.execute(
            'SELECT ID_Proveedor, Nombre_Prov, Telefono, Localidad, Num_Cliente FROM Proveedor ORDER BY Nombre_Prov'
        );
        return filas;
    } finally {
        await db.end();
    }
}

// Obtiene un proveedor por su ID
async function obtenerPorId(id) {
    const db = await conexion();
    try {
        const [filas] = await db.execute(
            'SELECT ID_Proveedor, Nombre_Prov, Telefono, Localidad, Num_Cliente FROM Proveedor WHERE ID_Proveedor = ?',
            [id]
        );
        return filas[0] || null;
    } finally {
        await db.end();
    }
}

// Registra un nuevo proveedor (RQF 18)
async function crear(datos) {
    const db = await conexion();
    try {
        if (await existeDuplicado(db, datos)) {
            throw errorHttp('Ya existe un proveedor con ese nombre y teléfono', 409);
        }

        const [resultado] = await db.execute(
            'INSERT INTO Proveedor (Nombre_Prov, Telefono, Localidad, Num_Cliente) VALUES (?, ?, ?, ?)',
            [datos.nombre, datos.telefono, datos.localidad, datos.numCliente]
        );
        return resultado.insertId;
    } finally {
        await db.end();
    }
}

// Actualiza un proveedor existente (RQF 19). Devuelve false si no existe
async function actualizar(id, datos) {
    const db = await conexion();
    try {
        const [actual] = await db.execute(
            'SELECT ID_Proveedor FROM Proveedor WHERE ID_Proveedor = ?',
            [id]
        );
        if (!actual[0]) return false;

        if (await existeDuplicado(db, datos, id)) {
            throw errorHttp('Ya existe un proveedor con ese nombre y teléfono', 409);
        }

        await db.execute(
            'UPDATE Proveedor SET Nombre_Prov = ?, Telefono = ?, Localidad = ?, Num_Cliente = ? WHERE ID_Proveedor = ?',
            [datos.nombre, datos.telefono, datos.localidad, datos.numCliente, id]
        );
        return true;
    } finally {
        await db.end();
    }
}

// Elimina un proveedor (RQF 20). Devuelve false si no existe
async function eliminar(id) {
    const db = await conexion();
    try {
        const [resultado] = await db.execute('DELETE FROM Proveedor WHERE ID_Proveedor = ?', [id]);
        return resultado.affectedRows > 0;
    } catch (error) {
        // 1451: si más adelante otra tabla referencia al proveedor, la llave foránea lo impide
        if (error.errno === 1451) {
            throw errorHttp('No se puede eliminar: el proveedor está en uso', 409);
        }
        throw error;
    } finally {
        await db.end();
    }
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
