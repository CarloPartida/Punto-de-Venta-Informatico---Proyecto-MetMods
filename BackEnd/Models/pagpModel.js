const conexion = require('../database');

// Busca un cliente por nombre y teléfono o lo crea si no existe
async function resolverCliente(db, { nombre, edad, telefono }) {
    const [existentes] = await db.execute(
        'SELECT ID_Cliente FROM Cartera_Cliente WHERE Nombre = ? AND Telefono <=> ? LIMIT 1',
        [nombre, telefono]
    );
    if (existentes[0]) return existentes[0].ID_Cliente;

    const [resultado] = await db.execute(
        'INSERT INTO Cartera_Cliente (Nombre, Edad, Telefono) VALUES (?, ?, ?)',
        [nombre, edad, telefono]
    );
    return resultado.insertId;
}

// Reemplaza el detalle de productos asociados a un servicio
async function guardarDetalle(db, idServicio, filas) {
    await db.execute('DELETE FROM Detalle_Venta WHERE ID_Servicio = ?', [idServicio]);

    for (const fila of filas) {
        const [producto] = await db.execute(
            'SELECT ID_Producto FROM Producto WHERE Nombre = ? LIMIT 1',
            [fila.producto]
        );
        if (!producto[0]) {
            const error = new Error(`El producto "${fila.producto}" no existe en el inventario`);
            error.status = 400;
            throw error;
        }
        await db.execute(
            'INSERT INTO Detalle_Venta (ID_Servicio, ID_Producto, Piezas, Precio_Unitario) VALUES (?, ?, ?, ?)',
            [idServicio, producto[0].ID_Producto, fila.piezas, fila.precio]
        );
    }
}

// Obtiene la lista de servicios con estado Pendiente
async function listarPendientes() {
    const db = await conexion();
    try {
        const [filas] = await db.execute(`
            SELECT s.ID_Servicio, c.Nombre, s.Equipo, DATE_FORMAT(s.Fecha, '%d/%m/%Y') AS Fecha
            FROM Servicio s
            JOIN Cartera_Cliente c ON c.ID_Cliente = s.ID_Cliente
            WHERE s.Estado = 'Pendiente'
            ORDER BY s.Fecha DESC, s.ID_Servicio DESC
        `);
        return filas;
    } finally {
        await db.end();
    }
}

// Obtiene la información completa de un servicio por su ID
async function obtenerPorId(id) {
    const db = await conexion();
    try {
        const [servicios] = await db.execute(`
            SELECT s.ID_Servicio, s.Equipo, s.Descripcion, s.Observaciones, s.Venta_Activa,
                   s.Costo_Total, s.Estado,
                   c.Nombre AS cliente_nombre, c.Edad AS cliente_edad, c.Telefono AS cliente_telefono
            FROM Servicio s
            JOIN Cartera_Cliente c ON c.ID_Cliente = s.ID_Cliente
            WHERE s.ID_Servicio = ?
        `, [id]);
        if (!servicios[0]) return null;

        const [detalle] = await db.execute(`
            SELECT p.Nombre AS producto, d.Precio_Unitario AS precio, d.Piezas AS piezas
            FROM Detalle_Venta d
            JOIN Producto p ON p.ID_Producto = d.ID_Producto
            WHERE d.ID_Servicio = ?
            ORDER BY d.ID_Detalle
        `, [id]);

        return { ...servicios[0], detalle };
    } finally {
        await db.end();
    }
}

// Registra un nuevo servicio junto con su cliente y detalle de productos
async function crear(datos) {
    const db = await conexion();
    try {
        await db.beginTransaction();
        const idCliente = await resolverCliente(db, datos.cliente);

        const [resultado] = await db.execute(`
            INSERT INTO Servicio
                (ID_Cliente, Equipo, Descripcion, Observaciones, Venta_Activa, Costo_Total, Fecha, Estado)
            VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'Pendiente')
        `, [idCliente, datos.equipo, datos.descripcion, datos.observaciones,
            datos.ventaActiva ? 1 : 0, datos.costoTotal]);

        if (datos.ventaActiva) await guardarDetalle(db, resultado.insertId, datos.productos);

        await db.commit();
        return resultado.insertId;
    } catch (error) {
        await db.rollback();
        throw error;
    } finally {
        await db.end();
    }
}

// Modifica un servicio existente si su estado es Pendiente (RQNF 8)
async function actualizar(id, datos) {
    const db = await conexion();
    try {
        await db.beginTransaction();

        const [servicio] = await db.execute(
            'SELECT Estado FROM Servicio WHERE ID_Servicio = ?',
            [id]
        );

        if (!servicio[0]) {
            await db.rollback();
            return false;
        }

        if (servicio[0].Estado !== 'Pendiente') {
            const error = new Error('El servicio ya no permite modificaciones por estar finalizado o facturado');
            error.status = 403;
            throw error;
        }

        const idCliente = await resolverCliente(db, datos.cliente);

        await db.execute(`
            UPDATE Servicio
            SET ID_Cliente = ?, Equipo = ?, Descripcion = ?, Observaciones = ?,
                Venta_Activa = ?, Costo_Total = ?
            WHERE ID_Servicio = ?
        `, [idCliente, datos.equipo, datos.descripcion, datos.observaciones,
            datos.ventaActiva ? 1 : 0, datos.costoTotal, id]);

        await guardarDetalle(db, id, datos.ventaActiva ? datos.productos : []);
        await db.commit();
        return true;
    } catch (error) {
        await db.rollback();
        throw error;
    } finally {
        await db.end();
    }
}

// Marca el estado de un servicio como Finalizado (RQF 4)
async function finalizar(id) {
    const db = await conexion();
    try {
        const [resultado] = await db.execute(
            "UPDATE Servicio SET Estado = 'Finalizado' WHERE ID_Servicio = ? AND Estado = 'Pendiente'",
            [id]
        );
        return resultado.affectedRows > 0;
    } finally {
        await db.end();
    }
}

// Lista los productos disponibles en inventario
async function listarProductos() {
    const db = await conexion();
    try {
        const [filas] = await db.execute('SELECT Nombre, Precio FROM Producto ORDER BY Nombre');
        return filas;
    } finally {
        await db.end();
    }
}

module.exports = { listarPendientes, obtenerPorId, crear, actualizar, finalizar, listarProductos };