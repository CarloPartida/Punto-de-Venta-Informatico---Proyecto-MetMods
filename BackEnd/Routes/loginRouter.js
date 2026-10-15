const { Router } = require('express');
const { iniciarSesion } = require('../Controllers/loginController');

const router = Router();

router.post('/login', iniciarSesion);

module.exports = router;