const soporteModel = require('../Models/soporteModel');

// Máximos de caracteres de cada campo de texto
const LIMITES = [
    ['nombre', 'nombre', 100],
    ['telefono', 'teléfono', 20],
    ['localidad', 'localidad', 100]
];

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
    const valor = String(req.params.id ?? '');
    if (!/^[1-9][0-9]*$/.test(valor)) throw errorDeValidacion('ID no válido');
    const id = Number(valor);
    if (!Number.isSafeInteger(id)) throw errorDeValidacion('ID no válido');
    return id;
}

// Valida y normaliza los datos del técnico enviados desde el front
function leerTecnico(body = {}) {
    const datos = {
        nombre: limpiar(body.nombre),
        telefono: limpiar(body.telefono),
        localidad: limpiar(body.localidad)
    };

    if (!datos.nombre) throw errorDeValidacion('El nombre del técnico es obligatorio');

    // Mensaje claro indicando qué campo se pasó y cuál es el máximo
    for (const [campo, etiqueta, maximo] of LIMITES) {
        if (datos[campo] && datos[campo].length > maximo) {
            throw errorDeValidacion(`El campo ${etiqueta} no puede tener más de ${maximo} caracteres`);
        }
    }

    if (datos.telefono && !/^[0-9+()\-\s]+$/.test(datos.telefono)) {
        throw errorDeValidacion('El teléfono solo puede contener números, espacios y los símbolos + - ( )');
    }

    const edadTexto = body.edad === null || body.edad === undefined ? '' : String(body.edad).trim();
    const edad = edadTexto === '' ? null : Number(edadTexto);
    if (edad !== null && (!/^[0-9]+$/.test(edadTexto) || !Number.isInteger(edad) || edad > 120)) {
        throw errorDeValidacion('La edad no es válida');
    }

    return { ...datos, edad };
}

// Envía respuestas de error según el código asignado
function responderError(res, error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
}

// Retorna la lista del personal de soporte
async function listar(req, res) {
    try {
        res.json(await soporteModel.listar());
    } catch (error) {
        responderError(res, error);
    }
}

// Retorna un técnico por su ID
async function obtener(req, res) {
    try {
        const tecnico = await soporteModel.obtenerPorId(leerId(req));
        if (!tecnico) return res.status(404).json({ error: 'Técnico no encontrado' });
        res.json(tecnico);
    } catch (error) {
        responderError(res, error);
    }
}

// Crea un nuevo técnico
async function crear(req, res) {
    try {
        const id = await soporteModel.crear(leerTecnico(req.body));
        res.status(201).json({ id });
    } catch (error) {
        responderError(res, error);
    }
}

// Actualiza un técnico existente
async function actualizar(req, res) {
    try {
        const actualizado = await soporteModel.actualizar(leerId(req), leerTecnico(req.body));
        if (!actualizado) return res.status(404).json({ error: 'Técnico no encontrado' });
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error);
    }
}

// Elimina un técnico
async function eliminar(req, res) {
    try {
        const eliminado = await soporteModel.eliminar(leerId(req));
        if (!eliminado) return res.status(404).json({ error: 'Técnico no encontrado' });
        res.json({ ok: true });
    } catch (error) {
        responderError(res, error);
    }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
