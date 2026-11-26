const Perfil = (() => {
    // Función para consultar la sesión activa y mostrar los datos del usuario
    async function cargarDatos() 
    {
        try 
        {
            const res = await fetch('/perfil'); // Pedimos los datos de la sesión

            if (!res.ok) // Si no hay sesión activa, regresamos al Login
            {
                window.location.href = '/Login/Login.html';
                return;
            }

            const data = await res.json();
            const usuarioEl = document.getElementById('perfil-usuario');
            const correoEl = document.getElementById('perfil-correo');

            // Mostramos el nombre y el ID en la tarjeta
            if (data.usuario) 
            {
                if (usuarioEl) usuarioEl.textContent = data.usuario.usuario;
                if (correoEl) correoEl.textContent = `ID Sesión: #${data.usuario.id}`;
            }
        } 
        catch (error) 
        {
            console.error('Error al verificar sesión:', error);
        }
    }

    // Función para cerrar sesión y destruir la cookie
    function configurarLogout() 
    {
        const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
        if (!btnCerrarSesion) return;

        btnCerrarSesion.addEventListener('click', async (e) => 
        {
            e.stopPropagation(); // Evita que el clic solo cierre el panel

            try 
            {
                const res = await fetch('/logout', // Llamamos al cierre de sesión
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (res.ok) // Si se destruyó la sesión, vamos al Login
                {
                    window.location.href = '/Login/Login.html';
                } 
                else 
                {
                    const data = await res.json();
                    alert(data.mensaje || 'No se pudo cerrar sesión');
                }
            } 
            catch (error) 
            {
                console.error('Error al cerrar sesión:', error);
                alert('Error de conexión con el servidor');
            }
        });
    }

    // Inicializa la gestión de visibilidad del panel de usuario
    function inicializar() 
    {
        const btnMenu = document.getElementById('btn-menu');
        const panelPerfil = document.getElementById('panel-perfil');
        if (!btnMenu || !panelPerfil) return;

        // Alterna el estado de visualización del menú de perfil
        btnMenu.addEventListener('click', (e) => 
        {
            e.stopPropagation();
            const oculto = panelPerfil.style.display === 'none' || panelPerfil.style.display === '';
            panelPerfil.style.display = oculto ? 'block' : 'none';
        });

        // Evita que hacer clic dentro de la tarjeta la cierre
        panelPerfil.addEventListener('click', (e) => 
        {
            e.stopPropagation();
        });

        // Oculta el panel cuando se interactúa fuera del componente
        document.addEventListener('click', () => 
        {
            if (panelPerfil) panelPerfil.style.display = 'none';
        });

        cargarDatos();      // Carga los datos del usuario al iniciar
        configurarLogout(); // Activa el botón de cerrar sesión
    }

    return { inicializar };
})();