# Nexo Inventario

Prototipo web local para el Tema 1, inventario físico y valorado al costo promedio. Incluye inicio de sesión, mantenimiento de catálogos, movimientos, kardex, conteos físicos con ajuste, reportes y auditoría. Trabaja con PostgreSQL y comienza con ocho escenarios académicos.

## Instalación recomendada

1. Instala [Docker Desktop](https://www.docker.com/products/docker-desktop/) y espera a que esté en ejecución. En Linux también sirve Docker Engine con Docker Compose v2.
2. Descomprime el ZIP y abre la carpeta **NexoInventario**. En Windows puedes abrir **Iniciar_NexoInventario.bat** con doble clic. Si prefieres la terminal, ejecuta desde esa carpeta:

   ```sh
   docker compose up --build -d --wait
   ```

3. Abre [http://localhost:3000](http://localhost:3000). La primera construcción descarga las imágenes y dependencias y puede tardar unos minutos.
4. Ingresa con **demo** y **NexoInventario2026!**.

En una instalación nueva, el arranque crea la estructura, los catálogos de demostración y sus movimientos. La base permanece en un volumen de PostgreSQL cuando detienes o actualizas la aplicación. La conexión entre los dos contenedores ya está configurada.

| Acción | Comando |
|---|---|
| Ver estado de los servicios | `docker compose ps` |
| Ver mensajes de arranque | `docker compose logs -f app` |
| Detener la aplicación y conservar datos | `docker compose stop` |
| Continuar con los datos guardados | `docker compose up -d` |
| Ejecutar pruebas contra una base temporal | `docker compose run --rm --no-deps app npm test` |

Si el puerto 3000 ya está ocupado, copia `.env.example` a `.env`, cambia `APP_PORT` a 3001, inicia otra vez y abre [http://localhost:3001](http://localhost:3001). Para abrir una instalación **nueva** con los catálogos listos y sin movimientos, configura `APP_LOAD_DEMO=0` antes del primer arranque. Para tener una segunda demostración con base independiente, usa otra carpeta y un nombre de proyecto distinto con `docker compose -p nexo-inventario-laboratorio up --build -d`, además de otro puerto de aplicación.

### Opción con PostgreSQL instalado

Con Node.js 22 o posterior y PostgreSQL 18, crea desde pgAdmin una base vacía y un usuario que sea propietario de ella. Abre la carpeta en PowerShell y usa los datos de tu instalación:

```powershell
$env:PGHOST = "127.0.0.1"
$env:PGPORT = "5432"
$env:PGUSER = "mi_usuario"
$env:PGDATABASE = "stockclaro"
$env:PGPASSWORD = "mi_contraseña"
npm ci
npm start
```

En Linux/macOS define las mismas variables con `export`. También se admite `DATABASE_URL` como alternativa. PostgreSQL debe estar iniciado. La aplicación usa por defecto el puerto 3000, la zona horaria de Lima y la moneda PEN. Las pruebas automatizadas requieren permisos para crear una base temporal. Si ya existe una base con el respaldo original, conserva esa copia y usa una base vacía para este proyecto. La aplicación instala automáticamente los archivos numerados de `db/` en la base seleccionada.

### Cuenta y contraseña

En la parte superior abre **Mi cuenta**, ingresa la contraseña actual y escribe dos veces la nueva. Usa de 12 a 128 caracteres, al menos una letra y un número. Luego vuelve a iniciar sesión. Para configurar una clave en una base nueva, usa `DEMO_PASSWORD` antes del primer arranque.

Si olvidaste la clave y gestionas la instalación local, puedes restablecerla desde la terminal mediante `NEW_DEMO_PASSWORD` y `npm run password`. Con Docker:

```sh
docker compose exec -e NEW_DEMO_PASSWORD="NuevaClaveLocal-2026" app npm run password
```

### Actualizar desde StockClaro

Si la primera versión fue instalada con Docker y quieres mantener sus datos, conserva el mismo nombre de proyecto Docker. Consulta su nombre con `docker compose ls`. Detén esa versión con `docker compose stop` desde su carpeta. En la carpeta nueva ejecuta `docker compose -p NOMBRE_ANTERIOR up --build -d --wait`, sustituyendo `NOMBRE_ANTERIOR` por el nombre exacto. Conserva el archivo `.env` utilizado si personalizaste la conexión. La actualización agrega la nueva migración sobre esa base. Si trabajas con PostgreSQL instalado, conserva la misma conexión y ejecuta el proyecto actualizado.

## Uso del prototipo

1. **Mantenimiento.** Crea o edita artículos, unidades y almacenes. Define el SKU, su unidad base y, si corresponde, el factor de una unidad alternativa. Puedes administrar proveedores y clientes con códigos ficticios.
2. **Movimientos.** Selecciona compra, venta o consumo. Indica el almacén y proveedor, cliente o centro de costo. Añade hasta 25 artículos distintos por operación. En compras o ventas introduce el costo o precio **por la unidad elegida**. Por ejemplo, selecciona pack e ingresa S/ 27.00 si ese es el precio de un pack completo.
3. **Kardex.** Filtra por artículo y almacén. La tabla muestra el historial en orden cronológico con cantidades, costo aplicado, saldo y costo promedio. Exporta la consulta filtrada a PDF, Excel o CSV.
4. **Inventario físico.** Registra la cantidad contada en la unidad base. Al confirmar, el sistema compara con el stock al corte y registra el ajuste cuando existe una diferencia. Si hay sobrante y el artículo carece de costo vigente en ese almacén, se pide registrar primero un ingreso valorizado.
5. **Reportes.** Consulta inventario valorado y utilidad bruta por artículo. La utilidad se agrupa por mes y almacén e incluye ventas con salida en kardex. Descarga ambos reportes en PDF, Excel o CSV. El PDF incluye filtros, resumen y número de página. Excel conserva los importes como datos numéricos y los totales como fórmulas.
6. **Casos de prueba.** Consulta las ocho referencias comerciales y abre el kardex del artículo de cada caso. El caso Panita tiene dos almacenes. Cambia el filtro del kardex para inspeccionar el segundo.
7. **Auditoría.** Consulta el registro de cambios en catálogos, movimientos, conversiones y conteos.

En el almacén **01 · Librería central**, el caso precargado tiene dos compras y una venta. Si deseas conservar intacta la evidencia del kardex en Excel, practica altas y movimientos en un almacén nuevo o en la instalación de laboratorio.

## Formatos admitidos

| Campo | Formato |
|---|---|
| SKU y códigos de catálogo | Letras sin tilde y números. Se aceptan guiones o guiones bajos entre bloques, como `INV-001`. Se guardan en mayúsculas y son únicos en su catálogo. |
| Cantidad de movimiento | Positiva y con hasta cuatro decimales. Un movimiento admite de 1 a 25 artículos distintos. |
| Costo de compra y precio de venta | Positivos y con hasta seis decimales. El importe se indica por la unidad elegida en el documento. |
| Factor de conversión | Positivo, con hasta seis decimales. |
| Conteo físico | Cero o mayor, con hasta cuatro decimales y en la unidad base del artículo. |
| Nota | Máximo 400 caracteres por movimiento y 250 por toma física. |

La validación se ejecuta tanto en el formulario como en PostgreSQL mediante el servidor de la aplicación. El sistema rechaza artículos o participantes inactivos, códigos duplicados y salidas que superen la existencia disponible en su almacén.

### Validaciones del módulo Mantenimiento

| Campo | Regla |
|---|---|
| Códigos | Entre 1 y 15 caracteres para unidades, 20 para almacenes, 40 para el SKU y 25 para el código de referencia. Se normalizan a mayúsculas y el código debe ser único dentro de su catálogo. |
| Nombres y descripciones | Deben contener al menos una letra. La descripción del artículo y el nombre del almacén tienen un mínimo de tres caracteres. Los nombres de unidades, clientes y proveedores tienen un mínimo de dos. Se admiten tildes y puntuación habitual. |
| Abreviatura | De 1 a 10 caracteres y al menos una letra. Se admiten unidades como `kg`, `m²` o `kg/m³`. |
| Ubicación | Opcional. Si se completa, debe tener de 2 a 200 caracteres y contener al menos una letra o número. Ejemplos: `Zona B-2` o `105`. |
| Precio referencial | Cero o positivo, con hasta cuatro decimales. El artículo requiere una unidad base activa. |
| Conversión | El factor debe ser mayor que cero, con hasta seis decimales. El selector excluye la unidad base del artículo. |

Los formularios incluyen ejemplos y señalan el campo que debes corregir. El servidor vuelve a comprobar los datos antes de guardarlos. Esta actualización no requiere migraciones. Si ya tienes datos, actualiza el proyecto usando la misma base o el mismo nombre de proyecto Docker, según la sección de instalación.

## Evidencia de la Fase 3

- [Casos de negocio y resultados ejecutados](docs/PRUEBAS_DE_NEGOCIO.md).
- [Salida de las pruebas automatizadas](docs/resultado_pruebas.txt).
- [Kardex con fórmulas y contraste con PostgreSQL](docs/Kardex_verificable.xlsx).
- [Arquitectura, correcciones al respaldo y alcance](docs/ARQUITECTURA_Y_CAMBIOS.md).

Los precios referenciales vienen de catálogos públicos. Los almacenes del prototipo, las partes de las transacciones, los importes de reventa, las cantidades y los movimientos son simulados para el trabajo. Los ocho escenarios utilizan identificadores de almacén dentro de una base académica común y se consultan por filtro.
