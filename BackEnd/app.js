const express = require("express");
const path = require("path");
const session = require("express-session");
require('dotenv').config();
const { auditar } = require('./Middleware/auditoria');

// Rutas importadas por módulo
const loginRoutes = require('./Routes/loginRouter');
const pagpRouter = require('./Routes/pagpRouter');
const carcRouter = require('./Routes/carcRouter');
const invRouter = require('./Routes/invRouter');
const provRouter = require('./Routes/provRouter');
const soporteRouter = require('./Routes/soporteRouter');
const auditoriaRouter = require('./Routes/auditoriaRouter');
const cambiarDatosRoutes = require('./Routes/cambiarDatosRouter');

const app = express();

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Configuración de express-session (reemplaza a sesiones.js)
app.use(session({
    name: 'sesion.sid',
    secret: process.env.SESSION_SECRET || 'clave_secreta_punto_venta',
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/',
        sameSite: 'lax',
        secure: false // Cambiar a true solo si usas HTTPS en producción
    }
}));

// Middleware de autenticación por sesión
function verificarAutenticacion(req, res, next) {
    if (req.session && req.session.usuario) {
        // Asigna el nombre de usuario a req.usuario para que funcione el middleware de auditoría
        req.usuario = req.session.usuario.usuario;
        return next();
    }
    
    // Si no existe sesión activa, devuelve 401 Unauthorized
    return res.status(401).json({ mensaje: "Acceso denegado. Debe iniciar sesión." });
}

app.use(express.static(path.join(__dirname, '../FrontEnd')));

// Uso de enrutadores públicos (login, perfil, logout)
app.use(loginRoutes);

// Enrutadores protegidos con el middleware (cada modificación exitosa queda en la auditoría)
app.use('/api/servicios', verificarAutenticacion, auditar('servicio', cuerpo => cuerpo?.equipo), pagpRouter);
app.use('/api/clientes', verificarAutenticacion, auditar('cliente', cuerpo => cuerpo?.nombre), carcRouter);
app.use('/api/productos', verificarAutenticacion, auditar('producto', cuerpo => cuerpo?.nombre), invRouter);
app.use('/api/proveedores', verificarAutenticacion, auditar('proveedor', cuerpo => cuerpo?.nombre), provRouter);
app.use('/api/soporte/cambiar-datos', verificarAutenticacion, auditar('perfil', cuerpo => cuerpo?.username), cambiarDatosRoutes);
app.use('/api/soporte', verificarAutenticacion, auditar('técnico', cuerpo => cuerpo?.nombre), soporteRouter);
app.use('/Updates', express.static(path.join(__dirname, 'Updates')));

// Historial de modificaciones (solo lectura)
app.use('/api/auditoria', verificarAutenticacion, auditoriaRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/Login/Login.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});