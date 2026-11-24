CREATE TABLE inventario.app_usuarios (
    usuario varchar(60) PRIMARY KEY,
    nombre varchar(100) NOT NULL,
    clave_hash text NOT NULL
);
CREATE TABLE inventario.app_sesiones (
    token_hash text PRIMARY KEY,
    usuario varchar(60) NOT NULL REFERENCES inventario.app_usuarios(usuario) ON DELETE CASCADE,
    vence timestamptz NOT NULL
);
CREATE TABLE inventario.app_escenarios (
    codigo varchar(8) PRIMARY KEY,
    empresa varchar(80) NOT NULL,
    referencia text NOT NULL,
    precio_publicado numeric(18,4) NOT NULL,
    id_articulo bigint NOT NULL REFERENCES inventario.mae_articulos(id_articulo),
    id_almacen integer NOT NULL REFERENCES inventario.mae_almacenes(id_almacen),
    id_almacen_secundario integer REFERENCES inventario.mae_almacenes(id_almacen),
    objetivo text NOT NULL
);
ALTER TABLE inventario.mae_existencias_almacen
    ADD CONSTRAINT saldo_almacen_no_negativo CHECK (stock_actual >= 0 AND valor_actual_alm >= 0);
ALTER TABLE inventario.trs_movimientos_detalle
    ADD COLUMN importe_venta_base numeric(18,4) CHECK (importe_venta_base >= 0);
CREATE UNIQUE INDEX uq_app_kardex_detalle_activo
    ON inventario.trs_kardex_movimientos (id_movimiento_det) WHERE NOT anulado;
CREATE SEQUENCE inventario.app_orden_kardex;
CREATE SEQUENCE inventario.app_numero_movimiento;
CREATE SEQUENCE inventario.app_codigo_conteo;

CREATE OR REPLACE VIEW inventario.vw_inventario_valorado AS
SELECT e.id_almacen, a.codigo AS codigo_almacen, a.nombre AS nombre_almacen,
       p.id_articulo, p.codigo_sku, p.descripcion AS nombre_articulo,
       c.nombre AS categoria, u.abreviatura AS unidad_base,
       e.stock_actual, e.costo_promedio_alm AS costo_promedio,
       e.valor_actual_alm::numeric AS valor_inventario
FROM inventario.mae_existencias_almacen e
JOIN inventario.mae_almacenes a USING (id_almacen)
JOIN inventario.mae_articulos p USING (id_articulo)
JOIN inventario.mae_unidades_medida u ON u.id_unidad_medida = p.id_unidad_base
LEFT JOIN inventario.mae_categorias_articulo c USING (id_categoria);

CREATE OR REPLACE VIEW inventario.vw_utilidad_bruta_articulo AS
WITH ventas AS (
    SELECT c.id_almacen, a.nombre AS nombre_almacen, p.id_articulo, p.codigo_sku,
           p.descripcion AS nombre_articulo, date_trunc('month', c.fecha_movimiento, 'America/Lima') AS mes_operacion,
           k.cantidad_salida AS cantidad,
           COALESCE(d.importe_venta_base, round(d.cantidad_ingresada * d.precio_unit_moneda * c.tipo_cambio_aplicado, 4)) AS ingreso,
           k.costo_total_mov AS costo
    FROM inventario.trs_movimientos_cabecera c
    JOIN inventario.mae_tipos_movimiento t USING (id_tipo_movimiento)
    JOIN inventario.trs_movimientos_detalle d USING (id_movimiento)
    JOIN inventario.trs_kardex_movimientos k ON k.id_movimiento_det=d.id_movimiento_det
         AND k.id_movimiento=c.id_movimiento AND k.id_almacen=c.id_almacen
         AND k.id_articulo=d.id_articulo AND NOT k.anulado AND k.cantidad_salida > 0
    JOIN inventario.mae_almacenes a ON a.id_almacen=c.id_almacen
    JOIN inventario.mae_articulos p ON p.id_articulo=d.id_articulo
    WHERE c.estado='REGISTRADO' AND t.codigo='VENTA'
)
SELECT id_almacen, nombre_almacen, id_articulo, codigo_sku, nombre_articulo, mes_operacion,
       sum(cantidad) AS unidades_vendidas, sum(ingreso) AS ingreso_ventas_base,
       sum(costo) AS costo_ventas_cpp, sum(ingreso - costo) AS utilidad_bruta,
       CASE WHEN sum(ingreso)>0 THEN round(100 * sum(ingreso-costo)/sum(ingreso),2)
            ELSE 0 END AS margen_bruto_pct
FROM ventas
GROUP BY id_almacen,nombre_almacen,id_articulo,codigo_sku,nombre_articulo,mes_operacion;
