document.addEventListener('DOMContentLoaded', () => {
    // Rutas y constantes principales
    const API = '/api/clientes';
    const RUTA_LISTA = '../CarC.html';

    // Elementos del DOM
    const form = document.getElementById('form-cliente');
    const btnCancelar = document.getElementById('btn-cancelar');
    const btnGuardar = document.getElementById('btn-guardar');
    const mensajeError = document.getElementById('mensaje-error');
    const titulo = document.querySelector('header h2');

    // Si la URL trae ?id=5 estamos editando; si no, es un cliente nuevo
    const parametroId = new URLSearchParams(window.location.search).get('id');
    const id = parametroId === null ? null : Number.parseInt(parametroId, 10);

    // Envuelve fetch y lanza un error con el mensaje que manda el servidor
    async function pedir(url, opciones = {}) {
        const respuesta = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...opciones
        });
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.error || 'Error en la solicitud');
        return datos;
    }

    function mostrarError(texto) {
        mensajeError.textContent = texto;
        mensajeError.hidden = !texto;
    }

    // Deja activo solo "Cancelar" (por ejemplo si el cliente no existe)
    function bloquearFormulario() {
        [...form.elements].forEach((elemento) => {
            if (elemento !== btnCancelar) elemento.disabled = true;
        });
    }

    // Rellena el formulario con los datos del cliente a editar
    async function cargarCliente() {
        try {
            const cliente = await pedir(`${API}/${id}`);
            form.elements['nombre'].value = cliente.Nombre ?? '';
            form.elements['edad'].value = cliente.Edad ?? '';
            form.elements['telefono'].value = cliente.Telefono ?? '';
            form.elements['localidad'].value = cliente.Localidad ?? '';
            titulo.textContent = `Editar Cliente #${cliente.ID_Cliente}`;
        } catch (error) {
            mostrarError(error.message);
            bloquearFormulario();
        }
    }

    // Guarda: POST si es nuevo, PUT si se está editando
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        mostrarError('');
        btnGuardar.disabled = true; // evita doble envío

        const cuerpo = JSON.stringify({
            nombre: form.elements['nombre'].value.trim(),
            edad: form.elements['edad'].value.trim(),
            telefono: form.elements['telefono'].value.trim(),
            localidad: form.elements['localidad'].value.trim()
        });

        try {
            if (id) await pedir(`${API}/${id}`, { method: 'PUT', body: cuerpo });
            else await pedir(API, { method: 'POST', body: cuerpo });
            window.location.href = RUTA_LISTA;
        } catch (error) {
            mostrarError(error.message);
            btnGuardar.disabled = false;
        }
    });

    btnCancelar.addEventListener('click', () => {
        window.location.href = RUTA_LISTA;
    });

    // Arranque: nuevo o edición
    if (parametroId === null) {
        titulo.textContent = 'Nuevo Cliente';
    } else if (!Number.isInteger(id) || id <= 0) {
        mostrarError('El cliente que intentas editar no es válido');
        bloquearFormulario();
    } else {
        cargarCliente();
    }
});
