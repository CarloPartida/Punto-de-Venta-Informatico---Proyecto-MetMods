window.NuEdSp = (() => {
    const API = '/api/soporte';

    // Máximos de caracteres de cada campo de texto (RQNF 25)
    const LIMITES = [
        ['nombre', 'nombre', 100],
        ['telefono', 'teléfono', 20],
        ['localidad', 'localidad', 100]
    ];

    let form, btnDeshacer, btnConfirmar, mensajeErrorModal, tituloModal, modalContenedor;
    let tecnicoEditando = null;

    // Realiza peticiones HTTP centralizadas para el modal
    async function pedir(url, opciones = {}) {
        const respuesta = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...opciones
        });
        // Sin sesión activa el servidor responde 401: se regresa al login
        if (respuesta.status === 401) {
            window.location.href = '/';
            throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
        }
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
    // así lo que no se guardó se descarta
    function limpiarFormulario() {
        tecnicoEditando = null;
        if (form) form.reset();
        if (tituloModal) tituloModal.textContent = 'Nuevo / Editar Soporte';
        mostrarError('');
    }

    // Extrae los valores ingresados en los inputs
    function leerFormulario() {
        const valor = (id) => document.getElementById(id)?.value.trim() || '';
        return {
            nombre: valor('soporte-nombre'),
            edad: valor('soporte-edad'),
            telefono: valor('soporte-telefono'),
            localidad: valor('soporte-localidad')
        };
    }

    // RQNF 25: avisa qué campo excede su máximo antes de enviar
    function validarLongitudes(datos) {
        for (const [campo, etiqueta, maximo] of LIMITES) {
            if (datos[campo].length > maximo) {
                return `El campo ${etiqueta} no puede tener más de ${maximo} caracteres`;
            }
        }
        return '';
    }

    // Inicializa los eventos del modal tras inyectar el HTML
    function init() {
        modalContenedor = document.getElementById('modal-contenedor');
        form = document.getElementById('form-soporte');
        btnDeshacer = document.getElementById('btn-deshacer');
        btnConfirmar = document.getElementById('btn-confirmar');
        mensajeErrorModal = document.getElementById('mensaje-error-modal');
        tituloModal = document.getElementById('modal-titulo');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                mostrarError('');

                const datos = leerFormulario();
                const errorLongitud = validarLongitudes(datos);
                if (errorLongitud) {
                    mostrarError(errorLongitud);
                    return;
                }

                if (btnConfirmar) btnConfirmar.disabled = true; // evita doble envío
                try {
                    const cuerpo = JSON.stringify(datos);
                    if (tecnicoEditando) {
                        await pedir(`${API}/${tecnicoEditando}`, { method: 'PUT', body: cuerpo });
                    } else {
                        await pedir(API, { method: 'POST', body: cuerpo });
                    }
                    cerrar();
                    // Notifica a Sp.js que se guardaron cambios (RQNF 24: la lista se actualiza al instante)
                    document.dispatchEvent(new CustomEvent('soporte-guardado'));
                } catch (error) {
                    mostrarError(error.message);
                } finally {
                    if (btnConfirmar) btnConfirmar.disabled = false;
                }
            });
        }

        // Deshacer: sale del modal descartando lo que no se guardó
        if (btnDeshacer) btnDeshacer.addEventListener('click', cerrar);

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
    // Si el técnico no se puede cargar lanza el error y NO abre el modal,
    // para no terminar creando un registro nuevo por accidente.
    async function abrir(id = null) {
        limpiarFormulario();

        if (id) {
            const tecnico = await pedir(`${API}/${id}`);
            tecnicoEditando = tecnico.ID_Soporte;
            document.getElementById('soporte-nombre').value = tecnico.Nombre ?? '';
            document.getElementById('soporte-edad').value = tecnico.Edad ?? '';
            document.getElementById('soporte-telefono').value = tecnico.Telefono ?? '';
            document.getElementById('soporte-localidad').value = tecnico.Localidad ?? '';
            if (tituloModal) tituloModal.textContent = `Editar Soporte #${tecnico.ID_Soporte}`;
        } else if (tituloModal) {
            tituloModal.textContent = 'Nuevo Soporte';
        }

        if (modalContenedor) modalContenedor.showModal();
    }

    // Cierra la ventana modal
    function cerrar() {
        if (modalContenedor) modalContenedor.close();
    }

    return { init, abrir, cerrar };
})();
