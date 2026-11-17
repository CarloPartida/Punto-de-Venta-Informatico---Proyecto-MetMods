const { Router } = require('express');
const controlador = require('../Controllers/auditoriaController');

const router = Router();

// El historial cambia con cada modificación: nunca debe servirse desde caché
router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Ruta para consultar el historial de modificaciones
router.get('/', controlador.listar);

// RQNF 32: el registro es de solo lectura, no existen rutas para crear, editar ni eliminar
router.use((req, res) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
        return res.status(404).json({ error: 'Ruta no encontrada' });
    }
    res.set('Allow', 'GET').status(405).json({ error: 'El registro de auditoría es de solo lectura' });
});

module.exports = router;
