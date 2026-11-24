# Arquitectura

## 1. Vista general

```mermaid
flowchart LR
  U[👤 Usuario<br/>Navegador] -->|HTTP| W[Biblioteca Web<br/>SPA estática]
  W -->|fetch JSON<br/>GET/POST/PATCH/DELETE| P{¿Proxy /api?}
  P -->|Docker/Nginx<br/>mismo origen| B[api_biblioteca<br/>NestJS]
  P -->|Local/Pages<br/>CORS| B
  B -->|ORM / driver| D[(MySQL<br/>biblioteca_db)]
```

Tres capas desacopladas:

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Presentación | HTML/CSS/JS puro (este repo) | UI, validación básica, configuración, bitácora |
| Servicios | `api_biblioteca` (NestJS, supuesto) | Reglas de negocio, validación (DTO), persistencia |
| Datos | MySQL (supuesto, script `.sql`) | Tablas libros, autores, categorías, usuarios, préstamos |

## 2. Componentes del frontend

```mermaid
flowchart TB
  subgraph Navegador
    IDX[index.html] --> ENV[js/env.js]
    ENV --> CFG[js/config.js<br/>DEFAULT_CONFIG]
    CFG --> API[js/api.js<br/>window.Api]
    API --> APP[js/app.js]
    APP --> R{Router hash}
    R --> V1[Dashboard]
    R --> V2[CRUD genérico por recurso]
    R --> V3[Configuración]
    R --> V4[Bitácora HTTP]
    APP <--> LS[(localStorage<br/>config del usuario)]
  end
  API -->|fetch| BE[(Backend)]
```

| Archivo | Responsabilidad | Puntos clave |
|---|---|---|
| `env.js` | Variables inyectadas en runtime | Lo reescribe `docker/40-env.sh` o el workflow de Pages |
| `config.js` | Valores por defecto versionados | Recursos, `idField`, `updateMethod`, timeout |
| `api.js` | Cliente HTTP | `AbortController` (timeout), normaliza listas, interpreta errores NestJS `{statusCode,message,error}`, registra bitácora |
| `app.js` | Lógica de UI | Router `#/…`, inferencia de campos, formularios, ordenamiento/filtro en cliente, render seguro con `textContent` |

## 3. Modelo de configuración

```mermaid
flowchart LR
  A[config.js<br/>por defecto] --> M((merge))
  B[env.js<br/>API_BASE_URL] --> A
  C[localStorage<br/>pantalla ⚙️] --> M
  M --> CFG[Configuración efectiva]
```

## 4. Inferencia de campos

Si un recurso tiene `fields: []`, al recibir la lista se toma el primer registro y se deduce el tipo de cada propiedad:

| Valor recibido | Tipo inferido | Control en el formulario |
|---|---|---|
| `12`, `3.5` | number | `<input type="number">` |
| `true` / `false` | boolean | checkbox |
| `"2026-11-24"` / ISO | date | `<input type="date">` |
| `"a@b.com"` | email | `<input type="email">` |
| objeto / array (relaciones) | json | textarea JSON |
| otro texto | text | `<input type="text">` |

Limitación: con la tabla vacía no hay qué inferir → se usa el **modo JSON** o se declaran `fields` explícitos.

## 5. Topologías de despliegue

```mermaid
flowchart TB
  subgraph A[Desarrollo local]
    a1[http.server :8080] -. CORS .-> a2[NestJS :3000] --> a3[(MySQL)]
  end
  subgraph B[Docker Compose]
    b1[Nginx :8080<br/>/ y /api] --> b2[backend :3000] --> b3[(db :3306)]
  end
  subgraph C[GitHub Pages]
    c1[Pages HTTPS] -. CORS + HTTPS .-> c2[Backend publicado<br/>Render/Railway/VM] --> c3[(BD gestionada)]
  end
```

## 6. Decisiones de diseño

| Decisión | Motivo |
|---|---|
| Sin framework ni build | Despliegue directo en Pages/Nginx, cero dependencias que parchear, fácil de auditar |
| CRUD genérico dirigido por configuración | El esquema real del backend no estaba disponible; se adapta sin reescribir código |
| Proxy `/api` en Nginx | Elimina CORS y oculta el puerto del backend |
| `textContent` en todo render | Datos de BD pueden contener HTML/JS: previene XSS almacenado |
| Bitácora en memoria | Diagnóstico sin persistir datos ni tokens |
