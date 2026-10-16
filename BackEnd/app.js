const express = require("express");
const path = require("path");
require('dotenv').config();

// Rutas importadas por módulo
const loginRoutes = require('./Routes/loginRouter');
const pagpRouter = require('./Routes/pagpRouter');

const app = express();

// Middleware para procesar JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../FrontEnd')));

// Uso de enrutadores
app.use(loginRoutes);
app.use('/api/servicios', pagpRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/Login/Login.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});