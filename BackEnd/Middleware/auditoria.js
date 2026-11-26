const auditoriaModel = require('../Models/auditoriaModel');

// Solo las peticiones que modifican datos se auditan (RQF 22)
const METODOS_QUE_MODIFICAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Arma el texto de la acción a partir de la petición ya resuelta con éxito
function describir(entidad, metodo, ruta, cuerpo, respuesta, etiqueta) {
    const coincidencia = /^\/(\d+)(?:\/([a-z]+))?\/?$/i.exec(ruta);
    const id = metodo === 'POST' && ruta === '/' ? respuesta?.id : coincidencia?.[1];
    const subruta = coincidencia?.[2];

    const nombre = etiqueta ? ` «${etiqueta}»` : '';
    const sufijo = id ? ` (ID ${id})` : '';

    if (metodo === 'POST' && ruta === '/') return `Creó ${entidad}${nombre}${sufijo}`;
    if (metodo === 'PUT' && !subruta) return `Editó ${entidad}${nombre}${sufijo}`;
    if (metodo === 'DELETE' && !subruta) return `Eliminó ${entidad}${sufijo}`;
    if (metodo === 'PATCH' && subruta === 'finalizar') return `Finalizó ${entidad}${sufijo}`;
    if (metodo === 'PATCH' && subruta === 'disponibilidad') {
        const cambio = Number(cuerpo?.cambio);
        const signo = cambio > 0 ? `+${cambio}` : `${cambio}`;
        return `Ajustó las piezas de ${entidad}${sufijo}: ${signo}`;
    }
    return `Modificó ${entidad}${sufijo}`;
}

// Registra en la tabla auditoria cada modificación que el sistema confirma con éxito.
// - entidad: nombre singular para el texto (ej. "cliente")
// - obtenerEtiqueta: función opcional que saca un nombre legible del cuerpo de la petición
function auditar(entidad, obtenerEtiqueta = () => null) {
    return (req, res, next) => {
        if (!METODOS_QUE_MODIFICAN.has(req.method)) return next();

        // Se guardan ahora porque dentro del router estos valores pueden cambiar
        const metodo = req.method;
        const ruta = req.path;
        const cuerpo = req.body;
        const usuario = req.usuario;

        // Se intercepta la respuesta JSON para asentar la auditoría antes de contestar:
        // así el registro ya existe cuando el usuario abre el historial.
        const enviarJson = res.json.bind(res);
        res.json = (respuesta) => {
            // Una petición rechazada o fallida no modificó nada, así que no se audita
            if (res.statusCode >= 400) return enviarJson(respuesta);

            const etiqueta = obtenerEtiqueta(cuerpo);
            const nombre = typeof etiqueta === 'string' && etiqueta.trim() ? etiqueta.trim().slice(0, 80) : null;
            const accion = describir(entidad, metodo, ruta, cuerpo, respuesta, nombre);
            auditoriaModel.registrar({ usuario, accion })
                .catch((error) => console.error('No se pudo registrar la auditoría:', error))
                .finally(() => enviarJson(respuesta));
            return res;
        };

        next();
    };
}

module.exports = { auditar };
