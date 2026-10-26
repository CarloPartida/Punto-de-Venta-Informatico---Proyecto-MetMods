window.NuEdInv = (() => {
    const API = '/api/productos';
    let form, btnCancelar, btnGuardar, mensajeErrorModal, tituloModal, modalContenedor,
        chkNoInventariable, inputDisponibilidad;
    let productoEditando = null;

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

    // Si el producto es "No inventariable", la disponibilidad queda en 0 y se bloquea
    function sincronizarNoInventariable() {
        if (!chkNoInventariable || !inputDisponibilidad) return;
        if (chkNoInventariable.checked) inputDisponibilidad.value = '0';
        inputDisponibilidad.disabled = chkNoInventariable.checked;
    }

    // Limpia los campos del formulario
    function limpiarFormulario() {
        productoEditando = null;
        if (form) form.reset();
        sincronizarNoInventariable();
        if (tituloModal) tituloModal.textContent = 'Nuevo / Editar Producto';
        mostrarError('');
    }

    // Extrae los valores ingresados en los inputs
    function leerFormulario() {
        const valor = (id) => document.getElementById(id)?.value.trim() || '';
        const noInventariable = chkNoInventariable.checked;
        return {
            nombre: valor('prod-nombre'),
            descripcion: valor('prod-descripcion'),
            precio: valor('prod-precio'),
            disponibilidad: noInventariable ? '0' : valor('prod-disponibilidad'),
            codigo: valor('prod-codigo'),
            codSat: valor('prod-cod-sat'),
            noInventariable
        };
    }

    // Inicializa los eventos del modal tras inyectar el HTML
    function init() {
        modalContenedor = document.getElementById('modal-contenedor');
        form = document.getElementById('form-producto');
        btnCancelar = document.getElementById('btn-cancelar');
        btnGuardar = document.getElementById('btn-guardar');
        mensajeErrorModal = document.getElementById('mensaje-error-modal');
        tituloModal = document.getElementById('modal-titulo');
        chkNoInventariable = document.getElementById('chk-no-inventariable');
        inputDisponibilidad = document.getElementById('prod-disponibilidad');

        if (chkNoInventariable) chkNoInventariable.addEventListener('change', sincronizarNoInventariable);

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                mostrarError('');
                if (btnGuardar) btnGuardar.disabled = true; // evita doble envío

                try {
                    const cuerpo = JSON.stringify(leerFormulario());
                    if (productoEditando) {
                        await pedir(`${API}/${productoEditando}`, { method: 'PUT', body: cuerpo });
                    } else {
                        await pedir(API, { method: 'POST', body: cuerpo });
                    }
                    cerrar();
                    // Notifica a Inv.js que se guardaron cambios
                    document.dispatchEvent(new CustomEvent('producto-guardado'));
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
    // Si el producto no se puede cargar lanza el error y NO abre el modal,
    // para no terminar creando un producto nuevo por accidente.
    async function abrir(id = null) {
        limpiarFormulario();

        if (id) {
            const producto = await pedir(`${API}/${id}`);
            productoEditando = producto.ID_Producto;
            document.getElementById('prod-nombre').value = producto.Nombre ?? '';
            document.getElementById('prod-descripcion').value = producto.Descripcion ?? '';
            document.getElementById('prod-precio').value = producto.Precio ?? '';
            document.getElementById('prod-disponibilidad').value = producto.Disponibilidad ?? '';
            document.getElementById('prod-codigo').value = producto.Codigo_Prod ?? '';
            document.getElementById('prod-cod-sat').value = producto.Codigo_SAT ?? '';
            chkNoInventariable.checked = Boolean(producto.No_Invent);
            sincronizarNoInventariable();
            if (tituloModal) tituloModal.textContent = `Editar Producto #${producto.ID_Producto}`;
        } else if (tituloModal) {
            tituloModal.textContent = 'Nuevo Producto';
        }

        if (modalContenedor) modalContenedor.showModal();
    }

    // Cierra la ventana modal
    function cerrar() {
        if (modalContenedor) modalContenedor.close();
    }

    return { init, abrir, cerrar };
})();
