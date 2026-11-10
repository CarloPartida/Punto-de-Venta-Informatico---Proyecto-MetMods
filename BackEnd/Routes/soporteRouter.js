const { Router } = require('express');
const controlador = require('../Controllers/soporteController');

const router = Router();

// RQNF 23: los teléfonos del personal no deben indexarse en buscadores
router.use((req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.set('Cache-Control', 'private, no-store');
    next();
});

// Ruta para obtener la lista del personal de soporte
router.get('/', controlador.listar);

// Ruta para obtener un técnico por ID
router.get('/:id', controlador.obtener);

// Ruta para registrar un nuevo técnico
router.post('/', controlador.crear);

// Ruta para actualizar un técnico existente
router.put('/:id', controlador.actualizar);

// Ruta para eliminar un técnico
router.delete('/:id', controlador.eliminar);

module.exports = router;
