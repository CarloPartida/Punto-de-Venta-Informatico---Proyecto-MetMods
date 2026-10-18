document.addEventListener('DOMContentLoaded', () => {
    const RUTA_NUED = 'index/NuEd.html'; 

    // 1. Botón + (Agregar nuevo cliente)
    const btnAgregar = document.getElementById('btn-agregar');
    if (btnAgregar) {
        btnAgregar.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = RUTA_NUED;
        });
    }

    // 2. Delegación de eventos para los botones de editar en la tabla
    document.addEventListener('click', (e) => {
        // Busca el botón si tiene la clase .btn-editar o si se hizo clic en un icono dentro de él
        const btnEditar = e.target.closest('.btn-editar');

        if (btnEditar) {
            e.preventDefault();
            const fila = btnEditar.closest('tr');
            const idCliente = fila ? fila.dataset.id : null;

            if (idCliente) {
                window.location.href = `${RUTA_NUED}?id=${idCliente}`;
            } else {
                window.location.href = RUTA_NUED;
            }
        }
    });
});