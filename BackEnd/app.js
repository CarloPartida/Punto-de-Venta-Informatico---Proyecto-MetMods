const express = require("express");
const path = require("path");
require('dotenv').config();

// Rutas importadas por módulo
const loginRoutes = require('./Routes/loginRouter');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../FrontEnd')));

// Uso de enrutadores
app.use(loginRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../FrontEnd/Login/Login.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(3000, () => {
    console.log(`Servidor ejecutándose en http://localhost:3000`);
});