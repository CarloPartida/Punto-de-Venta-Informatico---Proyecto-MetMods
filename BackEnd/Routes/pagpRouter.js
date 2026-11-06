const { Router } = require('express');
const controlador = require('../Controllers/pagpController');

const router = Router();

// Rutas fijas y específicas
router.get('/', controlador.listarPendientes);
router.get('/productos', controlador.listarProductos);
router.get('/clientes', controlador.listarClientes);

// Ruta con parámetro dinámico
router.get('/:id', controlador.obtener);

// Métodos POST, PUT y PATCH
router.post('/', controlador.crear);
router.put('/:id', controlador.actualizar);
router.patch('/:id/finalizar', controlador.finalizar);

module.exports = router;