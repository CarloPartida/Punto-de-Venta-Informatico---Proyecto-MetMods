document.addEventListener('DOMContentLoaded', () => {
    const API = '/api/clientes';

    const modalCaja = document.getElementById('modal-caja');
    const listaClientes = document.getElementById('lista-clientes');
    const aviso = document.getElementById('aviso');
    const btnAgregar = document.getElementById('btn-agregar');

    async function pedir(url, opciones = {}) {
        const respuesta = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...opciones
        });
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.error || 'Error en la solicitud');
        return datos;
    }

    const avisar = (texto) => { if (aviso) aviso.textContent = texto; };

    function crearFila(cliente) {
        const fila = document.createElement('tr');
        fila.className = 'Casilla';
        fila.dataset.id = cliente.ID_Cliente;
        fila.tabIndex = -1;

        fila.innerHTML = `
            <td>${cliente.ID_Cliente}</td>
            <td>${cliente.Nombre ?? ''}</td>
            <td>${cliente.Telefono ?? ''}</td>
            <td>${cliente.Localidad ?? ''}</td>
            <td class="col-acciones">
                <button type="button" class="btn-editar" data-accion="editar" aria-label="Editar cliente">&#9998;</button>
                <button type="button" class="btn-eliminar" data-accion="eliminar" aria-label="Eliminar cliente">&#128465;</button>
            </td>
        `;
        return fila;
    }

    async function cargarClientes() {
        if (!listaClientes) return;
        try {
            const clientes = await pedir(API);
            listaClientes.replaceChildren(...clientes.map(crearFila));
            if (listaClientes.firstElementChild) listaClientes.firstElementChild.tabIndex = 0;
            avisar(clientes.length ? '' : 'No hay clientes registrados.');
        } catch (error) {
            avisar(`No se pudo cargar la cartera: ${error.message}`);
        }
    }

    async function eliminarCliente(id) {
        if (!confirm(`¿Deseas eliminar al cliente #${id}?`)) return;
        try {
            await pedir(`${API}/${id}`, { method: 'DELETE' });
            await cargarClientes();
        } catch (error) {
            avisar(error.message);
        }
    }

    async function precargarModal() {
        try {
            const res = await fetch('index/NuEd.html');
            if (res.ok && modalCaja) {
                modalCaja.innerHTML = await res.text();
                window.NuEd.init();
            }
        } catch (error) {
            console.error('Error al cargar la plantilla del modal:', error);
        }
    }

    if (listaClientes) {
        listaClientes.addEventListener('click', (e) => {
            const boton = e.target.closest('button[data-accion]');
            if (!boton) return;
            const id = boton.closest('[data-id]').dataset.id;

            if (boton.dataset.accion === 'editar') window.NuEd.abrir(id);
            else if (boton.dataset.accion === 'eliminar') eliminarCliente(id);
        });

        listaClientes.addEventListener('keydown', (e) => {
            const fila = e.target.closest('tr');
            if (!fila) return;

            let destino = null;
            if (e.key === 'ArrowDown') destino = fila.nextElementSibling;
            else if (e.key === 'ArrowUp') destino = fila.previousElementSibling;
            else if (e.key === 'Home') destino = listaClientes.firstElementChild;
            else if (e.key === 'End') destino = listaClientes.lastElementChild;
            else if (e.key === 'Enter' && e.target === fila) {
                window.NuEd.abrir(fila.dataset.id);
                return;
            }

            if (!destino) return;
            e.preventDefault();
            fila.tabIndex = -1;
            destino.tabIndex = 0;
            destino.focus();
        });
    }

    if (btnAgregar) btnAgregar.addEventListener('click', () => window.NuEd.abrir());

    document.addEventListener('cliente-guardado', cargarClientes);

    precargarModal();
    cargarClientes();
});