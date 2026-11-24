INSERT INTO mae_unidades_medida (codigo,nombre,abreviatura,usuario_creacion)
VALUES ('PAQ','Paquete','paq','demo'),('BOL','Bolsa','bol','demo'),('M','Metro','m','demo'),
       ('ROL','Rollo','rollo','demo'),('LAT','Lata','lata','demo'),('PACK','Pack','pack','demo'),
       ('UND','Unidad','un','demo');

INSERT INTO mae_almacenes (codigo,nombre,ubicacion,es_principal,usuario_creacion)
VALUES ('T01','01 · Librería central','Escenario Tai Loy',true,'demo'),
       ('P02-A','02 · Librería almacén A','Escenario Panita',false,'demo'),
       ('P02-B','02 · Librería almacén B','Escenario Panita',false,'demo'),
       ('P03','03 · Depósito de obra','Escenario Promart',false,'demo'),
       ('S04','04 · Material eléctrico','Escenario Sodimac',false,'demo'),
       ('M05','05 · Abarrotes secos','Escenario Metro',false,'demo'),
       ('T06','06 · Almacén de conservas','Escenario Tottus',false,'demo'),
       ('H07','07 · Suministros de impresión','Escenario Hiraoka',false,'demo'),
       ('C08','08 · Accesorios electrónicos','Escenario Coolbox',false,'demo');

INSERT INTO mae_articulos (codigo_sku,descripcion,id_unidad_base,precio_venta_ref,usuario_creacion)
SELECT p.sku,p.descripcion,u.id_unidad_medida,p.precio,'demo'
FROM (VALUES
  ('PAP-001','Papel Report A4 75 g/m² · 500 hojas','PAQ',16.90),
  ('CON-001','Cemento Sol Portland Tipo I · 42.5 kg','BOL',35.90),
  ('ELE-001','Cable Indeco THW-90 2.5 mm² · amarillo/verde','M',4.50),
  ('ABA-001','Arroz Superior Costeño · bolsa de 5 kg','BOL',24.50),
  ('LAT-001','Leche Gloria Reconstituida Entera · 390 g','LAT',4.50),
  ('TIN-001','Tinta negra Epson T544 · pack de 2 botellas','PACK',86.90),
  ('PIL-001','Pilas alcalinas RadioShack AA · pack de 4','PACK',17.90)
) p(sku,descripcion,unidad,precio) JOIN mae_unidades_medida u ON u.codigo=p.unidad;

INSERT INTO mae_articulo_unidades (id_articulo,id_unidad_medida,factor_a_base,es_unidad_compra,es_unidad_venta)
SELECT a.id_articulo,u.id_unidad_medida,x.factor,true,true
FROM (VALUES ('ELE-001','ROL',100),('LAT-001','PACK',6)) x(sku,unidad,factor)
JOIN mae_articulos a ON a.codigo_sku=x.sku JOIN mae_unidades_medida u ON u.codigo=x.unidad;

INSERT INTO mae_monedas (codigo_iso,nombre,simbolo,es_moneda_base) VALUES ('PEN','Sol','S/',true);
INSERT INTO mae_proveedores (numero_documento,razon_social,usuario_creacion)
VALUES ('SIM-P01','Abastecedor ficticio A','demo'),('SIM-P02','Abastecedor ficticio B','demo');
INSERT INTO mae_clientes (numero_documento,nombre_razon_social,usuario_creacion)
VALUES ('SIM-C01','Cliente de demostración','demo');
INSERT INTO mae_centros_costo (codigo,nombre) VALUES ('SIM-ADM','Administración');
INSERT INTO mae_motivos_ajuste (codigo,nombre,signo_esperado)
VALUES ('SOBRANTE','Sobrante del conteo',1),('FALTANTE','Faltante del conteo',-1);
INSERT INTO mae_tipos_movimiento
(codigo,nombre,signo_stock,recalcula_cpp,requiere_proveedor,requiere_cliente,requiere_centro_costo)
VALUES ('COMPRA','Ingreso por compra',1,true,true,false,false),
       ('VENTA','Salida por venta',-1,false,false,true,false),
       ('CONSUMO','Salida por consumo',-1,false,false,false,true),
       ('AJUSTE_ENTRADA','Ajuste por sobrante',1,false,false,false,false),
       ('AJUSTE_SALIDA','Ajuste por faltante',-1,false,false,false,false);

INSERT INTO app_escenarios
SELECT d.caso,d.empresa,d.url,d.precio,a.id_articulo,b.id_almacen,s.id_almacen,d.objetivo
FROM (VALUES
 ('01','Tai Loy','https://www.tailoy.com.pe/papel-fotocopia-report-75gr-a-4-pack-x-500-619.html',12.50,'PAP-001','T01',NULL,'Costo promedio con dos compras y una venta'),
 ('02','Panita','https://panita.pe/producto/papel-bond-a-4-75gr-x500-report-14639',12.30,'PAP-001','P02-A','P02-B','Stock separado por almacén y rechazo de salida'),
 ('03','Promart','https://www.promart.pe/constructor',30.90,'CON-001','P03',NULL,'Salida por consumo interno'),
 ('04','Sodimac','https://modulos.sodimac.com.pe/sodimac-pe/product/375202X/Cable-THW-90-2.5mm2-Amarillo-Verde-100-Metros/375202X',304.90,'ELE-001','S04',NULL,'Compra por rollo y consumo fraccionario en metros'),
 ('05','Metro','https://www.metro.pe/arroz-superior-costeno-5kg-184926/p',20.90,'ABA-001','M05',NULL,'Conteo físico y ajuste por faltante'),
 ('06','Tottus','https://www.tottus.com.pe/tottus-pe/articulo/129087924/leche-gloria-reconstituida-entera-sixpack-lata-390-g/129087925',24.60,'LAT-001','T06',NULL,'Venta por pack con stock por lata'),
 ('07','Hiraoka','https://hiraoka.com.pe/pack-de-2-botellas-de-tinta-epson-t544-negro',73.90,'TIN-001','H07',NULL,'Conteo físico y ajuste por sobrante'),
 ('08','Coolbox','https://www.coolbox.pe/pilas-alcalinas-radioshack-aa-x4-2302213/p',13.90,'PIL-001','C08',NULL,'Venta por todo el stock disponible')
) d(caso,empresa,url,precio,sku,almacen,secundario,objetivo)
JOIN mae_articulos a ON a.codigo_sku=d.sku
JOIN mae_almacenes b ON b.codigo=d.almacen
LEFT JOIN mae_almacenes s ON s.codigo=d.secundario;
