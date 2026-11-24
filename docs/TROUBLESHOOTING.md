# Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Error de red / CORS: Failed to fetch` | Backend caído o CORS no habilitado | `curl` al backend; habilitar `app.enableCors` (CONFIGURACION_BACKEND.md) o usar Docker con proxy `/api` |
| `404 Not Found Cannot GET /libros` | Ruta distinta o prefijo global | Revisar `@Controller()` y `setGlobalPrefix`; ajustar `path` o URL base |
| `Timeout (10000 ms)` | Backend lento o BD inaccesible | Revisar logs del backend; subir timeout en ⚙️ |
| `400 Bad Request …` al guardar | DTO rechaza campos | Leer el mensaje; usar modo JSON y enviar solo los campos del DTO (p. ej. `autorId` en vez de `autor`) |
| `404` al editar/eliminar | `idField` incorrecto | Poner el nombre real de la PK en `idField` |
| `405`/`404` al editar | Backend usa PUT y se envía PATCH (o al revés) | Cambiar "Método de actualización" |
| Formulario vacío al crear | Tabla sin registros → nada que inferir | Activar "Editar como JSON" o declarar `fields` |
| `500 Internal Server Error` | Error del backend (FK, NOT NULL, conexión BD) | `docker compose logs backend` |
| Mixed content en GitHub Pages | Backend en HTTP | Publicar backend con HTTPS |
| Cambios en `config.js` no se ven | Hay configuración guardada en localStorage | ⚙️ → ↺ Restaurar |
| BD sin tablas en Docker | El script SQL solo corre con volumen vacío / ruta incorrecta | Verificar `BACKEND_SQL_FILE`; `docker compose down -v` |
| `Access denied for user` | Credenciales del `.env` vs. las del backend | Asegurar que el backend lea `DB_*` de entorno |

## Comandos útiles

```bash
docker compose logs -f backend
docker compose exec db mysql -u root -p biblioteca_db -e "SHOW TABLES;"
curl -s http://localhost:8080/api/libros | head
./scripts/smoke-test.sh http://localhost:8080/api
```

En el navegador: **F12 → Network** y la vista **🧾 Bitácora HTTP** muestran método, URL, estado y error de cada llamada.
