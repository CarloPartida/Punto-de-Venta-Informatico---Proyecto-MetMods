document.addEventListener('DOMContentLoaded', () => {
    // Rutas y constantes principales
    const API = '/api/servicios';
    const FILAS_INICIALES = 3;

    // Elementos del DOM
    const modalContenedor = document.getElementById('modal-contenedor');
    const modalCaja = document.getElementById('modal-caja');
    const contenedorPerfil = document.getElementById('contenedor-perfil');
    const listaServicios = document.getElementById('lista-servicios');
    const aviso = document.getElementById('aviso');

    const btnMenu = document.getElementById('btn-menu');
    const btnAgregar = document.getElementById('btn-agregar');

    // Variables de control del modal
    let form, chkVenta, panelVenta, tbodyVentas, costoTotal, btnGuardar,
        mensajeError, tituloModal, plantillaFila;

    let servicioEditando = null;
    const catalogo = new Map();

    // Convierte texto a número flotante
    const aNumero = (texto) => {
        const numero = parseFloat(String(texto).replace(/[^0-9.]/g, ''));
        return Number.isFinite(numero) ? numero : 0;
    };

    // Formatea un número a moneda
    const dinero = (numero) => `$${Number(numero).toFixed(2)}`;

    // Peticiones HTTP centralizadas
    async function pedir(url, opciones = {}) {
        const respuesta = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...opciones
        });
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.error || 'Error en la solicitud');
        return datos;
    }

    // Muestra avisos en pantalla
    const avisar = (texto) => { if (aviso) aviso.textContent = texto; };

    // Muestra errores en el modal
    function errorModal(texto) {
        if (mensajeError) {
            mensajeError.textContent = texto;
            mensajeError.hidden = !texto;
        }
    }

    // Crea el HTML de un servicio en la lista
    function crearFila(servicio) {
        const fila = document.createElement('tr');
        fila.className = 'Casilla';
        fila.dataset.id = servicio.ID_Servicio;

        fila.innerHTML = `
            <td>${servicio.ID_Servicio}</td>
            <td>${servicio.Nombre ?? ''}</td>
            <td>${servicio.Equipo ?? ''}</td>
            <td>${servicio.Fecha ?? ''}</td>
            <td>
                <button type="button" class="btn-editar" data-accion="editar" aria-label="Editar servicio">&#9998;</button>
            </td>
            <td>
                <button type="button" class="btn-finalizar" data-accion="finalizar">Finalizar</button>
            </td>
        `;

        return fila;
    }

    // Carga los servicios pendientes desde el servidor
    async function cargarServicios() {
        if (!listaServicios) return;
        try {
            const servicios = await pedir(API);
            listaServicios.replaceChildren(...servicios.map(crearFila));
            avisar(servicios.length ? '' : 'No hay servicios pendientes.');
        } catch (error) {
            avisar(`No se pudieron cargar los servicios: ${error.message}`);
        }
    }

    // Eventos de la lista de servicios
    if (listaServicios) {
        listaServicios.addEventListener('click', (e) => {
            const boton = e.target.closest('button[data-accion]');
            if (!boton) return;
            const id = boton.closest('[data-id]').dataset.id;

            if (boton.dataset.accion === 'editar') editarServicio(id);
            else if (boton.dataset.accion === 'finalizar') finalizarServicio(id);
        });
    }

    // Finaliza un servicio seleccionado
    async function finalizarServicio(id) {
        if (!confirm(`¿Deseas marcar el servicio #${id} como finalizado?`)) return;
        try {
            await pedir(`${API}/${id}/finalizar`, { method: 'PATCH' });
            await cargarServicios();
        } catch (error) {
            avisar(error.message);
        }
    }

    // Carga el catálogo de productos desde el inventario (/api/productos)
    async function cargarProductos() {
        try {
            const productos = await pedir('/api/productos');
            catalogo.clear();

            let datalist = document.getElementById('lista-productos');
            if (!datalist) {
                datalist = document.createElement('datalist');
                datalist.id = 'lista-productos';
                document.body.appendChild(datalist);
            }

            datalist.replaceChildren(
                ...productos.map((p) => {
                    catalogo.set(p.Nombre, Number(p.Precio));
                    const opcion = document.createElement('option');
                    opcion.value = p.Nombre;
                    opcion.textContent = `$${Number(p.Precio).toFixed(2)}`;
                    return opcion;
                })
            );

            // Asigna el datalist a todos los inputs de producto existentes
            document.querySelectorAll('.input-prod').forEach((input) => {
                input.setAttribute('list', 'lista-productos');
            });
        } catch (error) {
            console.error('No se pudo cargar el catálogo de productos:', error);
        }
    }

    // Obtiene los datos de las filas de venta
    function leerFilasVenta() {
        if (!tbodyVentas) return [];
        return [...tbodyVentas.querySelectorAll('tr')].map((tr) => ({
            producto: tr.querySelector('.input-prod')?.value.trim() || '',
            precio: aNumero(tr.querySelector('.input-precio')?.value || 0),
            piezas: parseInt(tr.querySelector('.cant-piezas')?.textContent, 10) || 0
        }));
    }

    // Recalcula el costo total
    function recalcularTotal() {
        if (!chkVenta || !chkVenta.checked || !costoTotal) return;
        const total = leerFilasVenta().reduce((suma, f) => suma + (f.precio * f.piezas), 0);
        costoTotal.value = dinero(total);
    }

    // Agrega una fila nueva a la tabla de ventas
    function agregarFilaVenta() {
        if (tbodyVentas && plantillaFila) {
            const nuevaFila = plantillaFila.cloneNode(true);
            const inputProd = nuevaFila.querySelector('.input-prod');
            if (inputProd) inputProd.setAttribute('list', 'lista-productos');
            tbodyVentas.append(nuevaFila);
        }
    }

    // Limpia y reinicia el formulario
    function limpiarFormulario() {
        servicioEditando = null;
        if (form) form.reset();
        if (tbodyVentas && plantillaFila) {
            tbodyVentas.replaceChildren(
                ...Array.from({ length: FILAS_INICIALES }, () => {
                    const fila = plantillaFila.cloneNode(true);
                    const inProd = fila.querySelector('.input-prod');
                    if (inProd) inProd.setAttribute('list', 'lista-productos');
                    return fila;
                })
            );
        }
        if (panelVenta) panelVenta.style.display = 'none';
        if (costoTotal) costoTotal.value = '';
        if (tituloModal) tituloModal.textContent = 'Nuevo servicio';
        errorModal('');
    }

    // Llena el formulario con datos existentes para editar
    function rellenarFormulario(servicio) {
        const poner = (id, valor) => {
            const el = document.getElementById(id);
            if (el) el.value = valor ?? '';
        };

        poner('equipo', servicio.Equipo);
        poner('descripcion', servicio.Descripcion);
        poner('observaciones', servicio.Observaciones);
        poner('cliente-nombre', servicio.cliente_nombre);
        poner('cliente-edad', servicio.cliente_edad);
        poner('cliente-telefono', servicio.cliente_telefono);

        if (chkVenta) {
            chkVenta.checked = Boolean(servicio.Venta_Activa);
            if (panelVenta) panelVenta.style.display = chkVenta.checked ? 'block' : 'none';
        }

        if (tbodyVentas && servicio.detalle) {
            while (tbodyVentas.rows.length < servicio.detalle.length) agregarFilaVenta();
            servicio.detalle.forEach((detalle, i) => {
                const fila = tbodyVentas.rows[i];
                if (fila) {
                    const inProd = fila.querySelector('.input-prod');
                    const inPrecio = fila.querySelector('.input-precio');
                    const spanCant = fila.querySelector('.cant-piezas');

                    if (inProd) {
                        inProd.value = detalle.producto;
                        inProd.setAttribute('list', 'lista-productos');
                    }
                    if (inPrecio) inPrecio.value = dinero(detalle.precio);
                    if (spanCant) spanCant.textContent = detalle.piezas;
                }
            });
        }

        if (costoTotal) costoTotal.value = dinero(servicio.Costo_Total);
        if (tituloModal) tituloModal.textContent = `Editar servicio #${servicio.ID_Servicio}`;
    }

    // Extrae los datos capturados del formulario
    function leerFormulario() {
        const valor = (id) => document.getElementById(id)?.value.trim() || '';
        return {
            equipo: valor('equipo'),
            descripcion: valor('descripcion'),
            observaciones: valor('observaciones'),
            cliente: {
                nombre: valor('cliente-nombre'),
                edad: valor('cliente-edad'),
                telefono: valor('cliente-telefono')
            },
            ventaActiva: chkVenta ? chkVenta.checked : false,
            costoTotal: costoTotal ? aNumero(costoTotal.value) : 0,
            productos: (chkVenta && chkVenta.checked)
                ? leerFilasVenta().filter((f) => f.producto && f.piezas > 0)
                : []
        };
    }

    // Envia los datos al servidor para guardar o editar
    async function guardarServicio(e) {
        e.preventDefault();
        errorModal('');
        if (btnGuardar) btnGuardar.disabled = true;

        try {
            const cuerpo = JSON.stringify(leerFormulario());
            if (servicioEditando) {
                await pedir(`${API}/${servicioEditando}`, { method: 'PUT', body: cuerpo });
            } else {
                await pedir(API, { method: 'POST', body: cuerpo });
            }
            cerrarModal();
            await cargarServicios();
        } catch (error) {
            errorModal(error.message);
        } finally {
            if (btnGuardar) btnGuardar.disabled = false;
        }
    }

    // Obtiene un servicio por su ID y abre el formulario
    async function editarServicio(id) {
        try {
            const servicio = await pedir(`${API}/${id}`);
            rellenarFormulario(servicio);
            servicioEditando = servicio.ID_Servicio;
            abrirModal();
        } catch (error) {
            avisar(error.message);
        }
    }

    // Carga la librería jsPDF dinámicamente
    async function cargarJsPDF() {
        if (window.jspdf) return window.jspdf;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => resolve(window.jspdf);
            script.onerror = () => reject(new Error('No se pudo cargar la librería jsPDF.'));
            document.head.appendChild(script);
        });
    }

    // Genera y descarga el archivo PDF de la factura
    async function generarFacturaPDF() {
        if (!servicioEditando) {
            errorModal('Guarda o selecciona un servicio registrado antes de generar la factura.');
            return;
        }

        try {
            errorModal('Generando factura PDF...');
            const jspdfModule = await cargarJsPDF();
            const { jsPDF } = jspdfModule;

            const servicio = await pedir(`${API}/${servicioEditando}`);
            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.text('FACTURA DE SERVICIO - PUNTO DE VENTA', 14, 20);

            doc.setFontSize(11);
            doc.text(`Folio Servicio: #${servicio.ID_Servicio}`, 14, 30);
            doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 14, 36);
            doc.text(`Cliente: ${servicio.cliente_nombre}`, 14, 42);
            doc.text(`Teléfono: ${servicio.cliente_telefono || 'N/A'}`, 14, 48);
            doc.text(`Equipo: ${servicio.Equipo}`, 14, 54);
            doc.text(`Descripción: ${servicio.Descripcion || 'Sin detalle'}`, 14, 60);

            doc.line(14, 66, 196, 66);

            doc.setFontSize(12);
            doc.text('Refacciones / Productos:', 14, 74);

            let posY = 82;
            if (servicio.detalle && servicio.detalle.length > 0) {
                servicio.detalle.forEach((d) => {
                    doc.text(`• ${d.producto} (x${d.piezas}) - $${Number(d.precio).toFixed(2)} c/u`, 20, posY);
                    posY += 7;
                });
            } else {
                doc.text('Sin productos de venta asociados.', 20, posY);
                posY += 7;
            }

            doc.line(14, posY + 5, 196, posY + 5);

            doc.setFontSize(14);
            doc.text(`COSTO TOTAL: $${Number(servicio.Costo_Total).toFixed(2)} MXN`, 14, posY + 16);

            doc.save(`Factura_Servicio_${servicio.ID_Servicio}.pdf`);
            errorModal('');
        } catch (err) {
            errorModal(`Error al generar factura: ${err.message}`);
        }
    }

    // Asigna los eventos de la interfaz y del modal
    function configurarEventosModales() {
        form = document.getElementById('form-servicio');
        chkVenta = document.getElementById('chk-venta');
        panelVenta = document.getElementById('panel-venta');
        tbodyVentas = document.getElementById('tabla-ventas-body');
        costoTotal = document.getElementById('costo-total');
        btnGuardar = document.getElementById('btn-guardar');
        mensajeError = document.getElementById('mensaje-error');

        const titulo = modalCaja ? modalCaja.querySelector('#panel-servicio h3, h3') : null;
        if (titulo) tituloModal = titulo;

        if (tbodyVentas && tbodyVentas.rows.length > 0) {
            plantillaFila = tbodyVentas.rows[0].cloneNode(true);
        }

        // Habilitar la edición manual en el campo de Costo Total
        if (costoTotal) {
            costoTotal.readOnly = false;
            costoTotal.removeAttribute('readonly');
            costoTotal.setAttribute('autocomplete', 'off');
        }

        if (chkVenta && panelVenta) {
            chkVenta.addEventListener('change', (e) => {
                panelVenta.style.display = e.target.checked ? 'block' : 'none';
                recalcularTotal();
            });
        }

        if (modalCaja) {
            // Incrementar / decrementar piezas (+ / -)
            modalCaja.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-mas, .btn-menos');
                if (!btn) return;

                const fila = btn.closest('tr');
                const spanCant = fila ? fila.querySelector('.cant-piezas') : null;
                if (spanCant) {
                    let cantidad = parseInt(spanCant.textContent, 10) || 0;
                    if (btn.classList.contains('btn-mas')) cantidad++;
                    else if (btn.classList.contains('btn-menos') && cantidad > 0) cantidad--;
                    spanCant.textContent = cantidad;
                    recalcularTotal();
                }
            });

            // Autocompletado de precio y recálculo automático
            modalCaja.addEventListener('input', (e) => {
                if (!e.target.matches('.input-prod, .input-precio, #costo-total')) return;

                if (e.target.matches('.input-prod')) {
                    const nombreProducto = e.target.value.trim();
                    if (catalogo.has(nombreProducto)) {
                        const fila = e.target.closest('tr');
                        const inPrecio = fila ? fila.querySelector('.input-precio') : null;
                        if (inPrecio) {
                            inPrecio.value = dinero(catalogo.get(nombreProducto));
                        }
                    }
                }

                // Evita sobrescribir la suma si el usuario está escribiendo manualmente en el total
                if (!e.target.matches('#costo-total')) {
                    recalcularTotal();
                }
            });
        }

        const btnAgregarFila = document.getElementById('btn-agregar-fila');
        if (btnAgregarFila) btnAgregarFila.addEventListener('click', agregarFilaVenta);

        const btnFactura = document.getElementById('btn-factura');
        if (btnFactura) btnFactura.addEventListener('click', generarFacturaPDF);

        if (form) form.addEventListener('submit', guardarServicio);

        if (modalContenedor) {
            modalContenedor.addEventListener('close', limpiarFormulario);
        }

        // Redirecciones
        const btnCartera = document.getElementById('btn-cartera');
        if (btnCartera) {
            btnCartera.addEventListener('click', () => {
                window.location.href = '../Car Clientes/CarC.html';
            });
        }

        const btnInventario = document.getElementById('btn-inventario');
        if (btnInventario) {
            btnInventario.addEventListener('click', () => {
                window.location.href = '../Inventario/Inv.html';
            });
        }

        limpiarFormulario();
    }

    // Configura la visibilidad del menú de perfil
    function configurarEventosPerfil() {
        if (!btnMenu) return;

        btnMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const panelPerfil = document.getElementById('panel-perfil');
            if (panelPerfil) {
                const oculto = panelPerfil.style.display === 'none' || panelPerfil.style.display === '';
                panelPerfil.style.display = oculto ? 'block' : 'none';
            }
        });

        document.addEventListener('click', () => {
            const panelPerfil = document.getElementById('panel-perfil');
            if (panelPerfil) panelPerfil.style.display = 'none';
        });
    }

    // Carga los módulos HTML requeridos
    async function precargarComponentes() {
        try {
            const [resServicios, resVentas, resPerfil] = await Promise.all([
                fetch('indexs/modalServicios.html'),
                fetch('indexs/modalVentas.html'),
                fetch('indexs/Perfil.html')
            ]);

            if (resServicios.ok && resVentas.ok && modalCaja) {
                const htmlServicios = await resServicios.text();
                const htmlVentas = await resVentas.text();
                modalCaja.innerHTML = htmlServicios + htmlVentas;
                configurarEventosModales();
            }

            if (resPerfil.ok && contenedorPerfil) {
                contenedorPerfil.innerHTML = await resPerfil.text();
                configurarEventosPerfil();
            }
        } catch (error) {
            console.error('Error al precargar componentes:', error);
        }
    }

    // Abre la ventana modal
    function abrirModal() {
        if (modalContenedor) {
            errorModal('');
            cargarProductos();
            modalContenedor.showModal();
        }
    }

    // Cierra la ventana modal
    function cerrarModal() {
        if (modalContenedor) modalContenedor.close();
    }

    if (btnAgregar) btnAgregar.addEventListener('click', abrirModal);

    // Cierra el modal si se da clic afuera
    if (modalContenedor) {
        modalContenedor.addEventListener('click', (e) => {
            const rect = modalContenedor.getBoundingClientRect();
            const clicDentro = (
                rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                rect.left <= e.clientX && e.clientX <= rect.left + rect.width
            );
            if (!clicDentro) cerrarModal();
        });
    }

    // Inicialización del script
    precargarComponentes();
    cargarServicios();
});