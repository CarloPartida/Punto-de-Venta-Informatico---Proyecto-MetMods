const { Router } = require('express');
const controlador = require('../Controllers/carcController');

const router = Router();

// Ruta para obtener la cartera de clientes
router.get('/', controlador.listar);

// Ruta para obtener los datos de un cliente por ID
router.get('/:id', controlador.obtener);

// Ruta para registrar un nuevo cliente
router.post('/', controlador.crear);

// Ruta para actualizar un cliente existente
router.put('/:id', controlador.actualizar);

// Ruta para eliminar un cliente
router.delete('/:id', controlador.eliminar);

module.exports = router;
