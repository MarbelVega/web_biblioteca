# Despliegue

| Escenario | Frontend | Backend + BD | CORS |
|---|---|---|---|
| Desarrollo | `python3 -m http.server 8080` | `npm run start:dev` + MySQL local | Sí, `CORS_ORIGIN=http://localhost:8080` |
| Docker Compose | Nginx :8080 | contenedores `backend` y `db` | No (proxy `/api`) |
| GitHub Pages | Pages (HTTPS) | Backend publicado con HTTPS | Sí, `CORS_ORIGIN=https://<usuario>.github.io` |

## 1. Docker Compose (stack completo)

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
docker compose logs -f backend
```

- Web: `http://localhost:8080` · API vía proxy: `http://localhost:8080/api/libros`
- BD y backend publicados solo en `127.0.0.1`.
- Reset de BD: `docker compose down -v && docker compose up -d`.

## 2. Solo frontend en Docker contra un backend existente

```bash
docker build -t biblioteca-web .
# Con proxy (sin CORS): el backend debe ser alcanzable desde el contenedor
docker run -p 8080:80 -e BACKEND_HOST=host.docker.internal -e BACKEND_PORT=3000 biblioteca-web
# Sin proxy (llamada directa, requiere CORS)
docker run -p 8080:80 -e API_BASE_URL=https://api.midominio.com biblioteca-web
```

## 3. GitHub Pages

1. Crear repo y subir el contenido del ZIP:
   ```bash
   git init && git add . && git commit -m "Biblioteca Web inicial"
   git branch -M main
   git remote add origin https://github.com/MarbelVega/biblioteca-web.git
   git push -u origin main
   ```
2. **Settings → Pages → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables**: `API_BASE_URL=https://<tu-backend>`.
4. Push a `main` → el workflow `pages.yml` publica en `https://marbelvega.github.io/biblioteca-web/`.

> Pages es HTTPS: el backend también debe ser HTTPS o el navegador bloqueará las llamadas (mixed content).

## 4. Publicar el backend y la BD (capas gratuitas o de bajo costo)

| Componente | Opciones |
|---|---|
| Backend NestJS | Render, Railway, Fly.io, Koyeb, VM propia con Docker |
| MySQL | Aiven (MySQL), TiDB Cloud Serverless, Railway MySQL, contenedor en VM |

Las condiciones de las capas gratuitas cambian con frecuencia; revisa los límites vigentes antes de elegir.
Variables a definir en el proveedor: `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `CORS_ORIGIN`.
