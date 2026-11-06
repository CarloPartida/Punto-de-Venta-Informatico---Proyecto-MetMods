document.addEventListener('DOMContentLoaded', () => {
    const modalCaja = document.getElementById('modal-caja');
    const btnNuevo = document.getElementById('btn-nuevo-soporte');
    const tabla = document.getElementById('tabla-soporte');

    // Carga la plantilla del modal dinámicamente
    async function cargarModal() {
        if (modalCaja.innerHTML.trim() !== '') return;
        try {
            const res = await fetch('index/NuEdSp.html');
            const html = await res.text();
            modalCaja.innerHTML = html;

            const dialog = document.getElementById('dialog-soporte');
            document.getElementById('btn-deshacer')?.addEventListener('click', () => {
                dialog.close();
            });
        } catch (err) {
            console.error('Error cargando NuEdSp.html:', err);
        }
    }

    // Abre la ventana modal nativa superpuesta
    async function abrirModal() {
        await cargarModal();
        if (modalCaja) modalCaja.removeAttribute('hidden');
        const dialog = document.getElementById('dialog-soporte');
        if (dialog) dialog.showModal();
    }

    // Evento para el botón +
    if (btnNuevo) {
        btnNuevo.addEventListener('click', abrirModal);
    }

    // Evento delegado para los botones de editar ✏️
    if (tabla) {
        tabla.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-editar')) {
                abrirModal();
            }
        });
    }
});