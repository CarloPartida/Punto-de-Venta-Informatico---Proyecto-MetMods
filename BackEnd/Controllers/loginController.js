const bcrypt = require('bcryptjs');
const loginModel = require('../Models/loginModel');

const MAX_INTENTOS = 3;
const MINUTOS_BLOQUEO = 1; // Tiempo de bloqueo temporal

async function iniciarSesion(req, res) {
    try {
        const nombre = req.body.nombre;
        const password = req.body.password;

        if (typeof nombre !== 'string' || !nombre.trim() ||
            typeof password !== 'string' || !password.trim()) {
            return res.status(400).send('Usuario y contraseña son requeridos');
        }

        const usuario = await loginModel.buscarPorUsuario(nombre.trim());

        if (!usuario) {
            return res.status(401).send('Usuario o contraseña incorrectos');
        }

        // Verificar si el usuario está actualmente bloqueado
        const ahora = new Date();
        if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > ahora) {
            const tiempoRestanteMs = new Date(usuario.bloqueado_hasta) - ahora;
            const minutosRestantes = Math.ceil(tiempoRestanteMs / (1000 * 60));
            
            return res.status(429).send(`Cuenta bloqueada por seguridad. Intenta de nuevo en ${minutosRestantes} minuto(s).`);
        }

        // Validar contraseña
        const esValida = await bcrypt.compare(password, usuario.Contrasena);

        if (!esValida) {
            const intentos = (usuario.intentos_fallidos || 0) + 1;

            if (intentos >= MAX_INTENTOS) {
                // Calcular fecha en que expira el bloqueo (ahora + MINUTOS_BLOQUEO)
                const fechaBloqueo = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000);
                await loginModel.registrarIntentoFallido(usuario.ID_Sesion, intentos, fechaBloqueo);

                return res.status(429).send(`Has superado los ${MAX_INTENTOS} intentos fallidos. Tu acceso se ha bloqueado por ${MINUTOS_BLOQUEO} minutos.`);
            } else {
                await loginModel.registrarIntentoFallido(usuario.ID_Sesion, intentos, null);
                const intentosRestantes = MAX_INTENTOS - intentos;

                return res.status(401).send(`Usuario o contraseña incorrectos. Te quedan ${intentosRestantes} intento(s).`);
            }
        }

        // Cuando el login es correcto se resetean los contadores
        await loginModel.resetearIntentos(usuario.ID_Sesion);

        // Se crea la cookie de sesión nativa en la respuesta HTTP
        res.setHeader('Set-Cookie', 'sesion_activa=true; Path=/; HttpOnly; SameSite=Lax');

        res.redirect('/Pag Principal/PagP.html'); 
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).send('Error interno del servidor');
    }
}

module.exports = {
    iniciarSesion
};