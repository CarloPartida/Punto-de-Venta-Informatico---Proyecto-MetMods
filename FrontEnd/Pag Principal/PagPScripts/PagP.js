document.addEventListener('DOMContentLoaded', () => {
    const modalContenedor = document.getElementById('modal-contenedor');
    const modalCaja = document.getElementById('modal-caja');
    const contenedorPerfil = document.getElementById('contenedor-perfil');
    
    const btnMenu = document.getElementById('btn-menu');
    const btnAgregar = document.getElementById('btn-agregar');
    const botonesEditar = document.querySelectorAll('.btn-editar');

    async function precargarComponentes() {
        try {
            const [resServicios, resVentas, resPerfil] = await Promise.all([
                fetch('indexs/modalServicios.html'),
                fetch('indexs/modalVentas.html'),
                fetch('indexs/Perfil.html')
            ]);

            if (resServicios.ok && resVentas.ok) {
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

    // Funcionalidad de Mostrar/Ocultar el menú de Perfil al hacer clic en ⋮
    function configurarEventosPerfil() {
        if (btnMenu) {
            btnMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                const panelPerfil = document.getElementById('panel-perfil');
                
                if (panelPerfil) {
                    const estáOculto = panelPerfil.style.display === 'none' || panelPerfil.style.display === '';
                    panelPerfil.style.display = estáOculto ? 'block' : 'none';
                }
            });

            // Ocultar si hacen clic en cualquier otra parte de la pantalla
            document.addEventListener('click', () => {
                const panelPerfil = document.getElementById('panel-perfil');
                if (panelPerfil) panelPerfil.style.display = 'none';
            });
        }
    }

    function configurarEventosModales() {
        const chkVenta = document.getElementById('chk-venta');
        const panelVenta = document.getElementById('panel-venta');

        if (chkVenta && panelVenta) {
            chkVenta.addEventListener('change', (e) => {
                panelVenta.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        modalCaja.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-mas') || e.target.classList.contains('btn-menos')) {
                const fila = e.target.closest('tr');
                const spanCant = fila.querySelector('.cant-piezas');
                if (spanCant) {
                    let cantidad = parseInt(spanCant.textContent) || 0;
                    if (e.target.classList.contains('btn-mas')) cantidad++;
                    else if (e.target.classList.contains('btn-menos') && cantidad > 0) cantidad--;
                    spanCant.textContent = cantidad;
                }
            }
        });
    }

    precargarComponentes();

    // Abrir y Cerrar Modal
    function abrirModal() {
        if (modalContenedor) modalContenedor.showModal();
    }

    function cerrarModal() {
        if (modalContenedor) modalContenedor.close();
    }

    if (btnAgregar) btnAgregar.addEventListener('click', abrirModal);
    botonesEditar.forEach(btn => btn.addEventListener('click', abrirModal));

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
});