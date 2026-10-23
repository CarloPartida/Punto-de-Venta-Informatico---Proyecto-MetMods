window.NuEdInv = (() => {
    let form, btnCancelar, modalContenedor;

    function limpiarFormulario() {
        if (form) form.reset();
    }

    function init() {
        modalContenedor = document.getElementById('modal-contenedor');
        form = document.getElementById('form-producto');
        btnCancelar = document.getElementById('btn-cancelar');

        // Evento del botón Confirmar (envío del formulario)
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                cerrar();
            });
        }

        // Evento del botón Cancelar
        if (btnCancelar) {
            btnCancelar.addEventListener('click', cerrar);
        }

        // Cierre al dar clic fuera de la caja modal o evento close
        if (modalContenedor) {
            modalContenedor.addEventListener('close', limpiarFormulario);
            modalContenedor.addEventListener('click', (e) => {
                const rect = modalContenedor.getBoundingClientRect();
                const clicDentro = (
                    rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                    rect.left <= e.clientX && e.clientX <= rect.left + rect.width
                );
                if (!clicDentro) cerrar();
            });
        }
    }

    function abrir() {
        limpiarFormulario();
        if (modalContenedor) modalContenedor.showModal();
    }

    function cerrar() {
        if (modalContenedor) modalContenedor.close();
    }

    return { init, abrir, cerrar };
})();