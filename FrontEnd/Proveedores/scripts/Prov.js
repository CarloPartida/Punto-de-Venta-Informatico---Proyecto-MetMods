document.addEventListener('DOMContentLoaded', () => {
    // Rutas y constantes principales
    const API = '/api/proveedores';

    // Elementos del DOM
    const modalCaja = document.getElementById('modal-caja');
    const listaProveedores = document.getElementById('lista-proveedores');
    const btnAgregar = document.getElementById('btn-agregar');
    const aviso = document.getElementById('aviso');

    // Muestra un mensaje de estado debajo de la tabla
    const avisar = (texto) => { if (aviso) aviso.textContent = texto; };

    // Realiza peticiones HTTP centralizadas
    async function pedir(url, opciones = {}) {
        const respuesta = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...opciones
        });

        // Si la sesión no está activa (401), redirige al Login
        if (respuesta.status === 401) {
            window.location.href = '../Login/Login.html';
            return null;
        }

        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.error || 'Error en la solicitud');
        return datos;
    }

    function crearCelda(texto) {
        const celda = document.createElement('td');
        celda.textContent = texto ?? '';
        return celda;
    }

    function crearBoton(texto, clase, accion, etiqueta) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = clase;
        boton.textContent = texto;
        boton.dataset.accion = accion;
        boton.title = etiqueta;
        boton.setAttribute('aria-label', etiqueta);
        return boton;
    }

// Construye una fila con textContent para evitar inyecciones HTML
    function crearFila(proveedor) {
        const fila = document.createElement('tr');
        fila.dataset.id = proveedor.ID_Proveedor;

        const acciones = document.createElement('td');
        acciones.className = 'col-acciones text-nowrap';
        const grupoAcciones = document.createElement('div');
        grupoAcciones.className = 'btn-list flex-nowrap';
        grupoAcciones.append(
            crearBoton('\u270F\uFE0F', 'btn btn-sm btn-icon btn-outline-warning btn-editar', 'editar', 'Editar'),
            crearBoton('\u{1F5D1}\uFE0F', 'btn btn-sm btn-icon btn-outline-danger btn-eliminar', 'eliminar', 'Eliminar')
        );
        acciones.append(grupoAcciones);

        fila.append(
            crearCelda(proveedor.Nombre_Prov),
            crearCelda(proveedor.Telefono),
            crearCelda(proveedor.Localidad),
            crearCelda(proveedor.Num_Cliente),
            acciones
        );
        return fila;
    }

    // Carga la lista completa desde el servidor
    async function cargarProveedores() {
        try {
            const proveedores = await pedir(API);
            if (!proveedores) return; // Si fue redirigido por 401
            listaProveedores.replaceChildren(...proveedores.map(crearFila));
            avisar(proveedores.length ? '' : 'No hay proveedores registrados.');
        } catch (error) {
            avisar(`No se pudo cargar la lista de proveedores: ${error.message}`);
        }
    }

    // Elimina un proveedor previa confirmación (RQNF 30)
    async function eliminarProveedor(fila) {
        const nombre = fila.children[0].textContent;
        if (!confirm(`¿Deseas eliminar definitivamente al proveedor "${nombre}"?`)) return;

        try {
            await pedir(`${API}/${fila.dataset.id}`, { method: 'DELETE' });
            await cargarProveedores();
        } catch (error) {
            avisar(error.message);
        }
    }

    // Abre el modal para editar
    function editarProveedor(id) {
        window.NuEdProv.abrir(id).catch((error) => avisar(error.message));
    }

    // Carga la plantilla HTML del modal e inicializa sus eventos
    async function precargarModal() {
        try {
            const res = await fetch('index/NuEdProv.html');
            if (res.ok && modalCaja) {
                modalCaja.innerHTML = await res.text();
                window.NuEdProv.init();
            }
        } catch (error) {
            console.error('Error al cargar la plantilla del modal:', error);
        }
    }

    // Eventos para la lista
    if (listaProveedores) {
        listaProveedores.addEventListener('click', (e) => {
            const boton = e.target.closest('button[data-accion]');
            if (!boton) return;
            const fila = boton.closest('tr');

            if (boton.dataset.accion === 'editar') editarProveedor(fila.dataset.id);
            else if (boton.dataset.accion === 'eliminar') eliminarProveedor(fila);
        });
    }

    // Botón Agregar (+)
    if (btnAgregar) {
        btnAgregar.addEventListener('click', () => {
            window.NuEdProv.abrir().catch((error) => avisar(error.message));
        });
    }

    document.addEventListener('proveedor-guardado', cargarProveedores);

    precargarModal();
    cargarProveedores();
});