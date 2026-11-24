# Seguridad

## Controles implementados en el frontend

| Control | Implementación |
|---|---|
| Anti-XSS | Todo dato de la API se inserta con `textContent`/nodos DOM; no hay `innerHTML` con datos |
| CSP | `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` (meta en `index.html`) |
| Sin dependencias | No hay librerías de terceros (sin supply-chain JS) |
| Timeouts | `AbortController` en cada petición |
| Cabeceras Nginx | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `server_tokens off` |
| Exposición mínima | Compose publica BD y backend solo en `127.0.0.1` |
| Secretos | `.env` en `.gitignore`; la bitácora no guarda cuerpos ni cabeceras |

## Riesgos conocidos y recomendaciones

| Riesgo | Recomendación |
|---|---|
| Token en `localStorage` (si usas Authorization) | Usar tokens de corta duración; idealmente migrar a cookie `HttpOnly; Secure; SameSite` emitida por el backend |
| `connect-src *` en la CSP | En producción restringir a la URL real del backend |
| Backend sin autenticación | Añadir JWT/guards en NestJS antes de exponer a internet |
| Mass assignment | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` en el backend |
| SQL injection | Usar ORM/consultas parametrizadas en el backend; nunca concatenar SQL |
| CORS amplio | Lista explícita de orígenes; nunca `*` con credenciales |
| Validación solo en cliente | El backend debe validar siempre (DTO + class-validator) |

## Checklist previo a producción

- [ ] HTTPS extremo a extremo
- [ ] CORS con orígenes explícitos
- [ ] Autenticación y autorización por rol (bibliotecario / lector)
- [ ] `ValidationPipe` global con whitelist
- [ ] Rate limiting (`@nestjs/throttler`)
- [ ] Usuario de BD con privilegios mínimos (no root)
- [ ] CSP con `connect-src` restringido
- [ ] Escaneo SAST/DAST y de dependencias (`npm audit`) del backend
- [ ] Logs del backend centralizados en el SIEM
