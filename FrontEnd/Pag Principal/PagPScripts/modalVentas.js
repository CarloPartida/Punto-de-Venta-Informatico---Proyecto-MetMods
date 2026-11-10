const ModalVentas = (() => {
    let catalogo = new Map(), clientes = [];
    let totalEditadoManualmente = false;

    const fmt = n => `$${Number(n || 0).toFixed(2)}`;
    const num = s => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;

    async function inicializar() {
        try {
            const [prods, clis] = await Promise.all([
                fetch('/api/servicios/productos').then(r => r.json()),
                fetch('/api/servicios/clientes').then(r => r.json())
            ]);
            catalogo = new Map(prods.map(p => [p.Nombre || p.nombre, Number(p.Precio || p.precio)]));
            clientes = clis;

            poblarDatalist('lista-productos', prods.map(p => `<option value="${p.Nombre || p.nombre}">${fmt(p.Precio || p.precio)}</option>`));
            poblarDatalist('lista-clientes', clis.map(c => `<option value="${c.Nombre || c.nombre}">`));
        } catch (e) {
            console.error('Error cargando catálogos de ventas:', e);
        }

        configurarEventos();
    }

    function poblarDatalist(id, opcionesHtml) {
        let dl = document.getElementById(id) || document.createElement('datalist');
        dl.id = id;
        dl.innerHTML = opcionesHtml.join('');
        if (!dl.parentNode) document.body.appendChild(dl);
    }

    function configurarEventos() {
        const modal = document.getElementById('modal-caja') || document.getElementById('modal-contenedor');
        if (!modal) return;

        // Mostrar / Ocultar panel de ventas
        document.getElementById('chk-venta')?.addEventListener('change', (e) => {
            const panel = document.getElementById('panel-venta');
            if (panel) panel.style.display = e.target.checked ? 'block' : 'none';
            if (!totalEditadoManualmente) recalcularTotal();
        });

        // Si editas manualmente el campo Costo Total, bloquea la sobrescritura automática
        document.getElementById('costo-total')?.addEventListener('input', () => {
            totalEditadoManualmente = true;
        });

        // Autocompletado del cliente
        document.getElementById('cliente-nombre')?.addEventListener('input', (e) => {
            const valBusqueda = e.target.value.trim().toLowerCase();
            const c = clientes.find(x => (x.Nombre || x.nombre || '').toLowerCase() === valBusqueda);
            const ed = document.getElementById('cliente-edad');
            const tel = document.getElementById('cliente-telefono');
            if (ed) ed.value = c?.Edad ?? c?.edad ?? '';
            if (tel) tel.value = c?.Telefono ?? c?.telefono ?? '';
        });

        // Cambio de cantidad (+ / -)
        modal.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-mas, .btn-menos');
            if (!btn) return;
            const span = btn.closest('tr')?.querySelector('.cant-piezas');
            if (span) {
                let cant = parseInt(span.textContent, 10) || 0;
                span.textContent = btn.classList.contains('btn-mas') ? cant + 1 : Math.max(0, cant - 1);
                totalEditadoManualmente = false;
                recalcularTotal();
            }
        });

        // Al escribir o seleccionar un producto, asigna automáticamente 1 pieza si estaba en 0
        modal.addEventListener('input', (e) => {
            if (e.target.matches('.input-prod')) {
                const tr = e.target.closest('tr');
                const valProd = e.target.value.trim();
                const spanCant = tr?.querySelector('.cant-piezas');
                const inPrecio = tr?.querySelector('.input-precio');

                if (valProd) {
                    if (spanCant && (parseInt(spanCant.textContent, 10) || 0) === 0) {
                        spanCant.textContent = '1';
                    }
                    const precioCat = catalogo.get(valProd);
                    if (precioCat !== undefined && inPrecio && !inPrecio.value) {
                        inPrecio.value = fmt(precioCat);
                    }
                }
            }

            if (e.target.matches('.input-precio')) {
                totalEditadoManualmente = false;
            }

            if (!e.target.matches('#costo-total') && !totalEditadoManualmente) {
                recalcularTotal();
            }
        });
    }

    function recalcularTotal() {
        const chk = document.getElementById('chk-venta');
        const totalIn = document.getElementById('costo-total');
        if (!chk?.checked || !totalIn || totalEditadoManualmente) return;

        const total = obtenerFilas().reduce((acc, r) => acc + (r.precio * (r.piezas || 1)), 0);
        totalIn.value = fmt(total);
    }

    function obtenerFilas() {
        const tbody = document.getElementById('tabla-ventas-body');
        if (!tbody) return [];
        return [...tbody.querySelectorAll('tr')].map(tr => {
            const prod = tr.querySelector('.input-prod')?.value.trim() || '';
            const prec = num(tr.querySelector('.input-precio')?.value);
            let piez = parseInt(tr.querySelector('.cant-piezas')?.textContent, 10) || 0;
            if (prod && piez === 0) piez = 1;
            return { producto: prod, precio: prec, piezas: piez };
        });
    }

    function limpiar() {
        totalEditadoManualmente = false;
        const chk = document.getElementById('chk-venta');
        const panel = document.getElementById('panel-venta');
        const total = document.getElementById('costo-total');
        if (chk) chk.checked = false;
        if (panel) panel.style.display = 'none';
        if (total) total.value = '';

        document.querySelectorAll('#tabla-ventas-body tr').forEach(tr => {
            const inProd = tr.querySelector('.input-prod');
            const inPrecio = tr.querySelector('.input-precio');
            const spanCant = tr.querySelector('.cant-piezas');
            if (inProd) inProd.value = '';
            if (inPrecio) inPrecio.value = '';
            if (spanCant) spanCant.textContent = '0';
        });
    }

    function extraerProductos(servicio) {
        if (!servicio) return [];
        let prods = servicio.detalle || servicio.productos || servicio.Productos || servicio.detalles || [];
        if (typeof prods === 'string') {
            try { prods = JSON.parse(prods); } catch (e) { prods = []; }
        }
        return Array.isArray(prods) ? prods : [];
    }

    function rellenar(servicio) {
        if (!servicio) return;
        totalEditadoManualmente = false;

        const chk = document.getElementById('chk-venta');
        const panel = document.getElementById('panel-venta');
        const total = document.getElementById('costo-total');

        const valActiva = servicio.Venta_Activa ?? servicio.ventaActiva ?? servicio.venta_activa;
        const activa = valActiva === true || valActiva === 1 || valActiva === '1' || valActiva === 'true';

        if (chk) chk.checked = activa;
        if (panel) panel.style.display = activa ? 'block' : 'none';

        const montoTotal = servicio.Costo_Total ?? servicio.costoTotal ?? servicio.costo_total ?? 0;
        if (total) total.value = fmt(montoTotal);

        const prods = extraerProductos(servicio);
        const filas = document.querySelectorAll('#tabla-ventas-body tr');

        filas.forEach((tr, idx) => {
            const item = prods[idx];
            const inProd = tr.querySelector('.input-prod');
            const inPrecio = tr.querySelector('.input-precio');
            const spanCant = tr.querySelector('.cant-piezas');

            if (item) {
                const nombreProd = item.producto || item.Producto || item.nombre || item.Nombre || '';
                const precioProd = item.precio ?? item.Precio ?? item.Precio_Unitario ?? 0;
                const piezasProd = item.piezas ?? item.Piezas ?? item.Cantidad ?? 1;

                if (inProd) inProd.value = nombreProd;
                if (inPrecio) inPrecio.value = fmt(precioProd);
                if (spanCant) spanCant.textContent = piezasProd;
            } else {
                if (inProd) inProd.value = '';
                if (inPrecio) inPrecio.value = '';
                if (spanCant) spanCant.textContent = '0';
            }
        });

        const sumaFilas = obtenerFilas().reduce((acc, r) => acc + (r.precio * r.piezas), 0);
        if (montoTotal > 0 && (sumaFilas === 0 || Math.abs(sumaFilas - montoTotal) > 0.01)) {
            totalEditadoManualmente = true;
        }
    }

    function obtenerDatosVenta() {
        const activa = Boolean(document.getElementById('chk-venta')?.checked);
        const montoIngresado = num(document.getElementById('costo-total')?.value);
        const filas = obtenerFilas();
        const productosValidos = activa ? filas.filter(r => r.producto && r.piezas > 0) : [];

        return {
            ventaActiva: activa,
            costoTotal: montoIngresado,
            productos: productosValidos
        };
    }

    return { inicializar, limpiar, rellenar, obtenerDatosVenta };
})();