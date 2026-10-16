const { Router } = require('express');
const controlador = require('../Controllers/pagpController');

const router = Router();

// Ruta para obtener la lista de servicios pendientes
router.get('/', controlador.listarPendientes);

// Ruta para consultar el catálogo de productos disponibles
router.get('/productos', controlador.listarProductos);

// Ruta para obtener los detalles de un servicio específico por ID
router.get('/:id', controlador.obtener);

// Ruta para registrar un nuevo servicio
router.post('/', controlador.crear);

// Ruta para actualizar un servicio pendiente existente
router.put('/:id', controlador.actualizar);

// Ruta para marcar un servicio como finalizado
router.patch('/:id/finalizar', controlador.finalizar);

module.exports = router;