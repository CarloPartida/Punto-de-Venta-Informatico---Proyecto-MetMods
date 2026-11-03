const { Router } = require('express');
const controlador = require('../Controllers/provController');

const router = Router();

// Ruta para obtener la lista de proveedores
router.get('/', controlador.listar);

// Ruta para obtener un proveedor por ID
router.get('/:id', controlador.obtener);

// Ruta para registrar un nuevo proveedor
router.post('/', controlador.crear);

// Ruta para actualizar un proveedor existente
router.put('/:id', controlador.actualizar);

// Ruta para eliminar un proveedor
router.delete('/:id', controlador.eliminar);

module.exports = router;
