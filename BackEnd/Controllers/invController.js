const invModel = require('../Models/invModel');

// Crea errores de validación HTTP 400
function errorDeValidacion(mensaje) {
    const error = new Error(mensaje);
    error.status = 400;
    return error;
}

// Limpia espacios e ignora cadenas vacías
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

// Convierte "" o undefined en 0 y el resto en número
function aNumero(valor) {
    if (valor === '' || valor === null || valor === undefined) return 0;
    return Number(valor);
}

// Valida y normaliza los datos del producto enviados desde el front
function leerProducto(body = {}) {
    const nombre = limpiar(body.nombre);
    if (!nombre) throw errorDeValidacion('El nombre del producto es obligatorio');

    const descripcion = limpiar(body.descripcion);
    const codigo = limpiar(body.codigo);
    const codSat = limpiar(body.codSat);
    if (nombre.length > 100 || codigo?.length > 50 || codSat?.length > 50 || descripcion?.length > 500) {
        throw errorDeValidacion('Algún campo excede la longitud máxima permitida');
    }

    const precio = aNumero(body.precio);
    if (!Number.isFinite(precio) || precio < 0 || precio > 99999999.99) {
        throw errorDeValidacion('El precio no es válido');
    }

    // Un producto no inventariable siempre tiene disponibilidad 0
    const noInventariable = body.noInventariable === true;
    let disponibilidad = noInventariable ? 0 : aNumero(body.disponibilidad);
    if (!Number.isInteger(disponibilidad) || disponibilidad < 0 || disponibilidad > 1000000) {
        throw errorDeValidacion('La disponibilidad debe ser un número entero de 0 en adelante');
    }

    return {
        nombre, descripcion, codigo, codSat,
        precio: Math.round(precio * 100) / 100,
        disponibilidad, noInventariable
    };
}

// Envía respuestas de error según el código asignado
function responderError(res, error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
}

// Retorna el inventario completo
async function listar(req, res) {
    try {
        res.json(await invModel.listar());
    } catch (error) {
        responderError(res, error);
    }
}

// Retorna un producto por su ID
async function obtener(req, res) {
    try {
        const producto = await invModel.obtenerPorId(leerId(req));
        if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(producto);
    } catch (error) {
        responderError(res, error);
    }
}

// Crea un nuevo producto
async function crear(req, res) {
    try {
        const id = await invModel.crear(leerProducto(req.body));
        res.status(201).json({ id });
    } catch (error) {
        responderError(res, error);
    }
}

// Actualiza un producto existente
async function actualizar(req, res) {
    try {
        const actualizado = await invModel.actualizar(leerId(req), leerProducto(req.body));
        if (!actualizado) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error);
    }
}

// Suma o resta piezas: el cuerpo trae { cambio: 1 } o { cambio: -1 }
async function ajustarDisponibilidad(req, res) {
    try {
        const id = leerId(req);
        const cambio = Number(req.body?.cambio);
        if (!Number.isInteger(cambio) || cambio === 0 || Math.abs(cambio) > 1000) {
            throw errorDeValidacion('El cambio de piezas no es válido');
        }

        const disponibilidad = await invModel.ajustarDisponibilidad(id, cambio);
        if (disponibilidad === null) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ disponibilidad });
    } catch (error) {
        responderError(res, error);
    }
}

// Elimina un producto
async function eliminar(req, res) {
    try {
        const eliminado = await invModel.eliminar(leerId(req));
        if (!eliminado) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error);
    }
}

module.exports = { listar, obtener, crear, actualizar, ajustarDisponibilidad, eliminar };
