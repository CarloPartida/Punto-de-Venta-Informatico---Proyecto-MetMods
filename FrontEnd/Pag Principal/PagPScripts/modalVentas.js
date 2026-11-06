const ModalVentas = (() => {
    // Almacenamiento local de los catálogos requeridos
    let catalogo = new Map(), clientes = [];

    // Funciones auxiliares de formato y conversión numérico-monetaria
    const fmt = n => `$${Number(n || 0).toFixed(2)}`;
    const num = s => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;

    // Obtiene catálogos de consulta inicial desde la API REST
    async function inicializar() {
        try {
            const [prods, clis] = await Promise.all([
                fetch('/api/servicios/productos').then(r => r.json()),
                fetch('/api/servicios/clientes').then(r => r.json())
            ]);
            catalogo = new Map(prods.map(p => [p.Nombre, Number(p.Precio)]));
            clientes = clis;

            poblarDatalist('lista-productos', prods.map(p => `<option value="${p.Nombre}">${fmt(p.Precio)}</option>`));
            poblarDatalist('lista-clientes', clis.map(c => `<option value="${c.Nombre}">`));
        } catch (e) {
            console.error('Error cargando catálogos de ventas:', e);
        }

        configurarEventos();
    }

    // Genera nodos datalist dinámicos para apoyo al autocompletado
    function poblarDatalist(id, opcionesHtml) {
        let dl = document.getElementById(id) || document.createElement('datalist');
        dl.id = id;
        dl.innerHTML = opcionesHtml.join('');
        if (!dl.parentNode) document.body.appendChild(dl);
    }

    // Registra los controladores de eventos para la gestión comercial
    function configurarEventos() {
        const modal = document.getElementById('modal-caja');
        if (!modal) return;

        // Autocompleta los datos del cliente seleccionado al escribir
        document.getElementById('cliente-nombre')?.addEventListener('input', (e) => {
            const c = clientes.find(x => x.Nombre.toLowerCase() === e.target.value.trim().toLowerCase());
            const ed = document.getElementById('cliente-edad');
            const tel = document.getElementById('cliente-telefono');
            if (ed) ed.value = c?.Edad ?? '';
            if (tel) tel.value = c?.Telefono ?? '';
        });

        // Modifica la cantidad de piezas mediante delegación de clics
        modal.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-mas, .btn-menos');
            if (!btn) return;
            const span = btn.closest('tr')?.querySelector('.cant-piezas');
            if (span) {
                let cant = parseInt(span.textContent, 10) || 0;
                span.textContent = btn.classList.contains('btn-mas') ? cant + 1 : Math.max(0, cant - 1);
                recalcularTotal();
            }
        });

        // Vincula el precio unitario al seleccionar un producto del catálogo
        modal.addEventListener('input', (e) => {
            if (e.target.matches('.input-prod')) {
                const precio = catalogo.get(e.target.value.trim());
                if (precio !== undefined) {
                    const inPrecio = e.target.closest('tr')?.querySelector('.input-precio');
                    if (inPrecio) inPrecio.value = fmt(precio);
                }
            }
            if (!e.target.matches('#costo-total')) recalcularTotal();
        });
    }

    // Recalcula el importe total según las piezas y precios vigentes
    function recalcularTotal() {
        const chk = document.getElementById('chk-venta');
        const totalIn = document.getElementById('costo-total');
        if (!chk?.checked || !totalIn) return;

        const total = obtenerFilas().reduce((acc, r) => acc + (r.precio * r.piezas), 0);
        totalIn.value = fmt(total);
    }

    // Extrae y mapea la información de la tabla de productos seleccionados
    function obtenerFilas() {
        const tbody = document.getElementById('tabla-ventas-body');
        if (!tbody) return [];
        return [...tbody.querySelectorAll('tr')].map(tr => ({
            producto: tr.querySelector('.input-prod')?.value.trim() || '',
            precio: num(tr.querySelector('.input-precio')?.value),
            piezas: parseInt(tr.querySelector('.cant-piezas')?.textContent, 10) || 0
        }));
    }

    // Restablece el panel de ventas a su estado inicial
    function limpiar() {
        const chk = document.getElementById('chk-venta');
        const panel = document.getElementById('panel-venta');
        const total = document.getElementById('costo-total');
        if (chk) chk.checked = false;
        if (panel) panel.style.display = 'none';
        if (total) total.value = '';
    }

    // Sincroniza la vista de ventas con los datos de un registro en edición
    function rellenar(servicio) {
        const chk = document.getElementById('chk-venta');
        const panel = document.getElementById('panel-venta');
        if (chk) {
            chk.checked = Boolean(servicio.Venta_Activa);
            if (panel) panel.style.display = chk.checked ? 'block' : 'none';
        }
        const total = document.getElementById('costo-total');
        if (total) total.value = fmt(servicio.Costo_Total);
    }

    // Compila los datos del formulario de venta para su persistencia
    function obtenerDatosVenta() {
        const activa = Boolean(document.getElementById('chk-venta')?.checked);
        return {
            ventaActiva: activa,
            costoTotal: num(document.getElementById('costo-total')?.value),
            productos: activa ? obtenerFilas().filter(r => r.producto && r.piezas > 0) : []
        };
    }

    return { inicializar, limpiar, rellenar, obtenerDatosVenta };
})();