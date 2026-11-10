document.addEventListener('DOMContentLoaded', () => {
    // Rutas y constantes principales
    const API = '/api/soporte';

    // Elementos del DOM
    const modalCaja = document.getElementById('modal-caja');
    const listaSoporte = document.getElementById('lista-soporte');
    const btnAgregar = document.getElementById('btn-agregar');
    const aviso = document.getElementById('aviso');

    // Muestra un mensaje de estado debajo de la tabla
    const avisar = (texto) => { if (aviso) aviso.textContent = texto; };

    // Function helper para censurar los 4 dígitos centrales (RQNF 23)
    function enmascararTelefono(telefono) {
        if (!telefono) return '';
        const digitos = String(telefono).replace(/\D/g, '');
        if (digitos.length === 10) {
            return `${digitos.substring(0, 2)} **** ${digitos.substring(6)}`;
        }
        return String(telefono).replace(/^(\d{2}\s*)\d{4}/, '$1****');
    }

    // Realiza peticiones HTTP centralizadas
    async function pedir(url, opciones = {}) {
        const respuesta = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...opciones
        });
        // Sin sesión activa el servidor responde 401: se regresa al login
        if (respuesta.status === 401) {
            window.location.href = '/';
            throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
        }
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.error || 'Error en la solicitud');
        return datos;
    }

    function crearCelda(texto) {
        const celda = document.createElement('td');
        celda.textContent = texto ?? '';
        return celda;
    }

    function crearBoton(texto, clase, accion, etiqueta) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = clase;
        boton.textContent = texto;
        boton.dataset.accion = accion;
        boton.title = etiqueta;
        boton.setAttribute('aria-label', etiqueta);
        return boton;
    }

    // Construye una fila con textContent (no innerHTML) para que ningún dato guardado inyecte HTML
    function crearFila(tecnico) {
        const fila = document.createElement('tr');
        fila.dataset.id = tecnico.ID_Soporte;
        fila.tabIndex = -1; // se puede enfocar con las flechas (RQNF 22)

        const acciones = document.createElement('td');
        acciones.className = 'col-acciones';
        acciones.append(
            crearBoton('\u270F\uFE0F', 'btn-editar', 'editar', 'Editar'),
            crearBoton('\u{1F5D1}\uFE0F', 'btn-eliminar', 'eliminar', 'Eliminar')
        );

        fila.append(
            crearCelda(tecnico.ID_Soporte),
            crearCelda(tecnico.Nombre),
            crearCelda(tecnico.Edad),
            crearCelda(enmascararTelefono(tecnico.Telefono)), // Se aplica la censura al renderizar
            crearCelda(tecnico.Localidad),
            acciones
        );
        return fila;
    }

    // Carga la lista completa desde el servidor
    async function cargarSoporte() {
        try {
            const tecnicos = await pedir(API);
            listaSoporte.replaceChildren(...tecnicos.map(crearFila));

            // Solo la primera fila entra en el orden del Tab; las flechas mueven entre filas
            if (listaSoporte.firstElementChild) listaSoporte.firstElementChild.tabIndex = 0;

            avisar(tecnicos.length ? '' : 'No hay personal de soporte registrado.');
        } catch (error) {
            avisar(`No se pudo cargar la lista de soporte: ${error.message}`);
        }
    }

    // Elimina un técnico previa confirmación (RQNF 26)
    async function eliminarTecnico(fila) {
        const nombre = fila.children[1].textContent;
        if (!confirm(`¿Deseas eliminar definitivamente a "${nombre}" del personal de soporte?`)) return;

        try {
            await pedir(`${API}/${fila.dataset.id}`, { method: 'DELETE' });
            await cargarSoporte();
        } catch (error) {
            avisar(error.message);
        }
    }

    // Espera a que el formulario HTML y sus eventos estén listos antes de abrirlo.
    let promesaModal;
    async function editarTecnico(id) {
        try {
            await promesaModal;
            await window.NuEdSp.abrir(id);
        } catch (error) {
            avisar(error.message);
        }
    }

    // Carga la plantilla HTML del modal e inicializa sus eventos
    async function precargarModal() {
        try {
            const res = await fetch('index/NuEdSp.html');
            if (!res.ok || !modalCaja) {
                throw new Error('No se pudo cargar el formulario de soporte');
            }
            modalCaja.innerHTML = await res.text();
            window.NuEdSp.init();
        } catch (error) {
            avisar(`Error al cargar el formulario: ${error.message}`);
            throw error;
        }
    }

    // Un solo listener para todas las filas (se crean y borran dinámicamente)
    if (listaSoporte) {
        listaSoporte.addEventListener('click', (e) => {
            const boton = e.target.closest('button[data-accion]');
            if (!boton) return;
            const fila = boton.closest('tr');

            if (boton.dataset.accion === 'editar') editarTecnico(fila.dataset.id);
            else if (boton.dataset.accion === 'eliminar') eliminarTecnico(fila);
        });

        // Navegación con teclado entre registros
        listaSoporte.addEventListener('keydown', (e) => {
            const fila = e.target.closest('tr');
            if (!fila) return;

            let destino = null;
            if (e.key === 'ArrowDown') destino = fila.nextElementSibling;
            else if (e.key === 'ArrowUp') destino = fila.previousElementSibling;
            else if (e.key === 'Home') destino = listaSoporte.firstElementChild;
            else if (e.key === 'End') destino = listaSoporte.lastElementChild;
            else if (e.key === 'Enter' && e.target === fila) {
                editarTecnico(fila.dataset.id);
                return;
            }

            if (!destino) return;
            e.preventDefault();
            fila.tabIndex = -1;
            destino.tabIndex = 0;
            destino.focus();
        });
    }

    // Botón Agregar (+)
    if (btnAgregar) {
        btnAgregar.addEventListener('click', async () => {
            try {
                await promesaModal;
                await window.NuEdSp.abrir();
            } catch (error) {
                avisar(error.message);
            }
        });
    }

    document.addEventListener('soporte-guardado', cargarSoporte);

    promesaModal = precargarModal();
    promesaModal.catch(() => {});
    cargarSoporte();
});