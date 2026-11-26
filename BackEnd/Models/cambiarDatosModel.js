const conexion = require('../database');

const CambiarDatosModel = {
    async guardarCambio({ idSesion, username, edad, fotoPerfil, contActual, contNueva }) {
        const db = await conexion();
        try {
            const sql = `
                INSERT INTO cambiar_datos 
                (ID_Sesion, Username, Edad, Foto_Perfil, Cont_Actual, Cont_Nueva) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const [resultado] = await db.execute(sql, [
                idSesion,
                username || null,
                edad || null,
                fotoPerfil || null,
                contActual || null,
                contNueva || null
            ]);

            // Actualiza también la tabla login si cambiaron usuario o contraseña
            if (username || contNueva) {
                await db.execute(
                    'UPDATE login SET nom_user = COALESCE(?, nom_user), contrasena = COALESCE(?, Contrasena) WHERE ID_Sesion = ?',
                    [username || null, contNueva || null, idSesion]
                );
            }

            return resultado;
        } finally {
            await db.end();
        }
    },

    async obtenerUltimoPorSesion(idSesion) {
        const db = await conexion();
        try {
            const [rows] = await db.execute(
                'SELECT * FROM cambiar_datos WHERE ID_Sesion = ? ORDER BY ID_Perfil DESC LIMIT 1',
                [idSesion]
            );
            return rows[0] || null;
        } finally {
            await db.end();
        }
    }
};

module.exports = CambiarDatosModel;