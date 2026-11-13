document.addEventListener('DOMContentLoaded', async () => {
    const dialog = document.getElementById('modal-auditoria-contenedor');
    const caja = document.getElementById('modal-auditoria-caja');
    if (!dialog || !caja) return;

    const res = await fetch('../Reg Auditoria/index/RegA.html');
    if (res.ok) caja.innerHTML = await res.text();

    // Abrir modal con el botón del menú de perfil
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#btn-auditoria, #contenedor-perfil button');
        if (btn && (btn.id === 'btn-auditoria' || btn.textContent.trim() === 'Registro de Auditoría')) {
            dialog.showModal();
        }
    });

    // Cerrar modal con el botón de cierre
    caja.addEventListener('click', (e) => {
        if (e.target.closest('#btn-cerrar-auditoria')) {
            dialog.close();
        }
    });
});