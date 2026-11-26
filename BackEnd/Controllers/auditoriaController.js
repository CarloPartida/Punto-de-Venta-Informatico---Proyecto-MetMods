const auditoriaModel = require('../Models/auditoriaModel');

const LIMITE_MAXIMO = 100;

// Crea errores de validación HTTP 400
function errorDeValidacion(mensaje) {
    const error = new Error(mensaje);
    error.status = 400;
    return error;
}

// Lee un parámetro de consulta que debe ser un entero positivo
function leerEntero(valor, nombre) {
    if (valor === undefined) return undefined;
    if (!/^[1-9][0-9]*$/.test(String(valor))) throw errorDeValidacion(`El parámetro ${nombre} no es válido`);
    const numero = Number(valor);
    if (!Number.isSafeInteger(numero)) throw errorDeValidacion(`El parámetro ${nombre} no es válido`);
    return numero;
}

// Retorna una página del historial de modificaciones (solo lectura)
async function listar(req, res) {
    try {
        const limite = leerEntero(req.query.limite, 'limite');
        if (limite !== undefined && limite > LIMITE_MAXIMO) {
            throw errorDeValidacion(`El límite máximo es ${LIMITE_MAXIMO} registros por página`);
        }
        const antes = leerEntero(req.query.antes, 'antes');

        res.json(await auditoriaModel.listar({ limite, antes }));
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

module.exports = { listar };
