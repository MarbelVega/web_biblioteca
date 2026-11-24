# 📚 Biblioteca Web

Frontend web (HTML + CSS + JavaScript puro, **sin dependencias ni build**) que consume el backend
[`MarbelVega/api_biblioteca`](https://github.com/MarbelVega/api_biblioteca) y su base de datos.

Está diseñado para **adaptarse al backend** sin tocar código: las rutas de los recursos, el campo
identificador, el método de actualización y la autenticación se configuran desde la pantalla
**⚙️ Configuración** o desde `js/config.js`. Si no defines los campos de un recurso, el frontend
los **infiere automáticamente** a partir del JSON que devuelve la API.

| Capacidad | Detalle |
|---|---|
| Dashboard | Conteo de registros por recurso y estado de conexión con el backend |
| CRUD genérico | Listar, filtrar, ordenar, crear, editar y eliminar en cualquier recurso REST |
| Formularios | Generados desde los campos (texto, número, fecha, email, booleano, JSON) o modo JSON libre |
| Configuración en caliente | URL base, `Authorization`, PATCH/PUT, timeout y recursos; exportable a JSON |
| Bitácora HTTP | Últimas 200 llamadas con método, URL, estado, latencia y error |
| Mock incluido | `mock/server.js` simula la API para probar sin backend |
| Despliegue | Local, Docker (Nginx + proxy `/api`), Docker Compose (BD + API + web) y GitHub Pages |
| Seguridad | CSP, renderizado con `textContent` (anti-XSS), cabeceras de seguridad en Nginx |

---

## 1. Estructura del repositorio

```text
biblioteca-web/
├── index.html                 # Shell de la SPA
├── css/styles.css             # Estilos (modo claro/oscuro, responsive)
├── js/
│   ├── env.js                 # Variables de entorno (se genera en Docker / Pages)
│   ├── config.js              # Configuración por defecto: URL, recursos, método update
│   ├── api.js                 # Cliente HTTP: timeout, normalización, errores, bitácora
│   └── app.js                 # Router hash, vistas, CRUD genérico, configuración
├── mock/server.js             # API simulada (Node puro) para demo y CI
├── scripts/smoke-test.sh      # Prueba de humo del contrato REST (curl)
├── docker/
│   ├── nginx.conf             # Plantilla Nginx con proxy /api -> backend
│   ├── 40-env.sh              # Genera js/env.js desde API_BASE_URL
│   └── backend.Dockerfile     # Dockerfile genérico NestJS para api_biblioteca
├── Dockerfile                 # Imagen del frontend
├── docker-compose.yml         # Stack completo: MySQL + api_biblioteca + frontend
├── docker-compose.mock.yml    # Demo: mock + frontend
├── .env.example               # Variables del stack
├── .github/workflows/
│   ├── ci.yml                 # Sintaxis + smoke test contra mock + build Docker
│   └── pages.yml              # Publicación en GitHub Pages
└── docs/
    ├── ARQUITECTURA.md
    ├── FLUJO_DE_TRABAJO.md
    ├── CONTRATO_API.md
    ├── CONFIGURACION_BACKEND.md
    ├── DESPLIEGUE.md
    ├── SEGURIDAD.md
    └── TROUBLESHOOTING.md
```

---

## 2. Inicio rápido

### Opción A — Probar en 1 minuto con el mock (sin backend)

```bash
node mock/server.js            # API simulada en http://localhost:3000
python3 -m http.server 8080    # en otra terminal, desde la raíz del repo
# Abrir http://localhost:8080
```

### Opción B — Contra tu `api_biblioteca` local

```bash
# 1) Backend (en su propio repo)
git clone https://github.com/MarbelVega/api_biblioteca && cd api_biblioteca
npm install
# Crear la BD con el script SQL del repo y configurar la conexión (ver docs/CONFIGURACION_BACKEND.md)
npm run start:dev              # normalmente http://localhost:3000

# 2) Frontend
cd ../biblioteca-web
python3 -m http.server 8080    # o: npx serve -l 8080
```

Luego en **⚙️ Configuración**: define la URL base, ajusta las rutas de los recursos y pulsa
**🔌 Probar conexión**. Si ves error de red/CORS, habilita CORS en el backend
(ver [docs/CONFIGURACION_BACKEND.md](docs/CONFIGURACION_BACKEND.md)).

### Opción C — Stack completo con Docker Compose

```bash
# api_biblioteca/ y biblioteca-web/ deben estar lado a lado
cd biblioteca-web
cp .env.example .env           # ajustar claves y rutas
docker compose up -d --build
# Web: http://localhost:8080   (la web llama a /api, Nginx reenvía al backend: sin CORS)
```

### Opción D — Demo con Docker sin backend

```bash
docker compose -f docker-compose.mock.yml up --build   # http://localhost:8080
```

---

## 3. Flujo de uso (resumen)

1. **Levantar BD → backend → frontend** (en ese orden).
2. **Configurar** URL base y recursos en ⚙️ (o en `js/config.js` para dejarlo fijo en el repo).
3. **Validar** en el Dashboard que cada recurso muestra un conteo (no un error).
4. **Operar**: en cada recurso usa ➕ Nuevo, ✏️ Editar, 🗑️ Eliminar, filtro y orden por columna.
5. **Diagnosticar** en 🧾 Bitácora HTTP cualquier 4xx/5xx o error de red.
6. **Exportar** la configuración final (⬇️) y copiarla a `js/config.js` para versionarla.

Detalle paso a paso, diagramas de secuencia y ejemplos: [docs/FLUJO_DE_TRABAJO.md](docs/FLUJO_DE_TRABAJO.md).

---

## 4. Configuración del frontend

`js/config.js` (valores por defecto):

```js
window.DEFAULT_CONFIG = {
  apiBaseUrl: "http://localhost:3000",
  authorization: "",            // "Bearer <token>" si el backend usa JWT
  updateMethod: "PATCH",        // PATCH (NestJS CLI) o PUT
  timeoutMs: 10000,
  resources: [
    { key: "libros", label: "Libros", icon: "📘", path: "/libros", idField: "id", fields: [] },
    // ...
  ]
};
```

Prioridad: **localStorage (pantalla ⚙️) > `js/env.js` > `js/config.js`**.

Ejemplo de recurso con campos explícitos (útil cuando la tabla está vacía y no hay nada que inferir):

```json
{
  "key": "libros", "label": "Libros", "path": "/libros", "idField": "id_libro",
  "fields": [
    { "name": "id_libro", "type": "number" },
    { "name": "titulo", "type": "text", "required": true },
    { "name": "isbn", "type": "text" },
    { "name": "fecha_publicacion", "type": "date" },
    { "name": "id_autor", "type": "number", "required": true }
  ]
}
```

---

## 5. Pruebas

```bash
# Solo lecturas (no modifica datos)
./scripts/smoke-test.sh http://localhost:3000 libros autores usuarios prestamos

# CRUD completo sobre el primer recurso (escribe en la BD; usar en entornos de prueba)
CRUD=1 PAYLOAD='{"titulo":"Prueba","isbn":"123"}' ./scripts/smoke-test.sh http://localhost:3000 libros

# Si el backend usa PUT para actualizar
UPDATE_METHOD=PUT CRUD=1 ./scripts/smoke-test.sh http://localhost:3000 libros
```

El workflow `ci.yml` ejecuta automáticamente la validación de sintaxis, el smoke test contra el mock y el build de la imagen.

---

## 6. Documentación

| Documento | Contenido |
|---|---|
| [ARQUITECTURA.md](docs/ARQUITECTURA.md) | Componentes, capas, diagramas y decisiones de diseño |
| [FLUJO_DE_TRABAJO.md](docs/FLUJO_DE_TRABAJO.md) | Flujo operativo y de desarrollo paso a paso, secuencias por operación |
| [CONTRATO_API.md](docs/CONTRATO_API.md) | Qué espera el frontend del backend y cómo adaptarlo |
| [CONFIGURACION_BACKEND.md](docs/CONFIGURACION_BACKEND.md) | CORS, BD, variables y verificación de api_biblioteca |
| [DESPLIEGUE.md](docs/DESPLIEGUE.md) | Local, Docker, Compose, GitHub Pages y opciones en nube |
| [SEGURIDAD.md](docs/SEGURIDAD.md) | Controles implementados y checklist de hardening |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Errores frecuentes y cómo resolverlos |

---

## 7. Supuestos a validar

Este frontend se generó sin acceso directo al código de `api_biblioteca`. Se asumió:

- API REST con rutas por recurso (`/libros`, `/autores`, `/categorias`, `/usuarios`, `/prestamos`) y convención `GET/POST /recurso`, `GET/PATCH/DELETE /recurso/:id` (convención de NestJS CLI).
- Respuestas JSON; las listas pueden ser un array o venir envueltas en `data`, `items`, `results`, `content`, `rows` o `records`.
- Base de datos MySQL inicializada con un script `.sql` incluido en el repo del backend.

Todo es ajustable desde ⚙️ / `config.js` / `.env` sin modificar la lógica.
