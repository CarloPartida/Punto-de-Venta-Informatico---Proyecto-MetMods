// Pruebas de integración del Registro de Auditoría contra una base de datos REAL (sin simulaciones).
//
// Usa una base aparte llamada sistema_servicios_test, que debe tener las mismas tablas que la base real
// (importar el mismo .sql del equipo). Las credenciales se toman de BackEnd/.env, pero NUNCA se usa
// la base real: esta prueba vacía sus tablas, y los registros de auditoría no se pueden borrar a propósito.
//
// Ejecutar desde la raíz del repositorio: node --test BackEnd/tests/auditoria.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const mysql2 = require('mysql2/promise');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });

const BD_PRUEBA = 'sistema_servicios_test';
const PUERTO = 3999;
const URL_BASE = `http://localhost:${PUERTO}`;
const USUARIO = 'auditor_test';
const CLAVE = 'ClavePrueba123';

let db;
let servidor;
let cookie;

// Inicia sesión y retorna la cookie que entrega el servidor
async function iniciarSesion() {
    const res = await fetch(`${URL_BASE}/login`, {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ nombre: USUARIO, password: CLAVE })
    });
    assert.equal(res.status, 302, 'el login de prueba debe redirigir a la página principal');
    return res.headers.getSetCookie()[0].split(';')[0];
}

// Hace una petición a la API y retorna { status, datos }
async function api(metodo, ruta, cuerpo, cookieUsada = cookie) {
    const opciones = { method: metodo, headers: {} };
    if (cookieUsada) opciones.headers.Cookie = cookieUsada;
    if (cuerpo !== undefined) {
        opciones.headers['Content-Type'] = 'application/json';
        opciones.body = JSON.stringify(cuerpo);
    }
    const res = await fetch(`${URL_BASE}${ruta}`, opciones);
    return { status: res.status, datos: await res.json().catch(() => null), headers: res.headers };
}

async function contarAuditoria() {
    const [[fila]] = await db.query('SELECT COUNT(*) AS total FROM auditoria');
    return fila.total;
}

async function ultimoRegistro() {
    const [[fila]] = await db.query(
        'SELECT *, TIMESTAMPDIFF(SECOND, Fecha_Hora, NOW()) AS segundos FROM auditoria ORDER BY ID_Auditoria DESC LIMIT 1'
    );
    return fila;
}

test.before(async () => {
    db = await mysql2.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT),
        database: BD_PRUEBA,
        multipleStatements: true
    });

    // Protecciones de solo lectura (RQNF 32 y 34), igual que en la base real
    await db.query(fs.readFileSync(path.join(__dirname, '../SQL/auditoria_solo_lectura.sql'), 'utf8'));

    // Estado limpio. TRUNCATE no dispara los triggers de solo lectura: solo se permite en la base de pruebas
    await db.query(`
        SET FOREIGN_KEY_CHECKS = 0;
        TRUNCATE TABLE detalle_venta; TRUNCATE TABLE servicio; TRUNCATE TABLE cartera_cliente;
        TRUNCATE TABLE producto; TRUNCATE TABLE proveedor; TRUNCATE TABLE soporte; TRUNCATE TABLE auditoria;
        SET FOREIGN_KEY_CHECKS = 1;
    `);
    await db.query('DELETE FROM login WHERE nom_user = ?', [USUARIO]);
    await db.query('INSERT INTO login (nom_user, Contrasena) VALUES (?, ?)', [USUARIO, bcrypt.hashSync(CLAVE, 10)]);

    // Servidor real de la aplicación apuntando a la base de pruebas
    servidor = spawn(process.execPath, ['app.js'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PORT: String(PUERTO), DB_NAME: BD_PRUEBA },
        stdio: 'ignore'
    });
    for (let i = 0; i < 50; i++) {
        try { await fetch(`${URL_BASE}/`); break; } catch { await new Promise(r => setTimeout(r, 200)); }
    }
    cookie = await iniciarSesion();
});

test.after(async () => {
    if (servidor) servidor.kill();
    if (db) await db.end();
});

test('sin sesión, o con la cookie falsa antigua, no se puede ver ni modificar nada', async () => {
    const antes = await contarAuditoria();
    assert.equal((await api('GET', '/api/auditoria', undefined, null)).status, 401);
    assert.equal((await api('GET', '/api/auditoria', undefined, 'sesion_activa=true')).status, 401);
    assert.equal((await api('POST', '/api/clientes', { nombre: 'Intruso' }, 'sesion_activa=true')).status, 401);
    assert.equal(await contarAuditoria(), antes);
});

test('el historial empieza vacío', async () => {
    const { status, datos } = await api('GET', '/api/auditoria');
    assert.equal(status, 200);
    assert.deepEqual(datos, { registros: [], siguiente: null });
});

test('RQF 22 y 23: crear, editar y eliminar un cliente queda registrado con usuario, acción y fecha', async () => {
    const creado = await api('POST', '/api/clientes', { nombre: 'Cliente Prueba', telefono: '555 1234' });
    assert.equal(creado.status, 201);
    const id = creado.datos.id;

    let registro = await ultimoRegistro();
    assert.equal(registro.Modificado_Por, USUARIO);
    assert.equal(registro.Accion, `Creó cliente «Cliente Prueba» (ID ${id})`);
    assert.ok(registro.segundos >= 0 && registro.segundos <= 5, 'la fecha debe ser la actual');

    assert.equal((await api('PUT', `/api/clientes/${id}`, { nombre: 'Cliente Editado' })).status, 200);
    assert.equal((await ultimoRegistro()).Accion, `Editó cliente «Cliente Editado» (ID ${id})`);

    assert.equal((await api('DELETE', `/api/clientes/${id}`)).status, 200);
    registro = await ultimoRegistro();
    assert.equal(registro.Accion, `Eliminó cliente (ID ${id})`);
    assert.equal(registro.Modificado_Por, USUARIO);
    assert.equal(await contarAuditoria(), 3);
});

test('RQF 22: también se registran los cambios de inventario, proveedores, soporte y servicios', async () => {
    const antes = await contarAuditoria();

    const producto = (await api('POST', '/api/productos', { nombre: 'Cable HDMI', precio: 50, disponibilidad: 3 })).datos.id;
    assert.equal((await api('PATCH', `/api/productos/${producto}/disponibilidad`, { cambio: 2 })).status, 200);
    assert.equal((await ultimoRegistro()).Accion, `Ajustó las piezas de producto (ID ${producto}): +2`);
    assert.equal((await api('PATCH', `/api/productos/${producto}/disponibilidad`, { cambio: -1 })).status, 200);
    assert.equal((await ultimoRegistro()).Accion, `Ajustó las piezas de producto (ID ${producto}): -1`);
    assert.equal((await api('DELETE', `/api/productos/${producto}`)).status, 200);

    const proveedor = (await api('POST', '/api/proveedores', { nombre: 'Proveedor Uno' })).datos.id;
    assert.equal((await ultimoRegistro()).Accion, `Creó proveedor «Proveedor Uno» (ID ${proveedor})`);
    assert.equal((await api('DELETE', `/api/proveedores/${proveedor}`)).status, 200);

    const tecnico = (await api('POST', '/api/soporte', { nombre: 'Técnico Uno' })).datos.id;
    assert.equal((await ultimoRegistro()).Accion, `Creó técnico «Técnico Uno» (ID ${tecnico})`);
    assert.equal((await api('DELETE', `/api/soporte/${tecnico}`)).status, 200);

    const servicio = (await api('POST', '/api/servicios', { equipo: 'Laptop HP', cliente: { nombre: 'Cliente Servicio' } })).datos.id;
    assert.equal((await ultimoRegistro()).Accion, `Creó servicio «Laptop HP» (ID ${servicio})`);
    assert.equal((await api('PATCH', `/api/servicios/${servicio}/finalizar`)).status, 200);
    assert.equal((await ultimoRegistro()).Accion, `Finalizó servicio (ID ${servicio})`);

    // 3 de producto + 2 de proveedor + 2 de soporte + 2 de servicio + 1 más de producto (eliminar)
    assert.equal(await contarAuditoria() - antes, 10);
});

test('lo que no modificó nada no se audita: lecturas, validaciones fallidas y registros inexistentes', async () => {
    const antes = await contarAuditoria();
    assert.equal((await api('GET', '/api/clientes')).status, 200);
    assert.equal((await api('GET', '/api/productos')).status, 200);
    assert.equal((await api('POST', '/api/clientes', { nombre: '   ' })).status, 400);
    assert.equal((await api('PUT', '/api/clientes/999999', { nombre: 'Nadie' })).status, 404);
    assert.equal((await api('DELETE', '/api/clientes/999999')).status, 404);
    assert.equal((await api('PATCH', '/api/servicios/999999/finalizar')).status, 404);
    assert.equal(await contarAuditoria(), antes);
});

test('un nombre muy largo no rompe el registro (la acción cabe en 255 caracteres)', async () => {
    const res = await api('POST', '/api/clientes', { nombre: 'N'.repeat(100) });
    assert.equal(res.status, 201);
    const registro = await ultimoRegistro();
    assert.ok(registro.Accion.length <= 255);
    assert.match(registro.Accion, /^Creó cliente «N{80}» \(ID \d+\)$/);
});

test('RQNF 32: la API de auditoría solo permite leer', async () => {
    const antes = await contarAuditoria();
    const ultimo = await ultimoRegistro();

    for (const metodo of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        for (const ruta of ['/api/auditoria', `/api/auditoria/${ultimo.ID_Auditoria}`]) {
            const res = await api(metodo, ruta, { Accion: 'manipulada' });
            assert.equal(res.status, 405, `${metodo} ${ruta}`);
            assert.equal(res.headers.get('allow'), 'GET');
        }
    }
    assert.equal(await contarAuditoria(), antes);
    assert.deepEqual(await ultimoRegistro(), ultimo, 'el último registro no debe cambiar');
});

test('RQNF 32: la base de datos rechaza editar o eliminar registros de auditoría', async () => {
    const antes = await contarAuditoria();
    await assert.rejects(db.query("UPDATE auditoria SET Accion = 'manipulada'"), { errno: 1644 });
    await assert.rejects(db.query('DELETE FROM auditoria WHERE ID_Auditoria > 0'), { errno: 1644 });
    await assert.rejects(db.query('DELETE FROM auditoria'), { errno: 1644 });
    assert.equal(await contarAuditoria(), antes);
});

test('RQNF 34: la base de datos rechaza acciones sin marca de tiempo válida', async () => {
    const antes = await contarAuditoria();
    await assert.rejects(
        db.query("INSERT INTO auditoria (Modificado_Por, Accion, Fecha_Hora) VALUES ('x', 'sin fecha', NULL)"),
        { errno: 1048 }
    );
    await assert.rejects(
        db.query("INSERT INTO auditoria (Modificado_Por, Accion, Fecha_Hora) VALUES ('x', 'fecha cero', '0000-00-00 00:00:00')"),
        { errno: 4025 }
    );
    assert.equal(await contarAuditoria(), antes);
});

test('RQF 24 y RQNF 33: el historial se entrega paginado, del más reciente al más antiguo, sin repetir ni omitir', async () => {
    const valores = Array.from({ length: 120 }, (_, i) => `('masivo', 'Registro masivo ${i}', NOW())`).join(',');
    await db.query(`INSERT INTO auditoria (Modificado_Por, Accion, Fecha_Hora) VALUES ${valores}`);
    const total = await contarAuditoria();

    const primera = await api('GET', '/api/auditoria?limite=50');
    assert.equal(primera.status, 200);
    assert.equal(primera.datos.registros.length, 50);
    assert.equal(primera.headers.get('cache-control'), 'no-store');
    for (const campo of ['ID_Auditoria', 'Modificado_Por', 'Accion', 'Fecha_Hora']) {
        assert.ok(campo in primera.datos.registros[0], `falta ${campo}`);
    }
    assert.match(primera.datos.registros[0].Fecha_Hora, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);

    const ids = [];
    let cursor = null;
    let paginas = 0;
    do {
        const { datos } = await api('GET', `/api/auditoria?limite=50${cursor ? `&antes=${cursor}` : ''}`);
        ids.push(...datos.registros.map(r => r.ID_Auditoria));
        cursor = datos.siguiente;
        paginas++;
        assert.ok(paginas <= Math.ceil(total / 50), 'la paginación no termina: el cursor no avanza');
    } while (cursor);

    assert.equal(ids.length, total);
    assert.equal(new Set(ids).size, total, 'no debe haber registros repetidos');
    assert.deepEqual(ids, [...ids].sort((a, b) => b - a), 'orden descendente');
    assert.equal(paginas, Math.ceil(total / 50));

    // Sin parámetros se usa la página por defecto
    assert.equal((await api('GET', '/api/auditoria')).datos.registros.length, 50);
});

test('los parámetros de paginación inválidos se rechazan con 400', async () => {
    for (const consulta of ['limite=0', 'limite=abc', 'limite=-1', 'limite=101', 'limite=1.5', 'antes=0', 'antes=-5', 'antes=abc', 'antes=1;DROP']) {
        const res = await api('GET', `/api/auditoria?${consulta}`);
        assert.equal(res.status, 400, consulta);
        assert.ok(res.datos.error);
    }
});

test('cerrar sesión invalida la cookie en el servidor', async () => {
    const otraCookie = await iniciarSesion();
    assert.equal((await api('GET', '/api/auditoria', undefined, otraCookie)).status, 200);
    assert.equal((await api('POST', '/api/logout', undefined, otraCookie)).status, 200);
    assert.equal((await api('GET', '/api/auditoria', undefined, otraCookie)).status, 401);
});
