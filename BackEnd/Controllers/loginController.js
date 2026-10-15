const bcrypt = require('bcryptjs');
const loginModel = require('../Models/loginModel');

async function iniciarSesion(req, res) {
    try {
        const nombre = req.body.nombre;
        const password = req.body.password;

        if (typeof nombre !== 'string' || !nombre.trim() ||
            typeof password !== 'string' || !password.trim()) {
            return res.status(400).send('Usuario y contraseña son requeridos');
        }

        const usuario = await loginModel.buscarPorUsuario(nombre.trim());

        if (!usuario || !(await bcrypt.compare(password, usuario.Contrasena))) {
            return res.status(401).send('Usuario o contraseña incorrectos');
        }

        res.redirect('/Pag Principal/PagP.html'); 
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).send('Error interno del servidor');
    }
}

module.exports = {
    iniciarSesion
};