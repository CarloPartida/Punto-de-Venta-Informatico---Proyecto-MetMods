window.NuEd = (() => {
    const API = '/api/clientes';
    let form, btnCancelar, btnGuardar, mensajeErrorModal, tituloModal, modalContenedor;
    let clienteEditando = null;

    // Realiza peticiones HTTP centralizadas para el modal
    async function pedir(url, opciones = {}) {
        const respuesta = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...opciones
        });
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.error || 'Error en la solicitud');
        return datos;
    }

    // Muestra errores dentro del modal
    function mostrarError(texto) {
        if (mensajeErrorModal) {
            mensajeErrorModal.textContent = texto;
            mensajeErrorModal.hidden = !texto;
        }
    }

    // Limpia los campos del formulario
    function limpiarFormulario() {
        clienteEditando = null;
        if (form) form.reset();
        if (tituloModal) tituloModal.textContent = 'Nuevo/Editar Cliente';
        mostrarError('');
    }

    // Extrae los valores ingresados en los inputs
    function leerFormulario() {
        const valor = (id) => document.getElementById(id)?.value.trim() || '';
        return {
            nombre: valor('cliente-nombre'),
            edad: valor('cliente-edad'),
            telefono: valor('cliente-telefono'),
            localidad: valor('cliente-localidad')
        };
    }

    // Inicializa los eventos del modal tras inyectar el HTML 
    function init() {
        modalContenedor = document.getElementById('modal-contenedor');
        form = document.getElementById('form-cliente');
        btnCancelar = document.getElementById('btn-cancelar');
        btnGuardar = document.getElementById('btn-guardar');
        mensajeErrorModal = document.getElementById('mensaje-error-modal');
        tituloModal = document.getElementById('modal-titulo');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                mostrarError('');
                if (btnGuardar) btnGuardar.disabled = true;

                try {
                    const cuerpo = JSON.stringify(leerFormulario());
                    if (clienteEditando) {
                        await pedir(`${API}/${clienteEditando}`, { method: 'PUT', body: cuerpo });
                    } else {
                        await pedir(API, { method: 'POST', body: cuerpo });
                    }
                    cerrar();
                    // Notifica a CarC.js que se guardaron cambios
                    document.dispatchEvent(new CustomEvent('cliente-guardado'));
                } catch (error) {
                    mostrarError(error.message);
                } finally {
                    if (btnGuardar) btnGuardar.disabled = false;
                }
            });
        }

        if (btnCancelar) btnCancelar.addEventListener('click', cerrar);

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

    // Abre la ventana modal (vacía o rellenada si recibe un ID)
    async function abrir(id = null) {
        limpiarFormulario();
        if (id) {
            try {
                const cliente = await pedir(`${API}/${id}`);
                clienteEditando = cliente.ID_Cliente;
                document.getElementById('cliente-nombre').value = cliente.Nombre ?? '';
                document.getElementById('cliente-edad').value = cliente.Edad ?? '';
                document.getElementById('cliente-telefono').value = cliente.Telefono ?? '';
                document.getElementById('cliente-localidad').value = cliente.Localidad ?? '';
                if (tituloModal) tituloModal.textContent = `Editar Cliente #${cliente.ID_Cliente}`;
            } catch (error) {
                mostrarError(error.message);
            }
        }
        if (modalContenedor) modalContenedor.showModal();
    }

    // Cierra la ventana modal
    function cerrar() {
        if (modalContenedor) modalContenedor.close();
    }

    return { init, abrir, cerrar };
})();