const fs = require('fs');
const path = require('path');
const CambiarDatosModel = require('../Models/cambiarDatosModel');

const cambiarDatosController = {
    async actualizar(req, res) {
        try {
            const idSesion = req.session?.usuario?.id;
            if (!idSesion) {
                return res.status(401).json({ error: 'Sesión no iniciada' });
            }

            const { username, edad, contActual, contNueva, fotoBase64 } = req.body;
            let fotoPerfil = null;

            // Si viene una imagen en Base64, la guardamos físicamente en BackEnd/Updates
            if (fotoBase64) {
                const coincidencia = fotoBase64.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
                if (!coincidencia) {
                    return res.status(400).json({ error: 'Formato de imagen no válido (usa PNG, JPG o WEBP)' });
                }

                const extension = coincidencia[1] === 'jpeg' ? 'jpg' : coincidencia[1];
                const buffer = Buffer.from(coincidencia[2], 'base64');

                const carpetaUpdates = path.join(__dirname, '../Updates');
                // Crea la carpeta Updates automáticamente si no existe
                if (!fs.existsSync(carpetaUpdates)) {
                    fs.mkdirSync(carpetaUpdates, { recursive: true });
                }

                const nombreArchivo = `perfil_${idSesion}_${Date.now()}.${extension}`;
                fs.writeFileSync(path.join(carpetaUpdates, nombreArchivo), buffer);

                // Esta es la ruta de texto que se guarda en la columna Foto_Perfil de MySQL
                fotoPerfil = `/Updates/${nombreArchivo}`;
            }

            await CambiarDatosModel.guardarCambio({
                idSesion,
                username,
                edad,
                fotoPerfil,
                contActual,
                contNueva
            });

            if (username) req.session.usuario.usuario = username;
            if (fotoPerfil) req.session.usuario.foto = fotoPerfil;

            res.json({
                mensaje: 'Datos actualizados correctamente',
                fotoPerfil
            });
        } catch (error) {
            console.error('Error al cambiar datos:', error);
            res.status(500).json({ error: 'Error interno al guardar los cambios' });
        }
    }
};

module.exports = cambiarDatosController;