const conexion = require('../database');

const LIMITE_POR_DEFECTO = 50;

// RQF 22 y RQF 23: guarda la modificación con la fecha y hora exactas del servidor
// RQNF 34: no se guarda ninguna acción sin usuario, descripción y marca de tiempo (NOW())
async function registrar({ usuario, accion }) {
    const quien = typeof usuario === 'string' ? usuario.trim() : '';
    const que = typeof accion === 'string' ? accion.trim() : '';
    if (!quien || !que) throw new Error('La auditoría requiere usuario y acción');

    const db = await conexion();
    try {
        await db.execute(
            'INSERT INTO auditoria (Modificado_Por, Accion, Fecha_Hora) VALUES (?, ?, NOW())',
            [quien.slice(0, 100), que.slice(0, 255)]
        );
    } finally {
        await db.end();
    }
}

// RQF 24 y RQNF 33: historial paginado, del más reciente al más antiguo.
// Se pagina por ID (llave primaria) para que cada página cueste lo mismo sin importar el tamaño del historial.
async function listar({ limite = LIMITE_POR_DEFECTO, antes = null } = {}) {
    const cantidad = Number.isInteger(limite) && limite > 0 ? limite : LIMITE_POR_DEFECTO;
    const db = await conexion();
    try {
        const condicion = antes ? 'WHERE ID_Auditoria < ?' : '';
        const parametros = antes ? [antes] : [];

        // Se pide una fila de más para saber si existen registros más antiguos
        const [filas] = await db.query(`
            SELECT ID_Auditoria, Modificado_Por, Accion,
                   DATE_FORMAT(Fecha_Hora, '%d/%m/%Y %H:%i:%s') AS Fecha_Hora
            FROM auditoria
            ${condicion}
            ORDER BY ID_Auditoria DESC
            LIMIT ${cantidad + 1}
        `, parametros);

        const hayMas = filas.length > cantidad;
        const registros = hayMas ? filas.slice(0, cantidad) : filas;
        const siguiente = hayMas ? registros[registros.length - 1].ID_Auditoria : null;
        return { registros, siguiente };
    } finally {
        await db.end();
    }
}

module.exports = { registrar, listar };
