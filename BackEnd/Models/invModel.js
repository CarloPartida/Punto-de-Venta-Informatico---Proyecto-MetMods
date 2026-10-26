const conexion = require('../database');

const COLUMNAS = 'ID_Producto, Nombre, Descripcion, Precio, Disponibilidad, Codigo_Prod, Codigo_SAT, No_Invent';

// Crea un error con código HTTP para que el controlador lo responda tal cual
function errorHttp(mensaje, status) {
    const error = new Error(mensaje);
    error.status = status;
    return error;
}

// El módulo de servicios busca los productos por nombre, así que no puede repetirse
async function existeNombre(db, nombre, ignorarId = 0) {
    const [filas] = await db.execute(
        'SELECT ID_Producto FROM Producto WHERE Nombre = ? AND ID_Producto <> ? LIMIT 1',
        [nombre, ignorarId]
    );
    return filas.length > 0;
}

async function existeCodigo(db, codigo, ignorarId = 0) {
    if (!codigo) return false;
    const [filas] = await db.execute(
        'SELECT ID_Producto FROM Producto WHERE Codigo_Prod = ? AND ID_Producto <> ? LIMIT 1',
        [codigo, ignorarId]
    );
    return filas.length > 0;
}

// Lanza el 409 que corresponda si el nombre o el código ya están en uso
async function validarUnicos(db, datos, ignorarId = 0) {
    if (await existeNombre(db, datos.nombre, ignorarId)) {
        throw errorHttp('Ya existe un producto con ese nombre', 409);
    }
    if (await existeCodigo(db, datos.codigo, ignorarId)) {
        throw errorHttp('Ya existe un producto con ese código', 409);
    }
}

// Obtiene todo el inventario
async function listar() {
    const db = await conexion();
    try {
        const [filas] = await db.execute(`SELECT ${COLUMNAS} FROM Producto ORDER BY Nombre`);
        return filas;
    } finally {
        await db.end();
    }
}

// Obtiene un producto por su ID
async function obtenerPorId(id) {
    const db = await conexion();
    try {
        const [filas] = await db.execute(
            `SELECT ${COLUMNAS} FROM Producto WHERE ID_Producto = ?`,
            [id]
        );
        return filas[0] || null;
    } finally {
        await db.end();
    }
}

// Registra un nuevo producto
async function crear(datos) {
    const db = await conexion();
    try {
        await validarUnicos(db, datos);

        const [resultado] = await db.execute(`
            INSERT INTO Producto
                (Nombre, Descripcion, Precio, Disponibilidad, Codigo_Prod, Codigo_SAT, No_Invent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [datos.nombre, datos.descripcion, datos.precio, datos.disponibilidad,
            datos.codigo, datos.codSat, datos.noInventariable ? 1 : 0]);
        return resultado.insertId;
    } catch (error) {
        // 1062: otra petición se adelantó con el mismo código
        if (error.errno === 1062) throw errorHttp('Ya existe un producto con ese código', 409);
        throw error;
    } finally {
        await db.end();
    }
}

// Actualiza un producto. Devuelve false si no existe
async function actualizar(id, datos) {
    const db = await conexion();
    try {
        const [actual] = await db.execute(
            'SELECT ID_Producto FROM Producto WHERE ID_Producto = ?',
            [id]
        );
        if (!actual[0]) return false;

        await validarUnicos(db, datos, id);

        await db.execute(`
            UPDATE Producto
            SET Nombre = ?, Descripcion = ?, Precio = ?, Disponibilidad = ?,
                Codigo_Prod = ?, Codigo_SAT = ?, No_Invent = ?
            WHERE ID_Producto = ?
        `, [datos.nombre, datos.descripcion, datos.precio, datos.disponibilidad,
            datos.codigo, datos.codSat, datos.noInventariable ? 1 : 0, id]);
        return true;
    } catch (error) {
        if (error.errno === 1062) throw errorHttp('Ya existe un producto con ese código', 409);
        throw error;
    } finally {
        await db.end();
    }
}

// Suma o resta piezas en una sola sentencia, para que dos clics seguidos no se pisen.
// Devuelve la nueva disponibilidad, o null si el producto no existe
async function ajustarDisponibilidad(id, cambio) {
    const db = await conexion();
    try {
        const [resultado] = await db.execute(`
            UPDATE Producto
            SET Disponibilidad = Disponibilidad + ?
            WHERE ID_Producto = ? AND No_Invent = 0 AND Disponibilidad + ? >= 0
        `, [cambio, id, cambio]);

        const [filas] = await db.execute(
            'SELECT No_Invent, Disponibilidad FROM Producto WHERE ID_Producto = ?',
            [id]
        );
        if (!filas[0]) return null;

        if (resultado.affectedRows === 0) {
            if (filas[0].No_Invent) throw errorHttp('Este producto es no inventariable', 409);
            throw errorHttp('No hay suficientes piezas disponibles', 409);
        }
        return filas[0].Disponibilidad;
    } finally {
        await db.end();
    }
}

// Descuenta piezas por nombre al realizar una venta en la Pagina Principal
async function descontarStockPorNombre(nombre, cantidad, dbExterna = null) {
    if (!nombre || cantidad <= 0) return;
    const db = dbExterna || await conexion();

    try {
        const [resultado] = await db.execute(`
            UPDATE Producto
            SET Disponibilidad = Disponibilidad - ?
            WHERE Nombre = ? AND No_Invent = 0 AND Disponibilidad >= ?
        `, [cantidad, nombre, cantidad]);

        // Si no afectó filas, verifica si no había suficiente stock
        if (resultado.affectedRows === 0) {
            const [filas] = await db.execute(
                'SELECT No_Invent, Disponibilidad FROM Producto WHERE Nombre = ?',
                [nombre]
            );

            if (filas[0] && !filas[0].No_Invent && filas[0].Disponibilidad < cantidad) {
                throw errorHttp(`Stock insuficiente para "${nombre}". Disponibles: ${filas[0].Disponibilidad}`, 409);
            }
        }
    } finally {
        if (!dbExterna) await db.end();
    }
}

// Elimina un producto. Devuelve false si no existe
async function eliminar(id) {
    const db = await conexion();
    try {
        const [resultado] = await db.execute('DELETE FROM Producto WHERE ID_Producto = ?', [id]);
        return resultado.affectedRows > 0;
    } catch (error) {
        // 1451: la llave foránea impide borrar (está en el detalle de alguna venta)
        if (error.errno === 1451) {
            throw errorHttp('No se puede eliminar: el producto está ligado a servicios o ventas', 409);
        }
        throw error;
    } finally {
        await db.end();
    }
}

module.exports = { 
    listar, 
    obtenerPorId, 
    crear, 
    actualizar, 
    ajustarDisponibilidad, 
    descontarStockPorNombre, 
    eliminar 
};