-- Esquema relacional extraído del respaldo PostgreSQL FASE3.sql.
-- La base destino se configura externamente.

CREATE SCHEMA inventario;

CREATE TABLE inventario.mae_almacenes (
    id_almacen integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(120) NOT NULL,
    ubicacion character varying(200),
    es_principal boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL
);

CREATE SEQUENCE inventario.mae_almacenes_id_almacen_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_articulo_unidades (
    id_articulo_unidad bigint NOT NULL,
    id_articulo bigint NOT NULL,
    id_unidad_medida integer NOT NULL,
    factor_a_base numeric(18,6) NOT NULL,
    es_unidad_compra boolean DEFAULT false NOT NULL,
    es_unidad_venta boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT mae_articulo_unidades_factor_a_base_check CHECK ((factor_a_base > (0)::numeric))
);

CREATE SEQUENCE inventario.mae_articulo_unidades_id_articulo_unidad_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_articulos (
    id_articulo bigint NOT NULL,
    codigo_sku character varying(40) NOT NULL,
    codigo_barras character varying(50),
    descripcion character varying(250) NOT NULL,
    id_categoria integer,
    id_marca integer,
    id_unidad_base integer NOT NULL,
    precio_venta_ref numeric(18,4) DEFAULT 0 NOT NULL,
    costo_promedio_actual numeric(18,6) DEFAULT 0 NOT NULL,
    stock_actual numeric(18,4) DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL,
    fecha_modificacion timestamp with time zone,
    usuario_modificacion character varying(60),
    CONSTRAINT mae_articulos_costo_promedio_actual_check CHECK ((costo_promedio_actual >= (0)::numeric)),
    CONSTRAINT mae_articulos_precio_venta_ref_check CHECK ((precio_venta_ref >= (0)::numeric))
);

CREATE SEQUENCE inventario.mae_articulos_id_articulo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_categorias_articulo (
    id_categoria integer NOT NULL,
    id_categoria_padre integer,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL
);

CREATE SEQUENCE inventario.mae_categorias_articulo_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_centros_costo (
    id_centro_costo integer NOT NULL,
    codigo character varying(25) NOT NULL,
    nombre character varying(120) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);

CREATE SEQUENCE inventario.mae_centros_costo_id_centro_costo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_clientes (
    id_cliente bigint NOT NULL,
    numero_documento character varying(25) NOT NULL,
    nombre_razon_social character varying(200) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL
);

CREATE SEQUENCE inventario.mae_clientes_id_cliente_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_conceptos_costo_adicional (
    id_concepto_costo integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);

CREATE SEQUENCE inventario.mae_conceptos_costo_adicional_id_concepto_costo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_documentos_referencia (
    id_doc_referencia integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);

CREATE SEQUENCE inventario.mae_documentos_referencia_id_doc_referencia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_existencias_almacen (
    id_existencia_alm bigint NOT NULL,
    id_almacen integer NOT NULL,
    id_articulo bigint NOT NULL,
    stock_actual numeric(18,4) DEFAULT 0 NOT NULL,
    costo_promedio_alm numeric(18,6) DEFAULT 0 NOT NULL,
    valor_actual_alm numeric(18,4) DEFAULT 0 NOT NULL,
    fecha_actualizacion timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mae_existencias_almacen_costo_promedio_alm_check CHECK ((costo_promedio_alm >= (0)::numeric))
);

CREATE SEQUENCE inventario.mae_existencias_almacen_id_existencia_alm_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_marcas (
    id_marca integer NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL
);

CREATE SEQUENCE inventario.mae_marcas_id_marca_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_monedas (
    id_moneda integer NOT NULL,
    codigo_iso character(3) NOT NULL,
    nombre character varying(60) NOT NULL,
    simbolo character varying(8) NOT NULL,
    decimales smallint DEFAULT 2 NOT NULL,
    es_moneda_base boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT mae_monedas_decimales_check CHECK (((decimales >= 0) AND (decimales <= 6)))
);

CREATE SEQUENCE inventario.mae_monedas_id_moneda_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_motivos_ajuste (
    id_motivo_ajuste integer NOT NULL,
    codigo character varying(25) NOT NULL,
    nombre character varying(120) NOT NULL,
    signo_esperado smallint,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT mae_motivos_ajuste_signo_esperado_check CHECK ((signo_esperado = ANY (ARRAY['-1'::integer, 1])))
);

CREATE SEQUENCE inventario.mae_motivos_ajuste_id_motivo_ajuste_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_parametros_inventario (
    id_parametro integer NOT NULL,
    clave character varying(60) NOT NULL,
    valor character varying(120) NOT NULL,
    descripcion character varying(250),
    fecha_modificacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_modificacion character varying(60) NOT NULL
);

CREATE SEQUENCE inventario.mae_parametros_inventario_id_parametro_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_proveedores (
    id_proveedor bigint NOT NULL,
    numero_documento character varying(25) NOT NULL,
    razon_social character varying(200) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL
);

CREATE SEQUENCE inventario.mae_proveedores_id_proveedor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_tipos_movimiento (
    id_tipo_movimiento integer NOT NULL,
    codigo character varying(25) NOT NULL,
    nombre character varying(100) NOT NULL,
    signo_stock smallint NOT NULL,
    recalcula_cpp boolean DEFAULT false NOT NULL,
    requiere_proveedor boolean DEFAULT false NOT NULL,
    requiere_cliente boolean DEFAULT false NOT NULL,
    requiere_centro_costo boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    CONSTRAINT mae_tipos_movimiento_signo_stock_check CHECK ((signo_stock = ANY (ARRAY['-1'::integer, 1])))
);

CREATE SEQUENCE inventario.mae_tipos_movimiento_id_tipo_movimiento_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.mae_unidades_medida (
    id_unidad_medida integer NOT NULL,
    codigo character varying(15) NOT NULL,
    nombre character varying(60) NOT NULL,
    abreviatura character varying(10) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL
);

CREATE SEQUENCE inventario.mae_unidades_medida_id_unidad_medida_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_ajustes_inventario (
    id_ajuste_inventario bigint NOT NULL,
    id_inventario_fisico bigint NOT NULL,
    id_movimiento_ajuste bigint NOT NULL,
    fecha_ajuste timestamp with time zone DEFAULT now() NOT NULL,
    usuario_ajuste character varying(60) NOT NULL
);

CREATE SEQUENCE inventario.trs_ajustes_inventario_id_ajuste_inventario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_auditoria_log (
    id_auditoria bigint NOT NULL,
    tabla_afectada character varying(80) NOT NULL,
    id_registro_afectado character varying(80) NOT NULL,
    accion character varying(20) NOT NULL,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    usuario_evento character varying(60) NOT NULL,
    fecha_evento timestamp with time zone DEFAULT now() NOT NULL,
    direccion_ip character varying(45),
    CONSTRAINT trs_auditoria_log_accion_check CHECK (((accion)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying, 'APROBAR'::character varying, 'ANULAR'::character varying, 'CERRAR'::character varying])::text[])))
);

CREATE SEQUENCE inventario.trs_auditoria_log_id_auditoria_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_cierre_inventario_detalle (
    id_cierre_detalle bigint NOT NULL,
    id_periodo bigint NOT NULL,
    id_almacen integer NOT NULL,
    id_articulo bigint NOT NULL,
    stock_cierre numeric(18,4) NOT NULL,
    costo_promedio_cierre numeric(18,6) NOT NULL,
    valor_total_cierre numeric(18,4) NOT NULL,
    CONSTRAINT trs_cierre_inventario_detalle_costo_promedio_cierre_check CHECK ((costo_promedio_cierre >= (0)::numeric))
);

CREATE SEQUENCE inventario.trs_cierre_inventario_detalle_id_cierre_detalle_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_conteo_fisico_registros (
    id_conteo_registro bigint NOT NULL,
    id_inventario_fisico bigint NOT NULL,
    id_articulo bigint NOT NULL,
    numero_ronda smallint DEFAULT 1 NOT NULL,
    zona_ubicacion character varying(80),
    cantidad_contada numeric(18,4) NOT NULL,
    contador_nombre character varying(100) NOT NULL,
    fecha_conteo timestamp with time zone DEFAULT now() NOT NULL,
    observaciones character varying(250),
    CONSTRAINT trs_conteo_fisico_registros_cantidad_contada_check CHECK ((cantidad_contada >= (0)::numeric)),
    CONSTRAINT trs_conteo_fisico_registros_numero_ronda_check CHECK ((numero_ronda >= 1))
);

CREATE SEQUENCE inventario.trs_conteo_fisico_registros_id_conteo_registro_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_costos_adicionales_compra (
    id_costo_adicional bigint NOT NULL,
    id_movimiento bigint NOT NULL,
    id_concepto_costo integer NOT NULL,
    id_moneda integer NOT NULL,
    tipo_cambio_aplicado numeric(18,6) DEFAULT 1 NOT NULL,
    monto_moneda numeric(18,4) NOT NULL,
    monto_base numeric(18,4) NOT NULL,
    criterio_prorrateo character varying(20) DEFAULT 'VALOR'::character varying NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL,
    CONSTRAINT trs_costos_adicionales_compra_criterio_prorrateo_check CHECK (((criterio_prorrateo)::text = ANY ((ARRAY['VALOR'::character varying, 'CANTIDAD'::character varying, 'PESO_VOLUMEN'::character varying])::text[]))),
    CONSTRAINT trs_costos_adicionales_compra_monto_base_check CHECK ((monto_base >= (0)::numeric)),
    CONSTRAINT trs_costos_adicionales_compra_monto_moneda_check CHECK ((monto_moneda >= (0)::numeric)),
    CONSTRAINT trs_costos_adicionales_compra_tipo_cambio_aplicado_check CHECK ((tipo_cambio_aplicado > (0)::numeric))
);

CREATE SEQUENCE inventario.trs_costos_adicionales_compra_id_costo_adicional_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_diferencias_inventario_detalle (
    id_diferencia_det bigint NOT NULL,
    id_inventario_fisico bigint CONSTRAINT trs_diferencias_inventario_detall_id_inventario_fisico_not_null NOT NULL,
    id_articulo bigint NOT NULL,
    stock_sistema_corte numeric(18,4) NOT NULL,
    cantidad_contada_final numeric(18,4) CONSTRAINT trs_diferencias_inventario_deta_cantidad_contada_final_not_null NOT NULL,
    diferencia_cantidad numeric(18,4) NOT NULL,
    costo_promedio_vigente numeric(18,6) CONSTRAINT trs_diferencias_inventario_deta_costo_promedio_vigente_not_null NOT NULL,
    diferencia_valorizada numeric(18,4) CONSTRAINT trs_diferencias_inventario_detal_diferencia_valorizada_not_null NOT NULL,
    ajustar_diferencia boolean DEFAULT true NOT NULL,
    CONSTRAINT trs_diferencias_inventario_detalle_cantidad_contada_final_check CHECK ((cantidad_contada_final >= (0)::numeric)),
    CONSTRAINT trs_diferencias_inventario_detalle_costo_promedio_vigente_check CHECK ((costo_promedio_vigente >= (0)::numeric))
);

CREATE SEQUENCE inventario.trs_diferencias_inventario_detalle_id_diferencia_det_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_inventarios_fisicos (
    id_inventario_fisico bigint NOT NULL,
    codigo_toma character varying(30) NOT NULL,
    id_almacen integer NOT NULL,
    id_periodo bigint,
    fecha_corte timestamp with time zone NOT NULL,
    responsable character varying(100) NOT NULL,
    estado character varying(15) DEFAULT 'BORRADOR'::character varying NOT NULL,
    observaciones character varying(400),
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL,
    fecha_aprobacion timestamp with time zone,
    usuario_aprobacion character varying(60),
    CONSTRAINT trs_inventarios_fisicos_estado_check CHECK (((estado)::text = ANY ((ARRAY['BORRADOR'::character varying, 'EN_CONTEO'::character varying, 'CONCILIADO'::character varying, 'APROBADO'::character varying, 'AJUSTADO'::character varying, 'ANULADO'::character varying])::text[])))
);

CREATE SEQUENCE inventario.trs_inventarios_fisicos_id_inventario_fisico_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_kardex_movimientos (
    id_kardex bigint NOT NULL,
    id_almacen integer NOT NULL,
    id_articulo bigint NOT NULL,
    id_movimiento bigint NOT NULL,
    id_movimiento_det bigint NOT NULL,
    id_tipo_movimiento integer NOT NULL,
    fecha_movimiento timestamp with time zone NOT NULL,
    orden_cronologico bigint NOT NULL,
    cantidad_entrada numeric(18,4) DEFAULT 0 NOT NULL,
    cantidad_salida numeric(18,4) DEFAULT 0 NOT NULL,
    costo_unitario_mov numeric(18,6) DEFAULT 0 NOT NULL,
    costo_total_mov numeric(18,4) DEFAULT 0 NOT NULL,
    saldo_cantidad numeric(18,4) DEFAULT 0 NOT NULL,
    costo_promedio_nuevo numeric(18,6) DEFAULT 0 NOT NULL,
    saldo_valorizado numeric(18,4) DEFAULT 0 NOT NULL,
    anulado boolean DEFAULT false NOT NULL,
    fecha_registro timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_entrada_o_salida CHECK ((NOT ((cantidad_entrada > (0)::numeric) AND (cantidad_salida > (0)::numeric)))),
    CONSTRAINT trs_kardex_movimientos_cantidad_entrada_check CHECK ((cantidad_entrada >= (0)::numeric)),
    CONSTRAINT trs_kardex_movimientos_cantidad_salida_check CHECK ((cantidad_salida >= (0)::numeric)),
    CONSTRAINT trs_kardex_movimientos_costo_promedio_nuevo_check CHECK ((costo_promedio_nuevo >= (0)::numeric)),
    CONSTRAINT trs_kardex_movimientos_costo_unitario_mov_check CHECK ((costo_unitario_mov >= (0)::numeric))
);

CREATE SEQUENCE inventario.trs_kardex_movimientos_id_kardex_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_movimiento_documentos (
    id_mov_documento bigint NOT NULL,
    id_movimiento bigint NOT NULL,
    id_doc_referencia integer NOT NULL,
    serie_documento character varying(20),
    numero_documento character varying(40) NOT NULL,
    fecha_documento date
);

CREATE SEQUENCE inventario.trs_movimiento_documentos_id_mov_documento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_movimientos_cabecera (
    id_movimiento bigint NOT NULL,
    numero_movimiento character varying(30) NOT NULL,
    id_tipo_movimiento integer NOT NULL,
    id_almacen integer NOT NULL,
    id_periodo bigint,
    id_moneda integer NOT NULL,
    tipo_cambio_aplicado numeric(18,6) DEFAULT 1 NOT NULL,
    fecha_movimiento timestamp with time zone NOT NULL,
    id_proveedor bigint,
    id_cliente bigint,
    id_centro_costo integer,
    id_motivo_ajuste integer,
    observaciones character varying(400),
    estado character varying(15) DEFAULT 'REGISTRADO'::character varying NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL,
    fecha_anulacion timestamp with time zone,
    usuario_anulacion character varying(60),
    CONSTRAINT trs_movimientos_cabecera_estado_check CHECK (((estado)::text = ANY ((ARRAY['BORRADOR'::character varying, 'REGISTRADO'::character varying, 'ANULADO'::character varying])::text[]))),
    CONSTRAINT trs_movimientos_cabecera_tipo_cambio_aplicado_check CHECK ((tipo_cambio_aplicado > (0)::numeric))
);

CREATE SEQUENCE inventario.trs_movimientos_cabecera_id_movimiento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_movimientos_detalle (
    id_movimiento_det bigint NOT NULL,
    id_movimiento bigint NOT NULL,
    numero_linea integer NOT NULL,
    id_articulo bigint NOT NULL,
    id_unidad_medida integer NOT NULL,
    cantidad_ingresada numeric(18,4) NOT NULL,
    factor_conversion numeric(18,6) DEFAULT 1 NOT NULL,
    cantidad_base numeric(18,4) NOT NULL,
    precio_unit_moneda numeric(18,6) DEFAULT 0 NOT NULL,
    costo_unit_base numeric(18,6) DEFAULT 0 NOT NULL,
    subtotal_base numeric(18,4) DEFAULT 0 NOT NULL,
    CONSTRAINT trs_movimientos_detalle_cantidad_base_check CHECK ((cantidad_base > (0)::numeric)),
    CONSTRAINT trs_movimientos_detalle_cantidad_ingresada_check CHECK ((cantidad_ingresada > (0)::numeric)),
    CONSTRAINT trs_movimientos_detalle_costo_unit_base_check CHECK ((costo_unit_base >= (0)::numeric)),
    CONSTRAINT trs_movimientos_detalle_factor_conversion_check CHECK ((factor_conversion > (0)::numeric)),
    CONSTRAINT trs_movimientos_detalle_precio_unit_moneda_check CHECK ((precio_unit_moneda >= (0)::numeric)),
    CONSTRAINT trs_movimientos_detalle_subtotal_base_check CHECK ((subtotal_base >= (0)::numeric))
);

CREATE SEQUENCE inventario.trs_movimientos_detalle_id_movimiento_det_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_periodos_inventario (
    id_periodo bigint NOT NULL,
    codigo_periodo character varying(20) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    estado character varying(15) DEFAULT 'ABIERTO'::character varying NOT NULL,
    fecha_cierre timestamp with time zone,
    usuario_cierre character varying(60),
    CONSTRAINT chk_rango_fechas_periodo CHECK ((fecha_fin >= fecha_inicio)),
    CONSTRAINT trs_periodos_inventario_estado_check CHECK (((estado)::text = ANY ((ARRAY['ABIERTO'::character varying, 'EN_CIERRE'::character varying, 'CERRADO'::character varying])::text[])))
);

CREATE SEQUENCE inventario.trs_periodos_inventario_id_periodo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_recalculo_costos_log (
    id_recalculo bigint NOT NULL,
    id_almacen integer NOT NULL,
    id_articulo bigint,
    fecha_desde timestamp with time zone NOT NULL,
    motivo character varying(300) NOT NULL,
    registros_afectados integer DEFAULT 0 NOT NULL,
    estado character varying(15) DEFAULT 'COMPLETADO'::character varying NOT NULL,
    fecha_ejecucion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_ejecucion character varying(60) NOT NULL,
    CONSTRAINT trs_recalculo_costos_log_estado_check CHECK (((estado)::text = ANY ((ARRAY['EN_PROCESO'::character varying, 'COMPLETADO'::character varying, 'ERROR'::character varying])::text[])))
);

CREATE SEQUENCE inventario.trs_recalculo_costos_log_id_recalculo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_tipos_cambio (
    id_tipo_cambio bigint NOT NULL,
    id_moneda_origen integer NOT NULL,
    id_moneda_destino integer NOT NULL,
    fecha_vigencia date NOT NULL,
    valor_compra numeric(18,6) NOT NULL,
    valor_venta numeric(18,6) NOT NULL,
    valor_contable numeric(18,6) NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL,
    CONSTRAINT chk_monedas_distintas_tc CHECK ((id_moneda_origen <> id_moneda_destino)),
    CONSTRAINT trs_tipos_cambio_valor_compra_check CHECK ((valor_compra > (0)::numeric)),
    CONSTRAINT trs_tipos_cambio_valor_contable_check CHECK ((valor_contable > (0)::numeric)),
    CONSTRAINT trs_tipos_cambio_valor_venta_check CHECK ((valor_venta > (0)::numeric))
);

CREATE SEQUENCE inventario.trs_tipos_cambio_id_tipo_cambio_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_transferencia_detalle (
    id_transferencia_det bigint NOT NULL,
    id_transferencia bigint NOT NULL,
    id_articulo bigint NOT NULL,
    cantidad_enviada numeric(18,4) NOT NULL,
    cantidad_recibida numeric(18,4) DEFAULT 0 NOT NULL,
    costo_unit_traslado numeric(18,6) DEFAULT 0 NOT NULL,
    CONSTRAINT trs_transferencia_detalle_cantidad_enviada_check CHECK ((cantidad_enviada > (0)::numeric)),
    CONSTRAINT trs_transferencia_detalle_cantidad_recibida_check CHECK ((cantidad_recibida >= (0)::numeric)),
    CONSTRAINT trs_transferencia_detalle_costo_unit_traslado_check CHECK ((costo_unit_traslado >= (0)::numeric))
);

CREATE SEQUENCE inventario.trs_transferencia_detalle_id_transferencia_det_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE inventario.trs_transferencias_almacen (
    id_transferencia bigint NOT NULL,
    numero_transferencia character varying(30) NOT NULL,
    id_almacen_origen integer NOT NULL,
    id_almacen_destino integer NOT NULL,
    fecha_envio timestamp with time zone NOT NULL,
    fecha_recepcion timestamp with time zone,
    id_mov_salida bigint,
    id_mov_entrada bigint,
    estado character varying(15) DEFAULT 'EN_TRANSITO'::character varying NOT NULL,
    observaciones character varying(400),
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario_creacion character varying(60) NOT NULL,
    CONSTRAINT chk_almacenes_distintos CHECK ((id_almacen_origen <> id_almacen_destino)),
    CONSTRAINT trs_transferencias_almacen_estado_check CHECK (((estado)::text = ANY ((ARRAY['BORRADOR'::character varying, 'EN_TRANSITO'::character varying, 'RECIBIDA'::character varying, 'ANULADA'::character varying])::text[])))
);

CREATE SEQUENCE inventario.trs_transferencias_almacen_id_transferencia_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE VIEW inventario.vw_inventario_valorado AS
 SELECT a.id_almacen,
    alm.codigo AS codigo_almacen,
    alm.nombre AS nombre_almacen,
    art.id_articulo,
    art.codigo_sku,
    art.descripcion AS nombre_articulo,
    cat.nombre AS categoria,
    um.abreviatura AS unidad_base,
    a.stock_actual,
    a.costo_promedio_alm AS costo_promedio,
    round((a.stock_actual * a.costo_promedio_alm), 4) AS valor_inventario
   FROM ((((inventario.mae_existencias_almacen a
     JOIN inventario.mae_almacenes alm ON ((alm.id_almacen = a.id_almacen)))
     JOIN inventario.mae_articulos art ON ((art.id_articulo = a.id_articulo)))
     JOIN inventario.mae_unidades_medida um ON ((um.id_unidad_medida = art.id_unidad_base)))
     LEFT JOIN inventario.mae_categorias_articulo cat ON ((cat.id_categoria = art.id_categoria)));

CREATE VIEW inventario.vw_utilidad_bruta_articulo AS
 SELECT mc.id_almacen,
    alm.nombre AS nombre_almacen,
    art.id_articulo,
    art.codigo_sku,
    art.descripcion AS nombre_articulo,
    date_trunc('month'::text, mc.fecha_movimiento) AS mes_operacion,
    sum(md.cantidad_base) AS unidades_vendidas,
    sum(((md.cantidad_base * md.precio_unit_moneda) * mc.tipo_cambio_aplicado)) AS ingreso_ventas_base,
    sum((k.cantidad_salida * k.costo_unitario_mov)) AS costo_ventas_cpp,
    (sum(((md.cantidad_base * md.precio_unit_moneda) * mc.tipo_cambio_aplicado)) - sum((k.cantidad_salida * k.costo_unitario_mov))) AS utilidad_bruta,
        CASE
            WHEN (sum(((md.cantidad_base * md.precio_unit_moneda) * mc.tipo_cambio_aplicado)) > (0)::numeric) THEN round((((sum(((md.cantidad_base * md.precio_unit_moneda) * mc.tipo_cambio_aplicado)) - sum((k.cantidad_salida * k.costo_unitario_mov))) / sum(((md.cantidad_base * md.precio_unit_moneda) * mc.tipo_cambio_aplicado))) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS margen_bruto_pct
   FROM (((((inventario.trs_movimientos_detalle md
     JOIN inventario.trs_movimientos_cabecera mc ON ((mc.id_movimiento = md.id_movimiento)))
     JOIN inventario.mae_tipos_movimiento tm ON ((tm.id_tipo_movimiento = mc.id_tipo_movimiento)))
     JOIN inventario.mae_almacenes alm ON ((alm.id_almacen = mc.id_almacen)))
     JOIN inventario.mae_articulos art ON ((art.id_articulo = md.id_articulo)))
     LEFT JOIN inventario.trs_kardex_movimientos k ON (((k.id_movimiento_det = md.id_movimiento_det) AND (k.anulado = false))))
  WHERE (((mc.estado)::text = 'REGISTRADO'::text) AND ((tm.codigo)::text = 'VENTA'::text))
  GROUP BY mc.id_almacen, alm.nombre, art.id_articulo, art.codigo_sku, art.descripcion, (date_trunc('month'::text, mc.fecha_movimiento));

ALTER TABLE ONLY inventario.mae_almacenes ALTER COLUMN id_almacen SET DEFAULT nextval('inventario.mae_almacenes_id_almacen_seq'::regclass);

ALTER TABLE ONLY inventario.mae_articulo_unidades ALTER COLUMN id_articulo_unidad SET DEFAULT nextval('inventario.mae_articulo_unidades_id_articulo_unidad_seq'::regclass);

ALTER TABLE ONLY inventario.mae_articulos ALTER COLUMN id_articulo SET DEFAULT nextval('inventario.mae_articulos_id_articulo_seq'::regclass);

ALTER TABLE ONLY inventario.mae_categorias_articulo ALTER COLUMN id_categoria SET DEFAULT nextval('inventario.mae_categorias_articulo_id_categoria_seq'::regclass);

ALTER TABLE ONLY inventario.mae_centros_costo ALTER COLUMN id_centro_costo SET DEFAULT nextval('inventario.mae_centros_costo_id_centro_costo_seq'::regclass);

ALTER TABLE ONLY inventario.mae_clientes ALTER COLUMN id_cliente SET DEFAULT nextval('inventario.mae_clientes_id_cliente_seq'::regclass);

ALTER TABLE ONLY inventario.mae_conceptos_costo_adicional ALTER COLUMN id_concepto_costo SET DEFAULT nextval('inventario.mae_conceptos_costo_adicional_id_concepto_costo_seq'::regclass);

ALTER TABLE ONLY inventario.mae_documentos_referencia ALTER COLUMN id_doc_referencia SET DEFAULT nextval('inventario.mae_documentos_referencia_id_doc_referencia_seq'::regclass);

ALTER TABLE ONLY inventario.mae_existencias_almacen ALTER COLUMN id_existencia_alm SET DEFAULT nextval('inventario.mae_existencias_almacen_id_existencia_alm_seq'::regclass);

ALTER TABLE ONLY inventario.mae_marcas ALTER COLUMN id_marca SET DEFAULT nextval('inventario.mae_marcas_id_marca_seq'::regclass);

ALTER TABLE ONLY inventario.mae_monedas ALTER COLUMN id_moneda SET DEFAULT nextval('inventario.mae_monedas_id_moneda_seq'::regclass);

ALTER TABLE ONLY inventario.mae_motivos_ajuste ALTER COLUMN id_motivo_ajuste SET DEFAULT nextval('inventario.mae_motivos_ajuste_id_motivo_ajuste_seq'::regclass);

ALTER TABLE ONLY inventario.mae_parametros_inventario ALTER COLUMN id_parametro SET DEFAULT nextval('inventario.mae_parametros_inventario_id_parametro_seq'::regclass);

ALTER TABLE ONLY inventario.mae_proveedores ALTER COLUMN id_proveedor SET DEFAULT nextval('inventario.mae_proveedores_id_proveedor_seq'::regclass);

ALTER TABLE ONLY inventario.mae_tipos_movimiento ALTER COLUMN id_tipo_movimiento SET DEFAULT nextval('inventario.mae_tipos_movimiento_id_tipo_movimiento_seq'::regclass);

ALTER TABLE ONLY inventario.mae_unidades_medida ALTER COLUMN id_unidad_medida SET DEFAULT nextval('inventario.mae_unidades_medida_id_unidad_medida_seq'::regclass);

ALTER TABLE ONLY inventario.trs_ajustes_inventario ALTER COLUMN id_ajuste_inventario SET DEFAULT nextval('inventario.trs_ajustes_inventario_id_ajuste_inventario_seq'::regclass);

ALTER TABLE ONLY inventario.trs_auditoria_log ALTER COLUMN id_auditoria SET DEFAULT nextval('inventario.trs_auditoria_log_id_auditoria_seq'::regclass);

ALTER TABLE ONLY inventario.trs_cierre_inventario_detalle ALTER COLUMN id_cierre_detalle SET DEFAULT nextval('inventario.trs_cierre_inventario_detalle_id_cierre_detalle_seq'::regclass);

ALTER TABLE ONLY inventario.trs_conteo_fisico_registros ALTER COLUMN id_conteo_registro SET DEFAULT nextval('inventario.trs_conteo_fisico_registros_id_conteo_registro_seq'::regclass);

ALTER TABLE ONLY inventario.trs_costos_adicionales_compra ALTER COLUMN id_costo_adicional SET DEFAULT nextval('inventario.trs_costos_adicionales_compra_id_costo_adicional_seq'::regclass);

ALTER TABLE ONLY inventario.trs_diferencias_inventario_detalle ALTER COLUMN id_diferencia_det SET DEFAULT nextval('inventario.trs_diferencias_inventario_detalle_id_diferencia_det_seq'::regclass);

ALTER TABLE ONLY inventario.trs_inventarios_fisicos ALTER COLUMN id_inventario_fisico SET DEFAULT nextval('inventario.trs_inventarios_fisicos_id_inventario_fisico_seq'::regclass);

ALTER TABLE ONLY inventario.trs_kardex_movimientos ALTER COLUMN id_kardex SET DEFAULT nextval('inventario.trs_kardex_movimientos_id_kardex_seq'::regclass);

ALTER TABLE ONLY inventario.trs_movimiento_documentos ALTER COLUMN id_mov_documento SET DEFAULT nextval('inventario.trs_movimiento_documentos_id_mov_documento_seq'::regclass);

ALTER TABLE ONLY inventario.trs_movimientos_cabecera ALTER COLUMN id_movimiento SET DEFAULT nextval('inventario.trs_movimientos_cabecera_id_movimiento_seq'::regclass);

ALTER TABLE ONLY inventario.trs_movimientos_detalle ALTER COLUMN id_movimiento_det SET DEFAULT nextval('inventario.trs_movimientos_detalle_id_movimiento_det_seq'::regclass);

ALTER TABLE ONLY inventario.trs_periodos_inventario ALTER COLUMN id_periodo SET DEFAULT nextval('inventario.trs_periodos_inventario_id_periodo_seq'::regclass);

ALTER TABLE ONLY inventario.trs_recalculo_costos_log ALTER COLUMN id_recalculo SET DEFAULT nextval('inventario.trs_recalculo_costos_log_id_recalculo_seq'::regclass);

ALTER TABLE ONLY inventario.trs_tipos_cambio ALTER COLUMN id_tipo_cambio SET DEFAULT nextval('inventario.trs_tipos_cambio_id_tipo_cambio_seq'::regclass);

ALTER TABLE ONLY inventario.trs_transferencia_detalle ALTER COLUMN id_transferencia_det SET DEFAULT nextval('inventario.trs_transferencia_detalle_id_transferencia_det_seq'::regclass);

ALTER TABLE ONLY inventario.trs_transferencias_almacen ALTER COLUMN id_transferencia SET DEFAULT nextval('inventario.trs_transferencias_almacen_id_transferencia_seq'::regclass);

ALTER TABLE ONLY inventario.mae_almacenes
    ADD CONSTRAINT mae_almacenes_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY inventario.mae_almacenes
    ADD CONSTRAINT mae_almacenes_pkey PRIMARY KEY (id_almacen);

ALTER TABLE ONLY inventario.mae_articulo_unidades
    ADD CONSTRAINT mae_articulo_unidades_pkey PRIMARY KEY (id_articulo_unidad);

ALTER TABLE ONLY inventario.mae_articulos
    ADD CONSTRAINT mae_articulos_codigo_sku_key UNIQUE (codigo_sku);

ALTER TABLE ONLY inventario.mae_articulos
    ADD CONSTRAINT mae_articulos_pkey PRIMARY KEY (id_articulo);

ALTER TABLE ONLY inventario.mae_categorias_articulo
    ADD CONSTRAINT mae_categorias_articulo_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY inventario.mae_categorias_articulo
    ADD CONSTRAINT mae_categorias_articulo_pkey PRIMARY KEY (id_categoria);

ALTER TABLE ONLY inventario.mae_centros_costo
    ADD CONSTRAINT mae_centros_costo_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY inventario.mae_centros_costo
    ADD CONSTRAINT mae_centros_costo_pkey PRIMARY KEY (id_centro_costo);

ALTER TABLE ONLY inventario.mae_clientes
    ADD CONSTRAINT mae_clientes_numero_documento_key UNIQUE (numero_documento);

ALTER TABLE ONLY inventario.mae_clientes
    ADD CONSTRAINT mae_clientes_pkey PRIMARY KEY (id_cliente);

ALTER TABLE ONLY inventario.mae_conceptos_costo_adicional
    ADD CONSTRAINT mae_conceptos_costo_adicional_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY inventario.mae_conceptos_costo_adicional
    ADD CONSTRAINT mae_conceptos_costo_adicional_pkey PRIMARY KEY (id_concepto_costo);

ALTER TABLE ONLY inventario.mae_documentos_referencia
    ADD CONSTRAINT mae_documentos_referencia_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY inventario.mae_documentos_referencia
    ADD CONSTRAINT mae_documentos_referencia_pkey PRIMARY KEY (id_doc_referencia);

ALTER TABLE ONLY inventario.mae_existencias_almacen
    ADD CONSTRAINT mae_existencias_almacen_pkey PRIMARY KEY (id_existencia_alm);

ALTER TABLE ONLY inventario.mae_marcas
    ADD CONSTRAINT mae_marcas_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY inventario.mae_marcas
    ADD CONSTRAINT mae_marcas_pkey PRIMARY KEY (id_marca);

ALTER TABLE ONLY inventario.mae_monedas
    ADD CONSTRAINT mae_monedas_codigo_iso_key UNIQUE (codigo_iso);

ALTER TABLE ONLY inventario.mae_monedas
    ADD CONSTRAINT mae_monedas_pkey PRIMARY KEY (id_moneda);

ALTER TABLE ONLY inventario.mae_motivos_ajuste
    ADD CONSTRAINT mae_motivos_ajuste_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY inventario.mae_motivos_ajuste
    ADD CONSTRAINT mae_motivos_ajuste_pkey PRIMARY KEY (id_motivo_ajuste);

ALTER TABLE ONLY inventario.mae_parametros_inventario
    ADD CONSTRAINT mae_parametros_inventario_clave_key UNIQUE (clave);

ALTER TABLE ONLY inventario.mae_parametros_inventario
    ADD CONSTRAINT mae_parametros_inventario_pkey PRIMARY KEY (id_parametro);

ALTER TABLE ONLY inventario.mae_proveedores
    ADD CONSTRAINT mae_proveedores_numero_documento_key UNIQUE (numero_documento);

ALTER TABLE ONLY inventario.mae_proveedores
    ADD CONSTRAINT mae_proveedores_pkey PRIMARY KEY (id_proveedor);

ALTER TABLE ONLY inventario.mae_tipos_movimiento
    ADD CONSTRAINT mae_tipos_movimiento_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY inventario.mae_tipos_movimiento
    ADD CONSTRAINT mae_tipos_movimiento_pkey PRIMARY KEY (id_tipo_movimiento);

ALTER TABLE ONLY inventario.mae_unidades_medida
    ADD CONSTRAINT mae_unidades_medida_codigo_key UNIQUE (codigo);

ALTER TABLE ONLY inventario.mae_unidades_medida
    ADD CONSTRAINT mae_unidades_medida_pkey PRIMARY KEY (id_unidad_medida);

ALTER TABLE ONLY inventario.trs_ajustes_inventario
    ADD CONSTRAINT trs_ajustes_inventario_id_movimiento_ajuste_key UNIQUE (id_movimiento_ajuste);

ALTER TABLE ONLY inventario.trs_ajustes_inventario
    ADD CONSTRAINT trs_ajustes_inventario_pkey PRIMARY KEY (id_ajuste_inventario);

ALTER TABLE ONLY inventario.trs_auditoria_log
    ADD CONSTRAINT trs_auditoria_log_pkey PRIMARY KEY (id_auditoria);

ALTER TABLE ONLY inventario.trs_cierre_inventario_detalle
    ADD CONSTRAINT trs_cierre_inventario_detalle_pkey PRIMARY KEY (id_cierre_detalle);

ALTER TABLE ONLY inventario.trs_conteo_fisico_registros
    ADD CONSTRAINT trs_conteo_fisico_registros_pkey PRIMARY KEY (id_conteo_registro);

ALTER TABLE ONLY inventario.trs_costos_adicionales_compra
    ADD CONSTRAINT trs_costos_adicionales_compra_pkey PRIMARY KEY (id_costo_adicional);

ALTER TABLE ONLY inventario.trs_diferencias_inventario_detalle
    ADD CONSTRAINT trs_diferencias_inventario_detalle_pkey PRIMARY KEY (id_diferencia_det);

ALTER TABLE ONLY inventario.trs_inventarios_fisicos
    ADD CONSTRAINT trs_inventarios_fisicos_codigo_toma_key UNIQUE (codigo_toma);

ALTER TABLE ONLY inventario.trs_inventarios_fisicos
    ADD CONSTRAINT trs_inventarios_fisicos_pkey PRIMARY KEY (id_inventario_fisico);

ALTER TABLE ONLY inventario.trs_kardex_movimientos
    ADD CONSTRAINT trs_kardex_movimientos_pkey PRIMARY KEY (id_kardex);

ALTER TABLE ONLY inventario.trs_movimiento_documentos
    ADD CONSTRAINT trs_movimiento_documentos_pkey PRIMARY KEY (id_mov_documento);

ALTER TABLE ONLY inventario.trs_movimientos_cabecera
    ADD CONSTRAINT trs_movimientos_cabecera_numero_movimiento_key UNIQUE (numero_movimiento);

ALTER TABLE ONLY inventario.trs_movimientos_cabecera
    ADD CONSTRAINT trs_movimientos_cabecera_pkey PRIMARY KEY (id_movimiento);

ALTER TABLE ONLY inventario.trs_movimientos_detalle
    ADD CONSTRAINT trs_movimientos_detalle_pkey PRIMARY KEY (id_movimiento_det);

ALTER TABLE ONLY inventario.trs_periodos_inventario
    ADD CONSTRAINT trs_periodos_inventario_codigo_periodo_key UNIQUE (codigo_periodo);

ALTER TABLE ONLY inventario.trs_periodos_inventario
    ADD CONSTRAINT trs_periodos_inventario_pkey PRIMARY KEY (id_periodo);

ALTER TABLE ONLY inventario.trs_recalculo_costos_log
    ADD CONSTRAINT trs_recalculo_costos_log_pkey PRIMARY KEY (id_recalculo);

ALTER TABLE ONLY inventario.trs_tipos_cambio
    ADD CONSTRAINT trs_tipos_cambio_pkey PRIMARY KEY (id_tipo_cambio);

ALTER TABLE ONLY inventario.trs_transferencia_detalle
    ADD CONSTRAINT trs_transferencia_detalle_pkey PRIMARY KEY (id_transferencia_det);

ALTER TABLE ONLY inventario.trs_transferencias_almacen
    ADD CONSTRAINT trs_transferencias_almacen_numero_transferencia_key UNIQUE (numero_transferencia);

ALTER TABLE ONLY inventario.trs_transferencias_almacen
    ADD CONSTRAINT trs_transferencias_almacen_pkey PRIMARY KEY (id_transferencia);

ALTER TABLE ONLY inventario.mae_articulo_unidades
    ADD CONSTRAINT uq_articulo_unidad UNIQUE (id_articulo, id_unidad_medida);

ALTER TABLE ONLY inventario.trs_cierre_inventario_detalle
    ADD CONSTRAINT uq_cierre_alm_art UNIQUE (id_periodo, id_almacen, id_articulo);

ALTER TABLE ONLY inventario.trs_diferencias_inventario_detalle
    ADD CONSTRAINT uq_dif_inv_articulo UNIQUE (id_inventario_fisico, id_articulo);

ALTER TABLE ONLY inventario.mae_existencias_almacen
    ADD CONSTRAINT uq_existencia_almacen_articulo UNIQUE (id_almacen, id_articulo);

ALTER TABLE ONLY inventario.trs_movimientos_detalle
    ADD CONSTRAINT uq_mov_detalle_linea UNIQUE (id_movimiento, numero_linea);

ALTER TABLE ONLY inventario.trs_tipos_cambio
    ADD CONSTRAINT uq_tc_fecha UNIQUE (id_moneda_origen, id_moneda_destino, fecha_vigencia);

ALTER TABLE ONLY inventario.trs_transferencia_detalle
    ADD CONSTRAINT uq_transf_articulo UNIQUE (id_transferencia, id_articulo);

ALTER TABLE ONLY inventario.mae_articulo_unidades
    ADD CONSTRAINT mae_articulo_unidades_id_articulo_fkey FOREIGN KEY (id_articulo) REFERENCES inventario.mae_articulos(id_articulo);

ALTER TABLE ONLY inventario.mae_articulo_unidades
    ADD CONSTRAINT mae_articulo_unidades_id_unidad_medida_fkey FOREIGN KEY (id_unidad_medida) REFERENCES inventario.mae_unidades_medida(id_unidad_medida);

ALTER TABLE ONLY inventario.mae_articulos
    ADD CONSTRAINT mae_articulos_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES inventario.mae_categorias_articulo(id_categoria);

ALTER TABLE ONLY inventario.mae_articulos
    ADD CONSTRAINT mae_articulos_id_marca_fkey FOREIGN KEY (id_marca) REFERENCES inventario.mae_marcas(id_marca);

ALTER TABLE ONLY inventario.mae_articulos
    ADD CONSTRAINT mae_articulos_id_unidad_base_fkey FOREIGN KEY (id_unidad_base) REFERENCES inventario.mae_unidades_medida(id_unidad_medida);

ALTER TABLE ONLY inventario.mae_categorias_articulo
    ADD CONSTRAINT mae_categorias_articulo_id_categoria_padre_fkey FOREIGN KEY (id_categoria_padre) REFERENCES inventario.mae_categorias_articulo(id_categoria);

ALTER TABLE ONLY inventario.mae_existencias_almacen
    ADD CONSTRAINT mae_existencias_almacen_id_almacen_fkey FOREIGN KEY (id_almacen) REFERENCES inventario.mae_almacenes(id_almacen);

ALTER TABLE ONLY inventario.mae_existencias_almacen
    ADD CONSTRAINT mae_existencias_almacen_id_articulo_fkey FOREIGN KEY (id_articulo) REFERENCES inventario.mae_articulos(id_articulo);

ALTER TABLE ONLY inventario.trs_ajustes_inventario
    ADD CONSTRAINT trs_ajustes_inventario_id_inventario_fisico_fkey FOREIGN KEY (id_inventario_fisico) REFERENCES inventario.trs_inventarios_fisicos(id_inventario_fisico);

ALTER TABLE ONLY inventario.trs_ajustes_inventario
    ADD CONSTRAINT trs_ajustes_inventario_id_movimiento_ajuste_fkey FOREIGN KEY (id_movimiento_ajuste) REFERENCES inventario.trs_movimientos_cabecera(id_movimiento);

ALTER TABLE ONLY inventario.trs_cierre_inventario_detalle
    ADD CONSTRAINT trs_cierre_inventario_detalle_id_almacen_fkey FOREIGN KEY (id_almacen) REFERENCES inventario.mae_almacenes(id_almacen);

ALTER TABLE ONLY inventario.trs_cierre_inventario_detalle
    ADD CONSTRAINT trs_cierre_inventario_detalle_id_articulo_fkey FOREIGN KEY (id_articulo) REFERENCES inventario.mae_articulos(id_articulo);

ALTER TABLE ONLY inventario.trs_cierre_inventario_detalle
    ADD CONSTRAINT trs_cierre_inventario_detalle_id_periodo_fkey FOREIGN KEY (id_periodo) REFERENCES inventario.trs_periodos_inventario(id_periodo);

ALTER TABLE ONLY inventario.trs_conteo_fisico_registros
    ADD CONSTRAINT trs_conteo_fisico_registros_id_articulo_fkey FOREIGN KEY (id_articulo) REFERENCES inventario.mae_articulos(id_articulo);

ALTER TABLE ONLY inventario.trs_conteo_fisico_registros
    ADD CONSTRAINT trs_conteo_fisico_registros_id_inventario_fisico_fkey FOREIGN KEY (id_inventario_fisico) REFERENCES inventario.trs_inventarios_fisicos(id_inventario_fisico) ON DELETE CASCADE;

ALTER TABLE ONLY inventario.trs_costos_adicionales_compra
    ADD CONSTRAINT trs_costos_adicionales_compra_id_concepto_costo_fkey FOREIGN KEY (id_concepto_costo) REFERENCES inventario.mae_conceptos_costo_adicional(id_concepto_costo);

ALTER TABLE ONLY inventario.trs_costos_adicionales_compra
    ADD CONSTRAINT trs_costos_adicionales_compra_id_moneda_fkey FOREIGN KEY (id_moneda) REFERENCES inventario.mae_monedas(id_moneda);

ALTER TABLE ONLY inventario.trs_costos_adicionales_compra
    ADD CONSTRAINT trs_costos_adicionales_compra_id_movimiento_fkey FOREIGN KEY (id_movimiento) REFERENCES inventario.trs_movimientos_cabecera(id_movimiento);

ALTER TABLE ONLY inventario.trs_diferencias_inventario_detalle
    ADD CONSTRAINT trs_diferencias_inventario_detalle_id_articulo_fkey FOREIGN KEY (id_articulo) REFERENCES inventario.mae_articulos(id_articulo);

ALTER TABLE ONLY inventario.trs_diferencias_inventario_detalle
    ADD CONSTRAINT trs_diferencias_inventario_detalle_id_inventario_fisico_fkey FOREIGN KEY (id_inventario_fisico) REFERENCES inventario.trs_inventarios_fisicos(id_inventario_fisico) ON DELETE CASCADE;

ALTER TABLE ONLY inventario.trs_inventarios_fisicos
    ADD CONSTRAINT trs_inventarios_fisicos_id_almacen_fkey FOREIGN KEY (id_almacen) REFERENCES inventario.mae_almacenes(id_almacen);

ALTER TABLE ONLY inventario.trs_inventarios_fisicos
    ADD CONSTRAINT trs_inventarios_fisicos_id_periodo_fkey FOREIGN KEY (id_periodo) REFERENCES inventario.trs_periodos_inventario(id_periodo);

ALTER TABLE ONLY inventario.trs_kardex_movimientos
    ADD CONSTRAINT trs_kardex_movimientos_id_almacen_fkey FOREIGN KEY (id_almacen) REFERENCES inventario.mae_almacenes(id_almacen);

ALTER TABLE ONLY inventario.trs_kardex_movimientos
    ADD CONSTRAINT trs_kardex_movimientos_id_articulo_fkey FOREIGN KEY (id_articulo) REFERENCES inventario.mae_articulos(id_articulo);

ALTER TABLE ONLY inventario.trs_kardex_movimientos
    ADD CONSTRAINT trs_kardex_movimientos_id_movimiento_det_fkey FOREIGN KEY (id_movimiento_det) REFERENCES inventario.trs_movimientos_detalle(id_movimiento_det);

ALTER TABLE ONLY inventario.trs_kardex_movimientos
    ADD CONSTRAINT trs_kardex_movimientos_id_movimiento_fkey FOREIGN KEY (id_movimiento) REFERENCES inventario.trs_movimientos_cabecera(id_movimiento);

ALTER TABLE ONLY inventario.trs_kardex_movimientos
    ADD CONSTRAINT trs_kardex_movimientos_id_tipo_movimiento_fkey FOREIGN KEY (id_tipo_movimiento) REFERENCES inventario.mae_tipos_movimiento(id_tipo_movimiento);

ALTER TABLE ONLY inventario.trs_movimiento_documentos
    ADD CONSTRAINT trs_movimiento_documentos_id_doc_referencia_fkey FOREIGN KEY (id_doc_referencia) REFERENCES inventario.mae_documentos_referencia(id_doc_referencia);

ALTER TABLE ONLY inventario.trs_movimiento_documentos
    ADD CONSTRAINT trs_movimiento_documentos_id_movimiento_fkey FOREIGN KEY (id_movimiento) REFERENCES inventario.trs_movimientos_cabecera(id_movimiento) ON DELETE CASCADE;

ALTER TABLE ONLY inventario.trs_movimientos_cabecera
    ADD CONSTRAINT trs_movimientos_cabecera_id_almacen_fkey FOREIGN KEY (id_almacen) REFERENCES inventario.mae_almacenes(id_almacen);

ALTER TABLE ONLY inventario.trs_movimientos_cabecera
    ADD CONSTRAINT trs_movimientos_cabecera_id_centro_costo_fkey FOREIGN KEY (id_centro_costo) REFERENCES inventario.mae_centros_costo(id_centro_costo);

ALTER TABLE ONLY inventario.trs_movimientos_cabecera
    ADD CONSTRAINT trs_movimientos_cabecera_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES inventario.mae_clientes(id_cliente);

ALTER TABLE ONLY inventario.trs_movimientos_cabecera
    ADD CONSTRAINT trs_movimientos_cabecera_id_moneda_fkey FOREIGN KEY (id_moneda) REFERENCES inventario.mae_monedas(id_moneda);

ALTER TABLE ONLY inventario.trs_movimientos_cabecera
    ADD CONSTRAINT trs_movimientos_cabecera_id_motivo_ajuste_fkey FOREIGN KEY (id_motivo_ajuste) REFERENCES inventario.mae_motivos_ajuste(id_motivo_ajuste);

ALTER TABLE ONLY inventario.trs_movimientos_cabecera
    ADD CONSTRAINT trs_movimientos_cabecera_id_periodo_fkey FOREIGN KEY (id_periodo) REFERENCES inventario.trs_periodos_inventario(id_periodo);

ALTER TABLE ONLY inventario.trs_movimientos_cabecera
    ADD CONSTRAINT trs_movimientos_cabecera_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES inventario.mae_proveedores(id_proveedor);

ALTER TABLE ONLY inventario.trs_movimientos_cabecera
    ADD CONSTRAINT trs_movimientos_cabecera_id_tipo_movimiento_fkey FOREIGN KEY (id_tipo_movimiento) REFERENCES inventario.mae_tipos_movimiento(id_tipo_movimiento);

ALTER TABLE ONLY inventario.trs_movimientos_detalle
    ADD CONSTRAINT trs_movimientos_detalle_id_articulo_fkey FOREIGN KEY (id_articulo) REFERENCES inventario.mae_articulos(id_articulo);

ALTER TABLE ONLY inventario.trs_movimientos_detalle
    ADD CONSTRAINT trs_movimientos_detalle_id_movimiento_fkey FOREIGN KEY (id_movimiento) REFERENCES inventario.trs_movimientos_cabecera(id_movimiento) ON DELETE CASCADE;

ALTER TABLE ONLY inventario.trs_movimientos_detalle
    ADD CONSTRAINT trs_movimientos_detalle_id_unidad_medida_fkey FOREIGN KEY (id_unidad_medida) REFERENCES inventario.mae_unidades_medida(id_unidad_medida);

ALTER TABLE ONLY inventario.trs_recalculo_costos_log
    ADD CONSTRAINT trs_recalculo_costos_log_id_almacen_fkey FOREIGN KEY (id_almacen) REFERENCES inventario.mae_almacenes(id_almacen);

ALTER TABLE ONLY inventario.trs_recalculo_costos_log
    ADD CONSTRAINT trs_recalculo_costos_log_id_articulo_fkey FOREIGN KEY (id_articulo) REFERENCES inventario.mae_articulos(id_articulo);

ALTER TABLE ONLY inventario.trs_tipos_cambio
    ADD CONSTRAINT trs_tipos_cambio_id_moneda_destino_fkey FOREIGN KEY (id_moneda_destino) REFERENCES inventario.mae_monedas(id_moneda);

ALTER TABLE ONLY inventario.trs_tipos_cambio
    ADD CONSTRAINT trs_tipos_cambio_id_moneda_origen_fkey FOREIGN KEY (id_moneda_origen) REFERENCES inventario.mae_monedas(id_moneda);

ALTER TABLE ONLY inventario.trs_transferencia_detalle
    ADD CONSTRAINT trs_transferencia_detalle_id_articulo_fkey FOREIGN KEY (id_articulo) REFERENCES inventario.mae_articulos(id_articulo);

ALTER TABLE ONLY inventario.trs_transferencia_detalle
    ADD CONSTRAINT trs_transferencia_detalle_id_transferencia_fkey FOREIGN KEY (id_transferencia) REFERENCES inventario.trs_transferencias_almacen(id_transferencia) ON DELETE CASCADE;

ALTER TABLE ONLY inventario.trs_transferencias_almacen
    ADD CONSTRAINT trs_transferencias_almacen_id_almacen_destino_fkey FOREIGN KEY (id_almacen_destino) REFERENCES inventario.mae_almacenes(id_almacen);

ALTER TABLE ONLY inventario.trs_transferencias_almacen
    ADD CONSTRAINT trs_transferencias_almacen_id_almacen_origen_fkey FOREIGN KEY (id_almacen_origen) REFERENCES inventario.mae_almacenes(id_almacen);

ALTER TABLE ONLY inventario.trs_transferencias_almacen
    ADD CONSTRAINT trs_transferencias_almacen_id_mov_entrada_fkey FOREIGN KEY (id_mov_entrada) REFERENCES inventario.trs_movimientos_cabecera(id_movimiento);

ALTER TABLE ONLY inventario.trs_transferencias_almacen
    ADD CONSTRAINT trs_transferencias_almacen_id_mov_salida_fkey FOREIGN KEY (id_mov_salida) REFERENCES inventario.trs_movimientos_cabecera(id_movimiento);
