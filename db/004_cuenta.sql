ALTER TABLE inventario.app_usuarios
    ADD COLUMN clave_actualizada_en timestamptz;

CREATE INDEX idx_app_sesiones_usuario ON inventario.app_sesiones(usuario);
