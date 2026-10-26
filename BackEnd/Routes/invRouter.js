const { Router } = require('express');
const controlador = require('../Controllers/invController');

const router = Router();

// Ruta para obtener el inventario completo
router.get('/', controlador.listar);

// Ruta para obtener un producto por ID
router.get('/:id', controlador.obtener);

// Ruta para registrar un nuevo producto
router.post('/', controlador.crear);

// Ruta para actualizar un producto existente
router.put('/:id', controlador.actualizar);

// Ruta para aumentar o disminuir las piezas disponibles
router.patch('/:id/disponibilidad', controlador.ajustarDisponibilidad);

// Ruta para eliminar un producto
router.delete('/:id', controlador.eliminar);

module.exports = router;
