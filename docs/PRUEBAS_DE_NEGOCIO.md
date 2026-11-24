# Pruebas de negocio del prototipo

Se ejecutaron 15 pruebas automatizadas mediante solicitudes HTTP al servidor Express real. Las pruebas crearon una base PostgreSQL 18.3 temporal a partir del esquema, cargaron los catálogos y registraron las operaciones. Los resultados se consultaron por las mismas rutas que utiliza la interfaz. El respaldo original se levantó como SQL plano para la prueba. La salida completa está en `resultado_pruebas.txt`.

También se verificaron con un DOM de pruebas conectado al servidor el inicio y cierre de sesión, el listado de casos, el kardex, la descarga de PDF, Excel y CSV, el registro de compra y conteo, el cambio de reporte y el cambio de contraseña. La instalación con Docker queda documentada para que el equipo la ejecute desde su equipo.

La actualización de la base de prueba de la versión anterior conservó 17 movimientos, 17 registros de kardex, el saldo valorizado inicial de S/ 3432.8875 y la contraseña. Se verificó además un PDF de cinco páginas con 65 filas de prueba y un total de S/ 325.00.

## Matriz de resultados

| Caso y referencia | Datos y operación | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|
| 01 · Tai Loy | Compra 20 paquetes de papel Report a S/ 12.30, compra 20 a S/ 12.50 y vende 10 a S/ 16.90. | Saldos 20, 40 y 30. Promedio final S/ 12.40. Inventario S/ 372.00 y utilidad S/ 45.00. | Los tres renglones coincidieron. Inventario S/ 372.0000 y utilidad S/ 45.0000. | Aprobado |
| 02 · Panita | Compra 30 paquetes en A y 10 en B a S/ 12.30. Intenta vender 12 desde B. | Rechazo sin cambios en el movimiento ni en el kardex. Saldos 30 y 10. | HTTP 409. Almacén A, 30 por S/ 369.0000. Almacén B, 10 por S/ 123.0000. El kardex de B conserva su única entrada. | Aprobado |
| 03 · Promart | Compra 20 bolsas de cemento a S/ 30.90 y retira 3 para consumo. | Quedan 17 por S/ 525.30. Sin efecto en ventas. | 17 bolsas por S/ 525.3000. Consumo S/ 92.7000 y reporte de ventas vacío para ese artículo y almacén. | Aprobado |
| 04 · Sodimac | Compra dos rollos de 100 m a S/ 304.90. Consume 12.5 m. | Quedan 187.5 m por S/ 571.6875. | 187.5000 m por S/ 571.6875 y costo de S/ 3.049000 por metro. | Aprobado |
| 05 · Metro | Compra 30 bolsas de arroz a S/ 20.90 y cuenta 28. | Faltante de 2 bolsas, ajuste de −S/ 41.80 e inventario final de S/ 585.20. | Ajuste vinculado por −2 bolsas, diferencia de −S/ 41.8000 y saldo de S/ 585.2000. | Aprobado |
| 06 · Tottus | Compra 5 packs de 6 latas a S/ 24.60 y vende 2 packs a S/ 27.00. | Salen 12 latas. Ingreso S/ 54.00, costo S/ 49.20 y utilidad S/ 4.80. | Quedaron 18 latas por S/ 73.8000. El reporte dio S/ 54.0000, S/ 49.2000 y S/ 4.8000. | Aprobado |
| 07 · Hiraoka | Compra 10 packs de tinta a S/ 73.90. Cuenta 11 y vuelve a contar 11. | Ajuste de +1 por S/ 73.90 y saldo final S/ 812.90. El segundo conteo no genera ajuste. | Se obtuvo 11 por S/ 812.9000. El segundo conteo quedó conciliado. | Aprobado |
| 08 · Coolbox | Compra 8 packs de pilas a S/ 13.90 y vende los 8 a S/ 17.90. | Saldo, promedio y valor final en cero. Utilidad S/ 32.00. | Cero unidades, costo promedio y valor cero. Ingreso S/ 143.2000, costo S/ 111.2000 y utilidad S/ 32.0000. | Aprobado |
| 09 · Catálogos y acceso | Intenta consultar sin sesión, envía credenciales inválidas y prueba alta/edición de catálogos y una conversión. | Se bloquea el acceso y se guardan los cambios autorizados. | Acceso bloqueado. Altas, edición y conversión persistieron. | Aprobado |
| 10 · Concurrencia | Envía dos solicitudes de venta de una unidad al mismo tiempo, con una unidad disponible. | Una venta se confirma, la otra se rechaza y el stock queda en cero. | HTTP 201 y 409. Stock final cero. | Aprobado |
| 11 · Validación | Envía códigos mal formados, más decimales, compra a cero, notas largas, líneas duplicadas y proveedor inactivo. | Se rechaza el registro y se indica el formato esperado. | Respuestas HTTP 400 o 409 según el caso. | Aprobado |
| 12 · PDF y Excel | Exporta la consulta filtrada del caso Tottus. | La descarga conserva los filtros y el formato del reporte. | PDF identificado y Excel validado con ingreso de S/ 54.00, costo de S/ 49.20 y utilidad de S/ 4.80. | Aprobado |
| 13 · Contraseña | Envía clave corta, confirmación distinta, clave anterior errónea y finalmente un cambio válido. | Solo se guarda el cambio válido, se revoca la sesión y se puede ingresar con la clave nueva. | Rechazos esperados y nuevo ingreso confirmado. La auditoría registra el evento sin registrar contraseñas. | Aprobado |
| 14 · Mantenimiento | Formatos incoherentes, códigos duplicados y conversiones inválidas. | Rechazo con la identificación del campo afectado. | Pasaron los rechazos, la normalización del código y la aceptación de unidades como m². | Aprobado |
| 15 · Cierre de sesión | Cierra la sesión e intenta reutilizar la cookie anterior. | Se revoca el acceso. | La consulta posterior devuelve HTTP 401. | Aprobado |

El archivo `Kardex_verificable.xlsx` cubre el caso 01. Contiene fórmulas de valoración y el resultado de los tres renglones devueltos por PostgreSQL. La hoja compara cantidad, costo promedio y saldo valorizado. Los precios de venta publicados se usan como referencia para los costos simulados. Las cantidades, fechas de registro, partes comerciales, almacenes y demás datos operativos corresponden a la demostración.

## Referencias de los escenarios

- [Tai Loy · Papel Report A4](https://www.tailoy.com.pe/papel-fotocopia-report-75gr-a-4-pack-x-500-619.html)
- [Panita · Papel Report A4](https://panita.pe/producto/papel-bond-a-4-75gr-x500-report-14639)
- [Promart · Cemento Sol](https://www.promart.pe/constructor)
- [Sodimac · Cable THW-90](https://modulos.sodimac.com.pe/sodimac-pe/product/375202X/Cable-THW-90-2.5mm2-Amarillo-Verde-100-Metros/375202X)
- [Metro · Arroz Superior Costeño](https://www.metro.pe/arroz-superior-costeno-5kg-184926/p)
- [Tottus · Leche Gloria Reconstituida Entera](https://www.tottus.com.pe/tottus-pe/articulo/129087924/leche-gloria-reconstituida-entera-sixpack-lata-390-g/129087925)
- [Hiraoka · Tinta negra Epson T544](https://hiraoka.com.pe/pack-de-2-botellas-de-tinta-epson-t544-negro)
- [Coolbox · Pilas alcalinas RadioShack AA](https://www.coolbox.pe/pilas-alcalinas-radioshack-aa-x4-2302213/p)
- [Ministerio de Economía y Finanzas · NIC 2 Inventarios, edición de 2024, párrafo 27](https://www.mef.gob.pe/contenidos/conta_publ/con_nor_co/niif/NIC_2_BV2024_IRACH.pdf)

Para la declaración de IA, el equipo puede indicar que utilizó ChatGPT para apoyar la programación, documentar los cambios y diseñar pruebas. Debe completar esa declaración con la revisión humana que haya realizado efectivamente y con las verificaciones de su propia instalación.
