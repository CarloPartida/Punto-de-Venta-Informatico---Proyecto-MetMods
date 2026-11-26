document.addEventListener('DOMContentLoaded', async () => {
    const dialog = document.getElementById('modal-cambiar-contenedor');
    const caja = document.getElementById('modal-cambiar-caja');
    const contenedorPerfil = document.getElementById('contenedor-perfil');
    if (!dialog || !caja) return;

    // Ajusta esta URL a la ruta real de tu API en Node.js
    const API = '/api/soporte/cambiar-datos';

    // 1. Inyecta la plantilla HTML de Cambiar Datos dentro del modal
    const res = await fetch('../Cambiar Datos/index/PagCD.html');
    if (res.ok) caja.innerHTML = await res.text();

    // Referencias internas dentro de PagCD.html (ajusta los IDs si los nombraste distinto)
    const form = caja.querySelector('form');
    const estado = caja.querySelector('#estado-cambiar-datos') || caja.querySelector('[role="status"]');

    // 2. Abrir modal al hacer clic en "Cambiar datos de Soporte"
    // Usamos contenedorPerfil (o fase de captura `true`) porque Perfil.js hace e.stopPropagation()
    const targetEscucha = contenedorPerfil || document;
    targetEscucha.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.id === 'btn-cambiar-datos' || btn.textContent.trim() === 'Cambiar datos de Soporte') {
            // Oculta la tarjeta flotante del perfil al abrir el modal
            const panelPerfil = document.getElementById('panel-perfil');
            if (panelPerfil) panelPerfil.style.display = 'none';

            if (form) form.reset();
            if (estado) estado.textContent = '';

            dialog.showModal();

            // Enfoca el primer campo editable para accesibilidad
            const primerInput = caja.querySelector('input, textarea, select');
            if (primerInput) primerInput.focus();
        }
    }, true); // El `true` (capture phase) garantiza que se ejecute antes del stopPropagation de Perfil.js

    // 3. Cerrar modal con el botón de cierre (X) o botón cancelar
    caja.addEventListener('click', (e) => {
        if (e.target.closest('#btn-cerrar-cambiar, .btn-close, [data-cerrar]')) {
            dialog.close();
        }
    });

    // Cerrar también si hacen clic fuera de la caja del diálogo (en el backdrop)
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
    });

    // 4. Envío del formulario hacia la API
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (estado) estado.textContent = 'Guardando cambios…';

            const btnSubmit = form.querySelector('button[type="submit"]');
            if (btnSubmit) btnSubmit.disabled = true;

            try {
                const formData = new FormData(form);
                const payload = Object.fromEntries(formData.entries());

                const respuesta = await fetch(API, {
                    method: 'PUT', // Cámbialo a 'POST' o 'PATCH' según tu ruta en Node
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const datos = await respuesta.json().catch(() => ({}));
                if (!respuesta.ok) throw new Error(datos.error || datos.mensaje || 'No se pudieron guardar los cambios');

                if (estado) estado.textContent = 'Datos actualizados correctamente.';
                setTimeout(() => dialog.close(), 900);
            } catch (err) {
                if (estado) estado.textContent = err.message;
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }
});