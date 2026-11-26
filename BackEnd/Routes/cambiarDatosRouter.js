const express = require('express');
const router = express.Router();
const cambiarDatosController = require('../Controllers/cambiarDatosController');

router.put('/', cambiarDatosController.actualizar);

module.exports = router;