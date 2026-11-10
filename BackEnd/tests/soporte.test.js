// Pruebas del Sprint 13 sin servidor ni base de datos real.
// Ejecutar desde la raíz: node --test BackEnd/tests/soporte.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const tablas = new Map();
let siguienteId = 1;
const queries = [];
const dbSimulada = {
    async execute(sql, valores = []) {
        queries.push(sql);
        if (/FROM soporte WHERE Nombre = \?/i.test(sql)) {
            const [nombre, telefono, ignorarId] = valores;
            return [[...tablas.values()].filter(t => t.Nombre === nombre && t.Telefono === telefono && t.ID_Soporte !== ignorarId).slice(0, 1)];
        }
        if (/SELECT .* FROM soporte WHERE ID_Soporte = \?/i.test(sql)) {
            const r = tablas.get(valores[0]);
            return [r ? [r] : []];
        }
        if (/SELECT .* FROM soporte ORDER BY/i.test(sql)) {
            return [[...tablas.values()].sort((a, b) => a.ID_Soporte - b.ID_Soporte)];
        }
        if (/INSERT INTO soporte/i.test(sql)) {
            const id = siguienteId++;
            const [Nombre, Edad, Telefono, Localidad] = valores;
            tablas.set(id, { ID_Soporte: id, Nombre, Edad, Telefono, Localidad });
            return [{ insertId: id }];
        }
        if (/UPDATE soporte/i.test(sql)) {
            const [Nombre, Edad, Telefono, Localidad, id] = valores;
            tablas.set(id, { ID_Soporte: id, Nombre, Edad, Telefono, Localidad });
            return [{ affectedRows: 1 }];
        }
        if (/DELETE FROM soporte/i.test(sql)) {
            return [{ affectedRows: tablas.delete(valores[0]) ? 1 : 0 }];
        }
        throw Error('Consulta SQL inesperada: ' + sql);
    },
    async end() {}
};

// Inyecta una conexión falsa para probar el controlador y el modelo reales.
const databasePath = require.resolve('../database');
require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: async () => dbSimulada
};
const controlador = require('../Controllers/soporteController');

function request(body = {}, id) {
    return { body, params: { id: id === undefined ? undefined : String(id) } };
}
function respuesta() {
    return {
        codigo: 200,
        contenido: null,
        status(codigo) { this.codigo = codigo; return this; },
        json(data) { this.contenido = data; return this; }
    };
}
const tecnico = { nombre: 'Ana', edad: '23', telefono: '3312345678', localidad: 'Zapopan' };

test('RQF 15, 16 y 17: crear, listar, consultar, editar y eliminar', async () => {
    const crear = respuesta();
    await controlador.crear(request(tecnico), crear);
    assert.equal(crear.codigo, 201);
    const id = crear.contenido.id;

    const lista = respuesta();
    await controlador.listar(request(), lista);
    assert.equal(lista.contenido.length, 1);
    assert.equal(lista.contenido[0].Nombre, 'Ana');

    const porId = respuesta();
    await controlador.obtener(request({}, id), porId);
    assert.equal(porId.contenido.Telefono, '3312345678');

    const editar = respuesta();
    await controlador.actualizar(request({ ...tecnico, nombre: 'Ana María', edad: '' }, id), editar);
    assert.equal(editar.codigo, 200);
    assert.equal(tablas.get(id).Edad, null);
    assert.equal(tablas.get(id).Nombre, 'Ana María');

    const eliminar = respuesta();
    await controlador.eliminar(request({}, id), eliminar);
    assert.equal(eliminar.codigo, 200);
    assert.equal(tablas.size, 0);

    assert.ok(queries.some(q => /INSERT INTO soporte/.test(q)));
    assert.ok(queries.some(q => /UPDATE soporte/.test(q)));
    assert.ok(queries.some(q => /DELETE FROM soporte/.test(q)));
});

test('RQNF 25: rechaza campos demasiado largos', async () => {
    const res = respuesta();
    await controlador.crear(request({ ...tecnico, nombre: 'A'.repeat(101) }), res);
    assert.equal(res.codigo, 400);
    assert.match(res.contenido.error, /100 caracteres/);
});

test('Valida edad, teléfono e ID sin aceptar valores parciales', async () => {
    for (const [dato, valor] of [['edad', '20años'], ['edad', '20.5'], ['edad', '121'], ['telefono', 'abc']]) {
        const res = respuesta();
        await controlador.crear(request({ ...tecnico, [dato]: valor }), res);
        assert.equal(res.codigo, 400, `Debe rechazar ${dato}=${valor}`);
    }
    const res = respuesta();
    await controlador.obtener(request({}, '1xyz'), res);
    assert.equal(res.codigo, 400);
});

test('Evita duplicados y devuelve 404 para registro inexistente', async () => {
    const creado = respuesta();
    await controlador.crear(request(tecnico), creado);
    const duplicado = respuesta();
    await controlador.crear(request(tecnico), duplicado);
    assert.equal(duplicado.codigo, 409);

    const inexistente = respuesta();
    await controlador.eliminar(request({}, 999999), inexistente);
    assert.equal(inexistente.codigo, 404);
});
