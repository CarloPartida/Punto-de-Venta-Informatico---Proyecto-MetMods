const express = require("express");
const path = require("path");
require('dotenv').config();
const sesiones = require('./sesiones');
const { auditar } = require('./Middleware/auditoria');

// Middleware de autenticación por Cookie Nativa
function verificarAutenticacion(req, res, next) {
    // Solo se permite el acceso si la cookie corresponde a una sesión creada en el login
    const sesion = sesiones.obtener(req);
    if (sesion) {
        // El nombre de usuario queda disponible para el registro de auditoría
        req.usuario = sesion.usuario;
        return next();
    }
    
    // Si no existe, devuelve 401 Unauthorized
    return res.status(401).json({ error: "Acceso denegado. Debe iniciar sesión." });
}

// Rutas importadas por módulo
const loginRoutes = require('./Routes/loginRouter');
const pagpRouter = require('./Routes/pagpRouter');
const carcRouter = require('./Routes/carcRouter');
const invRouter = require('./Routes/invRouter');
const provRouter = require('./Routes/provRouter');
const soporteRouter = require('./Routes/soporteRouter');
const auditoriaRouter = require('./Routes/auditoriaRouter');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../FrontEnd')));

// Uso de enrutadores públicos
app.use(loginRoutes);

// Enrutadores protegidos con el middleware (cada modificación exitosa queda en la auditoría)
app.use('/api/servicios', verificarAutenticacion, auditar('servicio', cuerpo => cuerpo?.equipo), pagpRouter);
app.use('/api/clientes', verificarAutenticacion, auditar('cliente', cuerpo => cuerpo?.nombre), carcRouter);
app.use('/api/productos', verificarAutenticacion, auditar('producto', cuerpo => cuerpo?.nombre), invRouter);
app.use('/api/proveedores', verificarAutenticacion, auditar('proveedor', cuerpo => cuerpo?.nombre), provRouter);
app.use('/api/soporte', verificarAutenticacion, auditar('técnico', cuerpo => cuerpo?.nombre), soporteRouter);

// Historial de modificaciones (solo lectura)
app.use('/api/auditoria', verificarAutenticacion, auditoriaRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/Login/Login.html'));
});

// Borra cookie al cerrar sesion
app.post('/api/logout', (req, res) => {
    sesiones.destruir(req);
    res.setHeader('Set-Cookie', 'sesion_activa=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.json({ ok: true, mensaje: "Sesión cerrada correctamente" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});