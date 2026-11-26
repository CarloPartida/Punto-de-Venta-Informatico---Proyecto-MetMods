-- ============================================================
-- Registro de Auditoría: protección a nivel de base de datos
-- Ejecutar UNA VEZ sobre la base sistema_servicios (es repetible sin errores).
--   Línea de comandos: mysql -u root sistema_servicios < auditoria_solo_lectura.sql
--   phpMyAdmin: seleccionar la base sistema_servicios > Importar
-- Requiere MariaDB 10.2.22 o superior.
-- ============================================================

-- RQNF 32: los registros de auditoría son de solo lectura (no se editan ni se eliminan)
DROP TRIGGER IF EXISTS trg_auditoria_solo_lectura_update;
CREATE TRIGGER trg_auditoria_solo_lectura_update BEFORE UPDATE ON auditoria
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'auditoria es de solo lectura: no se puede editar';

DROP TRIGGER IF EXISTS trg_auditoria_solo_lectura_delete;
CREATE TRIGGER trg_auditoria_solo_lectura_delete BEFORE DELETE ON auditoria
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'auditoria es de solo lectura: no se puede eliminar';

-- RQNF 34: toda acción guardada debe tener una marca de tiempo válida
-- (rechaza fechas vacías o en cero aunque el modo SQL del servidor sea permisivo, como en XAMPP)
ALTER TABLE auditoria DROP CONSTRAINT IF EXISTS chk_auditoria_fecha;
ALTER TABLE auditoria ADD CONSTRAINT chk_auditoria_fecha CHECK (Fecha_Hora >= '2000-01-01 00:00:00');
