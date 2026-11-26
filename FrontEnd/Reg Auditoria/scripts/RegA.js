document.addEventListener('DOMContentLoaded', async () => {
    const dialog = document.getElementById('modal-auditoria-contenedor');
    const caja = document.getElementById('modal-auditoria-caja');
    if (!dialog || !caja) return;

    const API = '/api/auditoria';
    const POR_PAGINA = 50;

    const res = await fetch('../Reg Auditoria/index/RegA.html');
    if (res.ok) caja.innerHTML = await res.text();

    const lista = caja.querySelector('#lista-auditoria');
    const estado = caja.querySelector('#estado-auditoria');
    const btnMas = caja.querySelector('#btn-mas-auditoria');
    if (!lista || !estado || !btnMas) return;

    let siguiente = null; // ID desde el cual se pide la siguiente página (null = no hay más)
    let cargando = false;

    // Construye la caja de un registro. Se usa textContent para que nada se interprete como HTML
    function crearRegistro(registro) {
        const item = document.createElement('div');
        item.setAttribute('role', 'listitem');

        const quien = document.createElement('div');
        quien.className = 'small fw-semibold text-secondary mb-1';
        quien.textContent = `${registro.Modificado_Por} modificó:`;

        const detalle = document.createElement('div');
        detalle.className = 'border rounded-2 px-3 py-2 bg-body text-center';

        const accion = document.createElement('div');
        accion.textContent = registro.Accion;

        const fecha = document.createElement('div');
        fecha.className = 'small text-secondary';
        fecha.textContent = registro.Fecha_Hora;

        detalle.append(accion, fecha);
        item.append(quien, detalle);
        return item;
    }

    // Consulta una página del historial; con reiniciar=true vuelve a empezar desde lo más reciente
    async function cargar(reiniciar) {
        if (cargando) return;
        cargando = true;
        btnMas.disabled = true;

        if (reiniciar) {
            siguiente = null;
            lista.replaceChildren();
            btnMas.hidden = true;
        }
        estado.textContent = 'Cargando…';

        try {
            const parametros = new URLSearchParams({ limite: POR_PAGINA });
            if (siguiente) parametros.set('antes', siguiente);

            const respuesta = await fetch(`${API}?${parametros}`);
            const datos = await respuesta.json().catch(() => ({}));
            if (!respuesta.ok) throw new Error(datos.error || 'No se pudo cargar el historial');

            lista.append(...datos.registros.map(crearRegistro));
            siguiente = datos.siguiente;
            estado.textContent = lista.children.length ? '' : 'Aún no hay modificaciones registradas.';
        } catch (e) {
            estado.textContent = e.message;
        } finally {
            cargando = false;
            btnMas.disabled = false;
            const habiaFoco = document.activeElement === btnMas;
            btnMas.hidden = siguiente === null;
            // Si el botón desaparece estando enfocado, el foco pasa a la lista para seguir con el teclado
            if (btnMas.hidden && habiaFoco) lista.focus();
        }
    }

    // Abrir modal con el botón del menú de perfil
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#btn-auditoria, #contenedor-perfil button');
        if (btn && (btn.id === 'btn-auditoria' || btn.textContent.trim() === 'Registro de Auditoría')) {
            dialog.showModal();
            lista.focus();
            cargar(true);
        }
    });

    // Cargar la siguiente página del historial
    btnMas.addEventListener('click', () => cargar(false));

    // Cerrar modal con el botón de cierre
    caja.addEventListener('click', (e) => {
        if (e.target.closest('#btn-cerrar-auditoria')) {
            dialog.close();
        }
    });
});
