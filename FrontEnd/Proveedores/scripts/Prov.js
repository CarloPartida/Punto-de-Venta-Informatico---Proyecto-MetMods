document.addEventListener('DOMContentLoaded', () => {
    const btnAgregar = document.getElementById('btn-agregar');
    const modalContenedor = document.getElementById('modal-contenedor');
    const modalCaja = document.getElementById('modal-caja');
    const listaProveedores = document.getElementById('lista-proveedores');

    // Función para cargar el HTML del modal y desplegar el <dialog>
    async function abrirModal() {
        try {
            if (!modalCaja.children.length) {
                // Ruta corregida según tu carpeta 'index'
                const respuesta = await fetch('index/NuEdProv.html');
                
                if (!respuesta.ok) {
                    throw new Error(`Error al cargar el modal: ${respuesta.status}`);
                }

                modalCaja.innerHTML = await respuesta.text();

                // Evento para cerrar el modal al pulsar Cancelar
                const btnCancelar = modalCaja.querySelector('#btn-cancelar');
                if (btnCancelar) {
                    btnCancelar.addEventListener('click', () => modalContenedor.close());
                }
            }
            modalContenedor.showModal();
        } catch (error) {
            console.error('Error al abrir la ventana modal:', error);
        }
    }

    // Evento botón "+"
    if (btnAgregar) {
        btnAgregar.addEventListener('click', abrirModal);
    }

    // Evento botones de editar en la tabla
    if (listaProveedores) {
        listaProveedores.addEventListener('click', (e) => {
            if (e.target.closest('.btn-editar')) {
                abrirModal();
            }
        });
    }
});