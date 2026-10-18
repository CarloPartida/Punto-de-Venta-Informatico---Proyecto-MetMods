document.addEventListener('DOMContentLoaded', () => {
    // Rutas y constantes principales
    const API = '/api/clientes';
    const RUTA_NUED = 'index/NuEd.html';

    // Elementos del DOM
    const listaClientes = document.getElementById('lista-clientes');
    const aviso = document.getElementById('aviso');
    const btnAgregar = document.getElementById('btn-agregar');

    // Muestra un mensaje de estado debajo de la tabla
    const avisar = (texto) => { aviso.textContent = texto; };

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

    function crearBoton(texto, clase, etiqueta) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = clase;
        boton.textContent = texto;
        boton.setAttribute('aria-label', etiqueta);
        return boton;
    }

    // Construye una fila con textContent (no innerHTML) para que ningún dato guardado inyecte HTML
    function crearFila(cliente) {
        const fila = document.createElement('tr');
        fila.dataset.id = cliente.ID_Cliente;
        fila.tabIndex = -1; // se puede enfocar con las flechas (RQNF 12)

        // [columnas que ocupa, valor] igual que en el encabezado de la tabla
        const columnas = [
            [1, cliente.ID_Cliente],
            [4, cliente.Nombre],
            [2, cliente.Telefono],
            [3, cliente.Localidad]
        ];
        columnas.forEach(([span, valor]) => {
            const celda = document.createElement('td');
            celda.colSpan = span;
            celda.textContent = valor ?? '';
            fila.append(celda);
        });

        const acciones = document.createElement('td');
        acciones.colSpan = 1;
        acciones.append(
            crearBoton('\u270E', 'btn-editar', 'Editar cliente'),
            crearBoton('\u{1F5D1}', 'btn-eliminar', 'Eliminar cliente')
        );
        fila.append(acciones);
        return fila;
    }

    // Carga la cartera completa desde el servidor
    async function cargarClientes() {
        try {
            const clientes = await pedir(API);
            listaClientes.replaceChildren(...clientes.map(crearFila));

            // Solo la primera fila entra en el orden del Tab; las flechas mueven entre filas
            if (listaClientes.firstElementChild) listaClientes.firstElementChild.tabIndex = 0;

            avisar(clientes.length ? '' : 'No hay clientes registrados.');
        } catch (error) {
            avisar(`No se pudo cargar la cartera: ${error.message}`);
        }
    }

    // Abre la pantalla de captura (nuevo o editar)
    function abrirFormulario(id) {
        window.location.href = id ? `${RUTA_NUED}?id=${id}` : RUTA_NUED;
    }

    // Elimina un cliente previa confirmación (RQNF 16)
    async function eliminarCliente(fila) {
        const id = fila.dataset.id;
        const nombre = fila.children[1].textContent;

        if (!confirm(`¿Deseas eliminar definitivamente al cliente "${nombre}"?`)) return;

        try {
            await pedir(`${API}/${id}`, { method: 'DELETE' });
            await cargarClientes();
        } catch (error) {
            avisar(error.message);
        }
    }

    if (btnAgregar) btnAgregar.addEventListener('click', () => abrirFormulario());

    // Un solo listener para todas las filas (se crean y borran dinámicamente)
    listaClientes.addEventListener('click', (e) => {
        const boton = e.target.closest('button');
        if (!boton) return;
        const fila = boton.closest('tr');

        if (boton.classList.contains('btn-editar')) abrirFormulario(fila.dataset.id);
        else if (boton.classList.contains('btn-eliminar')) eliminarCliente(fila);
    });

    // Navegación con teclado entre registros (RQNF 12)
    listaClientes.addEventListener('keydown', (e) => {
        const fila = e.target.closest('tr');
        if (!fila) return;

        let destino = null;
        if (e.key === 'ArrowDown') destino = fila.nextElementSibling;
        else if (e.key === 'ArrowUp') destino = fila.previousElementSibling;
        else if (e.key === 'Home') destino = listaClientes.firstElementChild;
        else if (e.key === 'End') destino = listaClientes.lastElementChild;
        else if (e.key === 'Enter' && e.target === fila) {
            abrirFormulario(fila.dataset.id);
            return;
        }

        if (!destino) return;
        e.preventDefault();
        fila.tabIndex = -1;
        destino.tabIndex = 0;
        destino.focus();
    });

    cargarClientes();
});
