const Perfil = (() => {
    // Inicializa la gestión de visibilidad del panel de usuario
    function inicializar() {
        const btnMenu = document.getElementById('btn-menu');
        const panelPerfil = document.getElementById('panel-perfil');
        if (!btnMenu || !panelPerfil) return;

        // Alterna el estado de visualización del menú de perfil
        btnMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const oculto = panelPerfil.style.display === 'none' || panelPerfil.style.display === '';
            panelPerfil.style.display = oculto ? 'block' : 'none';
        });

        // Oculta el panel cuando se interactúa fuera del componente
        document.addEventListener('click', () => {
            if (panelPerfil) panelPerfil.style.display = 'none';
        });
    }

    return { inicializar };
})();