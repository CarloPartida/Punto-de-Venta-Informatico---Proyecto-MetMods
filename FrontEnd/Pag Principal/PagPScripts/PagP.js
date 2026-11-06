document.addEventListener('DOMContentLoaded', () => {
    const API = '/api/servicios';
    const listaServicios = document.getElementById('lista-servicios');
    const aviso = document.getElementById('aviso');

    // Muestra notificaciones contextuales en la interfaz principal
    const avisar = txt => { if (aviso) aviso.textContent = txt; };

    // Ejecuta peticiones HTTP asíncronas centralizadas
    async function pedir(url, opciones = {}) {
        const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opciones });
        const datos = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(datos.error || 'Error en la petición');
        return datos;
    }

    // Construye el elemento HTML para la fila de un servicio en la tabla
    function crearFila(s) {
        const tr = document.createElement('tr');
        tr.className = 'Casilla';
        tr.dataset.id = s.ID_Servicio;
        tr.innerHTML = `
            <td>${s.ID_Servicio}</td>
            <td>${s.Nombre ?? ''}</td>
            <td>${s.Equipo ?? ''}</td>
            <td>${s.Fecha ?? ''}</td>
            <td><button type="button" class="btn-editar" data-accion="editar" aria-label="Editar">&#9998;</button></td>
            <td><button type="button" class="btn-finalizar" data-accion="finalizar">Finalizar</button></td>
        `;
        return tr;
    }

    // Consulta y despliega la lista de servicios pendientes
    async function cargarServicios() {
        if (!listaServicios) return;
        try {
            const servicios = await pedir(API);
            listaServicios.replaceChildren(...servicios.map(crearFila));
            avisar(servicios.length ? '' : 'No hay servicios pendientes.');
        } catch (e) {
            avisar(`Error al cargar servicios: ${e.message}`);
        }
    }

    // Administra la delegación de eventos en la tabla de servicios
    if (listaServicios) {
        listaServicios.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-accion]');
            if (!btn) return;
            const id = btn.closest('[data-id]').dataset.id;

            if (btn.dataset.accion === 'editar') {
                ModalServicios.editar(id);
            } else if (btn.dataset.accion === 'finalizar') {
                if (confirm(`¿Deseas marcar el servicio #${id} como finalizado?`)) {
                    try {
                        await pedir(`${API}/${id}/finalizar`, { method: 'PATCH' });
                        await cargarServicios();
                    } catch (err) {
                        avisar(err.message);
                    }
                }
            }
        });
    }

    // Inyecta dinámicamente las plantillas HTML secundarias e inicializa los módulos
    async function precargarComponentes() {
        try {
            const [resServicios, resVentas, resPerfil] = await Promise.all([
                fetch('indexs/modalServicios.html'),
                fetch('indexs/modalVentas.html'),
                fetch('indexs/Perfil.html')
            ]);

            const modalCaja = document.getElementById('modal-caja');
            if (resServicios.ok && resVentas.ok && modalCaja) {
                modalCaja.innerHTML = (await resServicios.text()) + (await resVentas.text());
                ModalVentas.inicializar();
                ModalServicios.inicializar({ onGuardado: cargarServicios });
            }

            const contenedorPerfil = document.getElementById('contenedor-perfil');
            if (resPerfil.ok && contenedorPerfil) {
                contenedorPerfil.innerHTML = await resPerfil.text();
                Perfil.inicializar();
            }
        } catch (e) {
            console.error('Error precargando componentes:', e);
        }
    }

    // Asigna controladores para la navegación entre las diferentes vistas
    const nav = (id, url) => document.getElementById(id)?.addEventListener('click', () => window.location.href = url);
    nav('btn-cartera', '../Car Clientes/CarC.html');
    nav('btn-inventario', '../Inventario/Inv.html');
    nav('btn-proveedores', '../Proveedores/Prov.html');
    nav('btn-soporte', '../Soporte/Soporte.html');

    document.getElementById('btn-agregar')?.addEventListener('click', () => ModalServicios.abrir());

    precargarComponentes();
    cargarServicios();
});