const FacturaPDF = (() => {
    // Carga asíncrona de la biblioteca jsPDF mediante inserción de script
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

    // Genera y descarga el comprobante en formato PDF según el ID del servicio
    async function generar(idServicio, callbackMensaje = console.log) {
        if (!idServicio) {
            callbackMensaje('Guarda o selecciona un servicio registrado antes de generar la factura.');
            return;
        }

        try {
            callbackMensaje('Generando factura PDF...');
            const { jsPDF } = await cargarJsPDF();

            // Consulta la información detallada del servicio al servidor
            const res = await fetch(`/api/servicios/${idServicio}`);
            if (!res.ok) throw new Error('No se encontraron los datos del servicio.');
            const servicio = await res.json();

            const doc = new jsPDF();

            // Estructuración de datos del encabezado
            doc.setFontSize(18);
            doc.text('FACTURA DE SERVICIO - PUNTO DE VENTA', 14, 20);

            // Inserción de metadatos del servicio y cliente
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

            // Renderizado itemizado del detalle de productos
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

            // Cálculo final y descarga del documento
            doc.line(14, posY + 5, 196, posY + 5);
            doc.setFontSize(14);
            doc.text(`COSTO TOTAL: $${Number(servicio.Costo_Total).toFixed(2)} MXN`, 14, posY + 16);

            doc.save(`Factura_Servicio_${servicio.ID_Servicio}.pdf`);
            callbackMensaje('');
        } catch (err) {
            callbackMensaje(`Error al generar factura: ${err.message}`);
        }
    }

    return { generar };
})();