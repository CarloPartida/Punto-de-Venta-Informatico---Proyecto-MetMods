const bcrypt = require('bcryptjs');
const loginModel = require('../Models/loginModel');

const MAX_INTENTOS = 3;
const MINUTOS_BLOQUEO = 1; // Tiempo de bloqueo temporal

// Función para Iniciar Sesión
async function login(req, res) 
{
    try 
    {
        const nombre = req.body.nombre;
        const password = req.body.password;

        if 
        (   // Validaciones de tipo string y que no estén en blanco
            typeof nombre !== 'string' || !nombre.trim() ||
            typeof password !== 'string' || !password.trim()
        ) 
        {   // Si no cumplen, error:
            return res.status(400).json({ mensaje: 'Usuario y contraseña son requeridos' });
        }

        // Mandamos el usuario al Model para buscar el registro en la BD
        const usuario = await loginModel.buscarPorUsuario
        (
            nombre.trim()
        );

        // Validamos que exista el registro
        if (!usuario) 
        {
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        // Verificamos si el usuario está actualmente bloqueado
        const ahora = new Date();
        if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > ahora) 
        {
            const tiempoRestanteMs = new Date(usuario.bloqueado_hasta) - ahora;
            const minutosRestantes = Math.ceil(tiempoRestanteMs / (1000 * 60));

            return res.status(429).json
            ({
                mensaje: `Cuenta bloqueada por seguridad. Intenta de nuevo en ${minutosRestantes} minuto(s).`
            });
        }

        // Comparamos la contraseña ingresada con la encriptada en la BD
        const esValida = await bcrypt.compare(password, usuario.Contrasena);

        if (!esValida) 
        {
            const intentos = (usuario.intentos_fallidos || 0) + 1;

            if (intentos >= MAX_INTENTOS) 
            {   // Calculamos fecha en que expira el bloqueo (ahora + MINUTOS_BLOQUEO)
                const fechaBloqueo = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000);
                await loginModel.registrarIntentoFallido(usuario.ID_Sesion, intentos, fechaBloqueo);

                return res.status(429).json
                ({
                    mensaje: `Has superado los ${MAX_INTENTOS} intentos fallidos. Tu acceso se ha bloqueado por ${MINUTOS_BLOQUEO} minutos.`
                });
            } 
            else 
            {
                await loginModel.registrarIntentoFallido(usuario.ID_Sesion, intentos, null);
                const intentosRestantes = MAX_INTENTOS - intentos;

                return res.status(401).json
                ({
                    mensaje: `Usuario o contraseña incorrectos. Te quedan ${intentosRestantes} intento(s).`
                });
            }
        }

        // Cuando el login es correcto se resetean los contadores
        await loginModel.resetearIntentos(usuario.ID_Sesion);

        // Guardamos en la sesión los datos obtenidos de la BD
        req.session.usuario = 
        {
            id: usuario.ID_Sesion,
            usuario: usuario.nom_user
        };

        // Al ser correcto respondemos con mensaje de éxito y ruta de redirección
        return res.status(200).json
        ({
            mensaje: 'Login exitoso',
            usuario: req.session.usuario,
            redirect: '/Pag Principal/PagP.html'
        });
    } 
    catch (error) 
    {
        console.error('Error al iniciar sesión:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

// Función para consultar el perfil
async function perfil(req, res) 
{
    try 
    {
        if (!req.session.usuario) // Si no existe una sesión activa
        {
            return res.status(401).json
            ({
                mensaje: 'Debes iniciar sesión'
            });
        }

        return res.status(200).json // Si existe sesión, mostramos los datos del usuario
        ({
            mensaje: 'Perfil del usuario',
            usuario: req.session.usuario
        });
    } 
    catch (error) 
    {
        console.error(error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

// Función para cerrar sesión
async function logout(req, res) 
{
    try 
    {
        req.session.destroy((error) => // Destruimos la sesión
        {
            if (error) 
            {
                return res.status(500).json
                ({
                    mensaje: 'No se pudo cerrar sesión'
                });
            }

            res.clearCookie('sesion.sid', // Limpiamos la cookie
            {
                path: '/',
                sameSite: 'lax',
                secure: false
            });

            return res.status(200).json
            ({
                mensaje: 'Sesión cerrada exitosamente'
            });
        });
    } 
    catch (error) 
    {
        console.error(error);
        return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
}

module.exports = 
{
    login,
    perfil,
    logout
};