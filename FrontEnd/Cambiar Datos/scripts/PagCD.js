document.addEventListener('DOMContentLoaded', async () => {
    const dialog = document.getElementById('modal-cambiar-contenedor');
    const caja = document.getElementById('modal-cambiar-caja');
    const contenedorPerfil = document.getElementById('contenedor-perfil');
    if (!dialog || !caja) return;

    const API = '/api/soporte/cambiar-datos';

    // 1. Inyecta la plantilla HTML de Cambiar Datos dentro del modal
    const res = await fetch('../Cambiar Datos/index/PagCD.html');
    if (res.ok) caja.innerHTML = await res.text();

    // Referencias internas dentro de PagCD.html
    const form = caja.querySelector('#form-cambiar-datos');
    const estado = caja.querySelector('#estado-cambiar-datos');
    const btnCambiarFoto = caja.querySelector('#btn-cambiar-foto');
    const inputFoto = caja.querySelector('#input-foto-perfil');
    const previewFoto = caja.querySelector('#preview-foto-perfil');
    const btnDeshacer = caja.querySelector('#btn-deshacer-datos');

    function limpiarPreviewFoto() {
        if (previewFoto) previewFoto.style.backgroundImage = '';
        if (inputFoto) inputFoto.value = '';
    }

    // 2. Conectar botón "Cambiar foto de perfil" con el input oculto y pintar vista previa
    if (btnCambiarFoto && inputFoto) {
        btnCambiarFoto.addEventListener('click', () => {
            inputFoto.click();
        });

        inputFoto.addEventListener('change', () => {
            const archivo = inputFoto.files[0];
            if (!archivo) return;

            const lector = new FileReader();
            lector.onload = (ev) => {
                if (previewFoto) {
                    previewFoto.style.backgroundImage = `url("${ev.target.result}")`;
                }
            };
            lector.readAsDataURL(archivo);
        });
    }

    // Botón Deshacer: limpia textos, foto y mensajes
    if (btnDeshacer && form) {
        btnDeshacer.addEventListener('click', () => {
            form.reset();
            limpiarPreviewFoto();
            if (estado) estado.textContent = '';
        });
    }

    // 3. Abrir modal al hacer clic en "Cambiar datos de Soporte"
    const targetEscucha = contenedorPerfil || document;
    targetEscucha.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.id === 'btn-cambiar-datos' || btn.textContent.trim() === 'Cambiar datos de Soporte') {
            const panelPerfil = document.getElementById('panel-perfil');
            if (panelPerfil) panelPerfil.style.display = 'none';

            if (form) form.reset();
            limpiarPreviewFoto();
            if (estado) estado.textContent = '';

            dialog.showModal();

            const primerInput = caja.querySelector('#input-username');
            if (primerInput) primerInput.focus();
        }
    }, true);

    // 4. Cerrar modal con la X o haciendo clic fuera
    caja.addEventListener('click', (e) => {
        if (e.target.closest('#btn-cerrar-cambiar-datos, .btn-close, [data-cerrar]')) {
            dialog.close();
        }
    });

    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
    });

    // Función auxiliar para convertir la imagen a texto Base64
    function leerImagenBase64(archivo) {
        return new Promise((resolve, reject) => {
            if (!archivo) return resolve(null);
            const lector = new FileReader();
            lector.onload = () => resolve(lector.result);
            lector.onerror = () => reject(new Error('No se pudo leer la imagen'));
            lector.readAsDataURL(archivo);
        });
    }

    // 5. Envío del formulario hacia la API
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (estado) {
                estado.className = 'small text-center text-secondary';
                estado.textContent = 'Guardando cambios…';
            }

            const btnSubmit = form.querySelector('button[type="submit"]');
            if (btnSubmit) btnSubmit.disabled = true;

            try {
                const formData = new FormData(form);
                const archivoFoto = inputFoto?.files[0];
                const fotoBase64 = await leerImagenBase64(archivoFoto);

                const payload = {
                    username: formData.get('username'),
                    edad: formData.get('edad'),
                    contActual: formData.get('contActual'),
                    contNueva: formData.get('contNueva'),
                    fotoBase64
                };

                const respuesta = await fetch(API, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const datos = await respuesta.json().catch(() => ({}));
                if (!respuesta.ok) throw new Error(datos.error || datos.mensaje || 'No se pudieron guardar los cambios');

                if (estado) {
                    estado.className = 'small text-center text-success';
                    estado.textContent = 'Datos actualizados correctamente.';
                }

                // Actualiza visualmente el perfil en pantalla si cambió usuario o foto
                if (payload.username) {
                    const usuarioEl = document.getElementById('perfil-usuario');
                    if (usuarioEl) usuarioEl.textContent = payload.username;
                }
                if (datos.fotoPerfil) {
                    const avatarEl = document.querySelector('#panel-perfil img');
                    if (avatarEl) avatarEl.src = datos.fotoPerfil;
                }

                setTimeout(() => dialog.close(), 900);
            } catch (err) {
                if (estado) {
                    estado.className = 'small text-center text-danger';
                    estado.textContent = err.message;
                }
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }
});