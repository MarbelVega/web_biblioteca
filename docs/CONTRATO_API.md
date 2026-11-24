# Contrato API esperado

El frontend consume cualquier API REST que cumpla este contrato mínimo por recurso.

| Operación | Método y ruta | Cuerpo | Respuesta esperada |
|---|---|---|---|
| Listar | `GET {base}{path}` | — | `200` + array **o** objeto con `data`/`items`/`results`/`content`/`rows`/`records` |
| Obtener | `GET {base}{path}/:id` | — | `200` + objeto |
| Crear | `POST {base}{path}` | JSON | `200`/`201` + objeto creado |
| Actualizar | `PATCH` o `PUT {base}{path}/:id` | JSON (parcial en PATCH) | `200` + objeto |
| Eliminar | `DELETE {base}{path}/:id` | — | `200`/`204` |
| Salud | `GET {base}/` | — | cualquier `2xx` (si da 404 se prueba el primer recurso) |

## Errores

Se interpretan errores con el formato estándar de NestJS:

```json
{ "statusCode": 400, "message": ["titulo should not be empty"], "error": "Bad Request" }
```

Se muestran como `400 Bad Request titulo should not be empty`. Cualquier otro cuerpo se muestra truncado a 200 caracteres.

## Cabeceras enviadas

| Cabecera | Cuándo |
|---|---|
| `Accept: application/json` | Siempre |
| `Content-Type: application/json` | POST / PATCH / PUT |
| `Authorization: <valor configurado>` | Si se configuró en ⚙️ |

## Recursos supuestos (ajustables)

| key | path | idField | Entidad típica |
|---|---|---|---|
| libros | `/libros` | `id` | título, ISBN, año, autor, categoría, stock |
| autores | `/autores` | `id` | nombre, nacionalidad |
| categorias | `/categorias` | `id` | nombre |
| usuarios | `/usuarios` | `id` | nombre, email, estado |
| prestamos | `/prestamos` | `id` | libro, usuario, fechas, estado |

> Estos nombres son supuestos. Verifica los `@Controller()` reales del backend y ajusta `path`/`idField`.

## Adaptaciones comunes

| Situación en el backend | Ajuste en el frontend |
|---|---|
| `app.setGlobalPrefix('api')` | URL base `http://host:3000/api` |
| PK `id_libro` | `"idField": "id_libro"` |
| Controlador `@Controller('book')` | `"path": "/book"` |
| `@Put(':id')` en vez de `@Patch` | Método de actualización `PUT` |
| JWT con `@UseGuards(AuthGuard)` | Authorization `Bearer <token>` |
| Paginación `{ data, total }` | Soportado automáticamente (se toma `data`) |
| Relaciones anidadas (`autor: {id, nombre}`) | Se muestran como JSON; al editar enviar `autorId` según el DTO |
