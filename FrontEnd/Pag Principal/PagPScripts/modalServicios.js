const ModalServicios = (() => {
    let servicioEditando = null;
    let callbackGuardado = null;

    // Despliega notificaciones de error en el contenedor modal
    function errorModal(texto) {
        const mensajeError = document.getElementById('mensaje-error');
        if (mensajeError) {
            mensajeError.textContent = texto;
            mensajeError.hidden = !texto;
        }
    }

    // Configura la captura de eventos del formulario y la ventana modal
    function inicializar({ onGuardado }) {
        callbackGuardado = onGuardado;
        const form = document.getElementById('form-servicio');
        const modalContenedor = document.getElementById('modal-contenedor');

        if (form) form.addEventListener('submit', guardarServicio);
        if (modalContenedor) {
            modalContenedor.addEventListener('close', limpiar);
            modalContenedor.addEventListener('click', (e) => {
                const rect = modalContenedor.getBoundingClientRect();
                const clicDentro = (
                    rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                    rect.left <= e.clientX && e.clientX <= rect.left + rect.width
                );
                if (!clicDentro) cerrar();
            });
        }

        // Ejecuta la generación del comprobante en PDF
        document.getElementById('btn-factura')?.addEventListener('click', () => {
            FacturaPDF.generar(servicioEditando, errorModal);
        });
    }

    // Muestra la ventana modal de servicios
    function abrir() {
        const modalContenedor = document.getElementById('modal-contenedor');
        if (modalContenedor) {
            errorModal('');
            modalContenedor.showModal();
        }
    }

    // Oculta la ventana modal
    function cerrar() {
        const modalContenedor = document.getElementById('modal-contenedor');
        if (modalContenedor) modalContenedor.close();
    }

    // Restablece los campos del formulario de servicios
    function limpiar() {
        servicioEditando = null;
        const form = document.getElementById('form-servicio');
        if (form) form.reset();

        const tituloModal = document.querySelector('#modal-caja h3, #panel-servicio h3');
        if (tituloModal) tituloModal.textContent = 'Nuevo servicio';

        errorModal('');
        ModalVentas.limpiar();
    }

    // Consolida la entrada de datos capturada en la vista del servicio
    function leerFormulario() {
        const val = id => document.getElementById(id)?.value.trim() || '';
        return {
            equipo: val('equipo'),
            descripcion: val('descripcion'),
            observaciones: val('observaciones'),
            cliente: {
                nombre: val('cliente-nombre'),
                edad: val('cliente-edad'),
                telefono: val('cliente-telefono')
            },
            ...ModalVentas.obtenerDatosVenta()
        };
    }

    // Envía la solicitud de creación o modificación de un servicio a la API
    async function guardarServicio(e) {
        e.preventDefault();
        errorModal('');
        const btnGuardar = document.getElementById('btn-guardar');
        if (btnGuardar) btnGuardar.disabled = true;

        try {
            const cuerpo = JSON.stringify(leerFormulario());
            const url = servicioEditando ? `/api/servicios/${servicioEditando}` : '/api/servicios';
            const method = servicioEditando ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: cuerpo
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Error al guardar servicio');

            cerrar();
            if (callbackGuardado) await callbackGuardado();
        } catch (err) {
            errorModal(err.message);
        } finally {
            if (btnGuardar) btnGuardar.disabled = false;
        }
    }

    // Carga los datos de un servicio específico para su actualización
    async function editar(id) {
        try {
            const res = await fetch(`/api/servicios/${id}`);
            if (!res.ok) throw new Error('No se pudo obtener el servicio');
            const servicio = await res.json();

            const poner = (id, valor) => {
                const el = document.getElementById(id);
                if (el) el.value = valor ?? '';
            };

            poner('equipo', servicio.equipo ?? servicio.Equipo);
            poner('descripcion', servicio.descripcion ?? servicio.Descripcion);
            poner('observaciones', servicio.observaciones ?? servicio.Observaciones);

            const nombreCli = servicio.cliente?.nombre ?? servicio.cliente_nombre ?? servicio.Cliente_Nombre;
            const edadCli = servicio.cliente?.edad ?? servicio.cliente_edad ?? servicio.Cliente_Edad;
            const telCli = servicio.cliente?.telefono ?? servicio.cliente_telefono ?? servicio.Cliente_Telefono;

            poner('cliente-nombre', nombreCli);
            poner('cliente-edad', edadCli);
            poner('cliente-telefono', telCli);

            ModalVentas.limpiar();
            ModalVentas.rellenar(servicio);

            const idServicio = servicio.id ?? servicio.ID_Servicio ?? id;
            const tituloModal = document.querySelector('#modal-caja h3, #panel-servicio h3');
            if (tituloModal) tituloModal.textContent = `Editar servicio #${idServicio}`;

            servicioEditando = idServicio;
            abrir();
        } catch (err) {
            alert(err.message);
        }
    }

    return { inicializar, abrir, cerrar, editar, limpiar };
})();