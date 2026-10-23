document.addEventListener('DOMContentLoaded', () => {
    const modalCaja = document.getElementById('modal-caja');
    const listaProductos = document.getElementById('lista-productos');
    const btnAgregar = document.getElementById('btn-agregar');

    // Carga la plantilla local HTML del modal e inicializa sus eventos
    async function precargarModal() {
        try {
            const res = await fetch('indexs/NuEdInv.html');
            if (res.ok && modalCaja) {
                modalCaja.innerHTML = await res.text();
                if (window.NuEdInv && typeof window.NuEdInv.init === 'function') {
                    window.NuEdInv.init();
                }
            }
        } catch (error) {
            console.error('Error al cargar la plantilla del modal:', error);
        }
    }

    // Escucha de clics dentro de la tabla (Editar y Eliminar)
    if (listaProductos) {
        listaProductos.addEventListener('click', (e) => {
            const boton = e.target.closest('button[data-accion]');
            if (!boton) return;

            const accion = boton.dataset.accion;

            if (accion === 'editar') {
                if (window.NuEdInv) window.NuEdInv.abrir();
            } else if (accion === 'eliminar') {
                const fila = boton.closest('tr');
                if (confirm('¿Deseas eliminar este producto?')) {
                    fila?.remove();
                }
            }
        });
    }

    // Botón Agregar (+)
    if (btnAgregar) {
        btnAgregar.addEventListener('click', () => {
            if (window.NuEdInv) window.NuEdInv.abrir();
        });
    }

    precargarModal();
});