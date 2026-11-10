const express = require("express");
const path = require("path");
require('dotenv').config();

// Middleware de autenticación por Cookie Nativa
function verificarAutenticacion(req, res, next) {
    const cookies = req.headers.cookie || '';
    
    // Si la cookie 'sesion_activa=true' existe en la petición, permite el acceso
    if (cookies.includes('sesion_activa=true')) {
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

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../FrontEnd')));

// Uso de enrutadores públicos
app.use(loginRoutes);

// Enrutadores protegidos con el middleware
app.use('/api/servicios', verificarAutenticacion, pagpRouter);
app.use('/api/clientes', verificarAutenticacion, carcRouter);
app.use('/api/productos', verificarAutenticacion, invRouter);
app.use('/api/proveedores', verificarAutenticacion, provRouter);
app.use('/api/soporte', verificarAutenticacion, soporteRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/Login/Login.html'));
});

// Borra cookie al cerrar sesion
app.post('/api/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'sesion_activa=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    res.json({ ok: true, mensaje: "Sesión cerrada correctamente" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});