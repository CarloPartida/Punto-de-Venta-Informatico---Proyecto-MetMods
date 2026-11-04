const provModel = require('../Models/provModel');

// Crea errores de validación HTTP 400
function errorDeValidacion(mensaje) {
    const error = new Error(mensaje);
    error.status = 400;
    return error;
}

// Limpia espacios e ignora cadenas vacías (vacío => null)
function limpiar(valor) {
    if (typeof valor !== 'string') return null;
    const texto = valor.trim();
    return texto === '' ? null : texto;
}

// Valida y convierte el parámetro ID
function leerId(req) {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) throw errorDeValidacion('ID no válido');
    return id;
}

// Valida y normaliza los datos del proveedor enviados desde el front
function leerProveedor(body = {}) {
    const nombre = limpiar(body.nombre);
    if (!nombre) throw errorDeValidacion('El nombre del proveedor es obligatorio');

    const telefono = limpiar(body.telefono);
    const localidad = limpiar(body.localidad);
    const numCliente = limpiar(body.numCliente);
    if (nombre.length > 100 || telefono?.length > 20 || localidad?.length > 100 || numCliente?.length > 50) {
        throw errorDeValidacion('Algún campo excede la longitud máxima permitida');
    }

    if (telefono && !/^[0-9+()\-\s]+$/.test(telefono)) {
        throw errorDeValidacion('El teléfono solo puede contener números, espacios y los símbolos + - ( )');
    }

    return { nombre, telefono, localidad, numCliente };
}

// Envía respuestas de error según el código asignado
function responderError(res, error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
}

// Retorna la lista de proveedores
async function listar(req, res) {
    try {
        res.json(await provModel.listar());
    } catch (error) {
        responderError(res, error);
    }
}

// Retorna un proveedor por su ID
async function obtener(req, res) {
    try {
        const proveedor = await provModel.obtenerPorId(leerId(req));
        if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
        res.json(proveedor);
    } catch (error) {
        responderError(res, error);
    }
}

// Crea un nuevo proveedor
async function crear(req, res) {
    try {
        const id = await provModel.crear(leerProveedor(req.body));
        res.status(201).json({ id });
    } catch (error) {
        responderError(res, error);
    }
}

// Actualiza un proveedor existente
async function actualizar(req, res) {
    try {
        const actualizado = await provModel.actualizar(leerId(req), leerProveedor(req.body));
        if (!actualizado) return res.status(404).json({ error: 'Proveedor no encontrado' });
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error);
    }
}

// Elimina un proveedor
async function eliminar(req, res) {
    try {
        const eliminado = await provModel.eliminar(leerId(req));
        if (!eliminado) return res.status(404).json({ error: 'Proveedor no encontrado' });
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error);
    }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
