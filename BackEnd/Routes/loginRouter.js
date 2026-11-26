const { Router } = require('express');
const { login, perfil, logout } = require('../Controllers/loginController');

const router = Router();

// Ruta para iniciar sesión
router.post('/login', login);

// Ruta para consultar el perfil (sesión activa)
router.get('/perfil', perfil);

// Rutas para cerrar sesión y destruir la cookie
router.post('/logout', logout);
router.post('/api/logout', logout);

module.exports = router;