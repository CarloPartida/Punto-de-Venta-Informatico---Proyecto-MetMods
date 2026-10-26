document.addEventListener('DOMContentLoaded', () => {
    // Rutas y constantes principales
    const API = '/api/productos';

    // Elementos del DOM
    const modalCaja = document.getElementById('modal-caja');
    const listaProductos = document.getElementById('lista-productos');
    const btnAgregar = document.getElementById('btn-agregar');
    const aviso = document.getElementById('aviso');

    // Muestra un mensaje de estado debajo de la tabla
    const avisar = (texto) => { if (aviso) aviso.textContent = texto; };

    const dinero = (numero) => `$${Number(numero).toFixed(2)}`;

    // Realiza peticiones HTTP centralizadas
    async function pedir(url, opciones = {}) {
        const respuesta = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...opciones
        });
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
        boton.setAttribute('aria-label', etiqueta);
        return boton;
    }

    // Celda de disponibilidad: [-] [+], o una etiqueta si no se inventaría
    function crearCeldaDisponibilidad(producto) {
        const celda = document.createElement('td');
        celda.className = 'celda-disponibilidad';

        if (producto.No_Invent) {
            const etiqueta = document.createElement('span');
            etiqueta.className = 'etiqueta-no-inv';
            etiqueta.textContent = 'No inventariable';
            celda.append(etiqueta);
            return celda;
        }

        const cantidad = document.createElement('span');
        cantidad.className = 'cant-disp';
        cantidad.textContent = producto.Disponibilidad;

        celda.append(
            crearBoton('\u2212', 'btn-cant', 'menos', 'Quitar una pieza'),
            cantidad,
            crearBoton('+', 'btn-cant', 'mas', 'Agregar una pieza')
        );
        return celda;
    }

    // Construye una fila con textContent (no innerHTML) para que ningún dato guardado inyecte HTML
    function crearFila(producto) {
        const fila = document.createElement('tr');
        fila.className = 'Casilla';
        fila.dataset.id = producto.ID_Producto;
        fila.tabIndex = -1; // se puede enfocar con las flechas

        const acciones = document.createElement('td');
        acciones.className = 'col-acciones';
        acciones.append(
            crearBoton('\u270E', 'btn-editar', 'editar', 'Editar producto'),
            crearBoton('\u{1F5D1}', 'btn-eliminar', 'eliminar', 'Eliminar producto')
        );

        fila.append(
            crearCelda(producto.Nombre),
            crearCelda(producto.Descripcion),
            crearCelda(dinero(producto.Precio)),
            crearCeldaDisponibilidad(producto),
            crearCelda(producto.Codigo_Prod),
            crearCelda(producto.Codigo_SAT),
            acciones
        );
        return fila;
    }

    // Carga el inventario completo desde el servidor
    async function cargarProductos() {
        try {
            const productos = await pedir(API);
            listaProductos.replaceChildren(...productos.map(crearFila));

            // Solo la primera fila entra en el orden del Tab; las flechas mueven entre filas
            if (listaProductos.firstElementChild) listaProductos.firstElementChild.tabIndex = 0;

            avisar(productos.length ? '' : 'No hay productos registrados.');
        } catch (error) {
            avisar(`No se pudo cargar el inventario: ${error.message}`);
        }
    }

    // Suma o resta una pieza y actualiza solo esa celda
    async function ajustarDisponibilidad(boton, cambio) {
        const fila = boton.closest('tr');
        const botones = fila.querySelectorAll('.btn-cant');
        botones.forEach((b) => { b.disabled = true; }); // evita clics repetidos mientras responde

        try {
            const { disponibilidad } = await pedir(
                `${API}/${fila.dataset.id}/disponibilidad`,
                { method: 'PATCH', body: JSON.stringify({ cambio }) }
            );
            fila.querySelector('.cant-disp').textContent = disponibilidad;
            avisar('');
        } catch (error) {
            avisar(error.message);
        } finally {
            botones.forEach((b) => { b.disabled = false; });
            boton.focus(); // al deshabilitarse el botón se pierde el foco; así el teclado sigue
        }
    }

    // Elimina un producto previa confirmación
    async function eliminarProducto(fila) {
        const nombre = fila.children[0].textContent;
        if (!confirm(`¿Deseas eliminar el producto "${nombre}"?`)) return;

        try {
            await pedir(`${API}/${fila.dataset.id}`, { method: 'DELETE' });
            await cargarProductos();
        } catch (error) {
            avisar(error.message);
        }
    }

    // Abre el modal para editar; si el producto no carga, avisa y no abre nada
    function editarProducto(id) {
        window.NuEdInv.abrir(id).catch((error) => avisar(error.message));
    }

    // Carga la plantilla local HTML del modal e inicializa sus eventos
    async function precargarModal() {
        try {
            const res = await fetch('indexs/NuEdInv.html');
            if (res.ok && modalCaja) {
                modalCaja.innerHTML = await res.text();
                window.NuEdInv.init();
            }
        } catch (error) {
            console.error('Error al cargar la plantilla del modal:', error);
        }
    }

    // Un solo listener para todas las filas (se crean y borran dinámicamente)
    if (listaProductos) {
        listaProductos.addEventListener('click', (e) => {
            const boton = e.target.closest('button[data-accion]');
            if (!boton) return;
            const fila = boton.closest('tr');

            switch (boton.dataset.accion) {
                case 'editar': editarProducto(fila.dataset.id); break;
                case 'eliminar': eliminarProducto(fila); break;
                case 'mas': ajustarDisponibilidad(boton, 1); break;
                case 'menos': ajustarDisponibilidad(boton, -1); break;
            }
        });

        // Navegación con teclado entre registros
        listaProductos.addEventListener('keydown', (e) => {
            const fila = e.target.closest('tr');
            if (!fila) return;

            let destino = null;
            if (e.key === 'ArrowDown') destino = fila.nextElementSibling;
            else if (e.key === 'ArrowUp') destino = fila.previousElementSibling;
            else if (e.key === 'Home') destino = listaProductos.firstElementChild;
            else if (e.key === 'End') destino = listaProductos.lastElementChild;
            else if (e.key === 'Enter' && e.target === fila) {
                editarProducto(fila.dataset.id);
                return;
            }

            if (!destino) return;
            e.preventDefault();
            fila.tabIndex = -1;
            destino.tabIndex = 0;
            destino.focus();
        });
    }

    // Botón Agregar (+)
    if (btnAgregar) {
        btnAgregar.addEventListener('click', () => {
            window.NuEdInv.abrir().catch((error) => avisar(error.message));
        });
    }

    document.addEventListener('producto-guardado', cargarProductos);

    precargarModal();
    cargarProductos();
});
