const carcModel = require('../Models/carcModel');

// Crea errores de validación HTTP 400
function errorDeValidacion(mensaje) {
    const error = new Error(mensaje);
    error.status = 400;
    return error;
}

// Limpia espacios e ignora cadenas vacías (RQNF 15: vacío => null)
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

// Valida y normaliza los datos del cliente enviados desde el front
function leerCliente(body = {}) {
    const nombre = limpiar(body.nombre);
    if (!nombre) throw errorDeValidacion('El nombre del cliente es obligatorio');

    const telefono = limpiar(body.telefono);
    const localidad = limpiar(body.localidad);
    if (nombre.length > 100 || telefono?.length > 20 || localidad?.length > 100) {
        throw errorDeValidacion('Algún campo excede la longitud máxima permitida');
    }

    if (telefono && !/^[0-9+()\-\s]+$/.test(telefono)) {
        throw errorDeValidacion('El teléfono solo puede contener números, espacios y los símbolos + - ( )');
    }

    let edad = Number.parseInt(body.edad, 10);
    if (Number.isNaN(edad)) edad = null;
    if (edad !== null && (edad < 0 || edad > 120)) throw errorDeValidacion('La edad no es válida');

    return { nombre, edad, telefono, localidad };
}

// Envía respuestas de error según el código asignado
function responderError(res, error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
}

// Retorna la cartera completa
async function listar(req, res) {
    try {
        res.json(await carcModel.listar());
    } catch (error) {
        responderError(res, error);
    }
}

// Retorna un cliente por su ID
async function obtener(req, res) {
    try {
        const cliente = await carcModel.obtenerPorId(leerId(req));
        if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(cliente);
    } catch (error) {
        responderError(res, error);
    }
}

// Crea un nuevo cliente
async function crear(req, res) {
    try {
        const id = await carcModel.crear(leerCliente(req.body));
        res.status(201).json({ id });
    } catch (error) {
        responderError(res, error);
    }
}

// Actualiza un cliente existente
async function actualizar(req, res) {
    try {
        const actualizado = await carcModel.actualizar(leerId(req), leerCliente(req.body));
        if (!actualizado) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error);
    }
}

// Elimina un cliente
async function eliminar(req, res) {
    try {
        const eliminado = await carcModel.eliminar(leerId(req));
        if (!eliminado) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error);
    }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
