const pagpModel = require('../Models/pagpModel');

function errorDeValidacion(mensaje) {
    const error = new Error(mensaje);
    error.status = 400;
    return error;
}

function limpiar(valor) {
    if (typeof valor !== 'string') return null;
    const texto = valor.trim();
    return texto === '' ? null : texto;
}

function leerId(req) {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) throw errorDeValidacion('ID no válido');
    return id;
}

function leerServicio(body = {}) {
    const equipo = limpiar(body.equipo);
    const nombre = limpiar(body.cliente?.nombre || body.cliente_nombre);
    if (!equipo || !nombre) {
        throw errorDeValidacion('El equipo y el nombre del cliente son obligatorios');
    }

    const descripcion = limpiar(body.descripcion);
    const observaciones = limpiar(body.observaciones);
    const telefono = limpiar(body.cliente?.telefono || body.cliente_telefono);
    if (nombre.length > 100 || telefono?.length > 20 ||
        descripcion?.length > 255 || observaciones?.length > 255) {
        throw errorDeValidacion('Algún campo excede la longitud máxima permitida');
    }

    let edad = Number.parseInt(body.cliente?.edad || body.cliente_edad, 10);
    if (Number.isNaN(edad)) edad = null;
    if (edad !== null && (edad < 0 || edad > 120)) throw errorDeValidacion('La edad no es válida');

    const costoTotal = Number(body.costoTotal ?? body.Costo_Total ?? 0);
    if (!Number.isFinite(costoTotal) || costoTotal < 0) {
        throw errorDeValidacion('El costo total no es válido');
    }

    const valActiva = body.ventaActiva ?? body.Venta_Activa;
    const ventaActiva = valActiva === true || valActiva === 1 || valActiva === '1' || valActiva === 'true';

    const productos = [];
    if (ventaActiva && Array.isArray(body.productos)) {
        for (const fila of body.productos) {
            const producto = limpiar(fila?.producto);
            const piezas = Number.parseInt(fila?.piezas, 10);
            const precio = Number(fila?.precio);
            if (!producto || !Number.isInteger(piezas) || piezas <= 0 ||
                !Number.isFinite(precio) || precio < 0) {
                throw errorDeValidacion('Hay un producto con datos no válidos');
            }
            productos.push({ producto, piezas, precio });
        }
    }

    return {
        equipo,
        descripcion,
        observaciones,
        cliente: { nombre, edad, telefono },
        ventaActiva,
        costoTotal,
        productos
    };
}

function responderError(res, error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
}

async function listarPendientes(req, res) {
    try {
        res.json(await pagpModel.listarPendientes());
    } catch (error) {
        responderError(res, error);
    }
}

async function obtener(req, res) {
    try {
        const servicio = await pagpModel.obtenerPorId(leerId(req));
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json(servicio);
    } catch (error) {
        responderError(res, error);
    }
}

async function crear(req, res) {
    try {
        const id = await pagpModel.crear(leerServicio(req.body));
        res.status(201).json({ id });
    } catch (error) {
        responderError(res, error);
    }
}

async function actualizar(req, res) {
    try {
        const actualizado = await pagpModel.actualizar(leerId(req), leerServicio(req.body));
        if (!actualizado) {
            return res.status(404).json({ error: 'No se encontró un servicio pendiente con ese ID' });
        }
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error);
    }
}

async function finalizar(req, res) {
    try {
        const finalizado = await pagpModel.finalizar(leerId(req));
        if (!finalizado) {
            return res.status(404).json({ error: 'No se encontró un servicio pendiente con ese ID' });
        }
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error);
    }
}

async function listarProductos(req, res) {
    try {
        res.json(await pagpModel.listarProductos());
    } catch (error) {
        responderError(res, error);
    }
}

async function listarClientes(req, res) {
    try {
        res.json(await pagpModel.listarClientes());
    } catch (error) {
        responderError(res, error);
    }
}

module.exports = { listarPendientes, obtener, crear, actualizar, finalizar, listarProductos, listarClientes };