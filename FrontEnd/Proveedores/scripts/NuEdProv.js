window.NuEdProv = (() => {
    const API = '/api/proveedores';
    let form, btnCancelar, btnGuardar, mensajeErrorModal, tituloModal, modalContenedor;
    let proveedorEditando = null;

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

    // Limpia los campos del formulario. Se ejecuta cada vez que el modal se cierra,
    // así lo que no se guardó se descarta (RQF 21)
    function limpiarFormulario() {
        proveedorEditando = null;
        if (form) form.reset();
        if (tituloModal) tituloModal.textContent = 'Nuevo / Editar Proveedor';
        mostrarError('');
    }

    // Extrae los valores ingresados en los inputs
    function leerFormulario() {
        const valor = (id) => document.getElementById(id)?.value.trim() || '';
        return {
            nombre: valor('prov-nombre'),
            telefono: valor('prov-telefono'),
            localidad: valor('prov-localidad'),
            numCliente: valor('prov-num-cliente')
        };
    }

    // Inicializa los eventos del modal tras inyectar el HTML
    function init() {
        modalContenedor = document.getElementById('modal-contenedor');
        form = document.getElementById('form-proveedor');
        btnCancelar = document.getElementById('btn-cancelar');
        btnGuardar = document.getElementById('btn-guardar');
        mensajeErrorModal = document.getElementById('mensaje-error-modal');
        tituloModal = document.getElementById('modal-titulo');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                mostrarError('');
                if (btnGuardar) btnGuardar.disabled = true; // evita doble envío

                try {
                    const cuerpo = JSON.stringify(leerFormulario());
                    if (proveedorEditando) {
                        await pedir(`${API}/${proveedorEditando}`, { method: 'PUT', body: cuerpo });
                    } else {
                        await pedir(API, { method: 'POST', body: cuerpo });
                    }
                    cerrar();
                    // Notifica a Prov.js que se guardaron cambios
                    document.dispatchEvent(new CustomEvent('proveedor-guardado'));
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

        limpiarFormulario();
    }

    // Abre la ventana modal (vacía, o rellenada si recibe un ID).
    // Si el proveedor no se puede cargar lanza el error y NO abre el modal,
    // para no terminar creando un proveedor nuevo por accidente.
    async function abrir(id = null) {
        limpiarFormulario();

        if (id) {
            const proveedor = await pedir(`${API}/${id}`);
            proveedorEditando = proveedor.ID_Proveedor;
            document.getElementById('prov-nombre').value = proveedor.Nombre_Prov ?? '';
            document.getElementById('prov-telefono').value = proveedor.Telefono ?? '';
            document.getElementById('prov-localidad').value = proveedor.Localidad ?? '';
            document.getElementById('prov-num-cliente').value = proveedor.Num_Cliente ?? '';
            if (tituloModal) tituloModal.textContent = `Editar Proveedor #${proveedor.ID_Proveedor}`;
        } else if (tituloModal) {
            tituloModal.textContent = 'Nuevo Proveedor';
        }

        if (modalContenedor) modalContenedor.showModal();
    }

    // Cierra la ventana modal
    function cerrar() {
        if (modalContenedor) modalContenedor.close();
    }

    return { init, abrir, cerrar };
})();
