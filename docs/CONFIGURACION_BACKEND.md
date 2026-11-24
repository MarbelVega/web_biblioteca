# Configuración del backend (api_biblioteca)

> Basado en convenciones de NestJS + MySQL. Verifica cada punto contra el código real del repositorio.

## 1. Habilitar CORS (obligatorio si el frontend no usa el proxy `/api`)

`src/main.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:8080').split(','),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Recomendado: valida DTOs y descarta propiedades no declaradas
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

Para GitHub Pages: `CORS_ORIGIN=https://<usuario>.github.io`. **No uses `origin: '*'` en producción.**

## 2. Conexión a la base de datos desde variables de entorno

Si el backend tiene credenciales fijas en `app.module.ts`, se recomienda moverlas a variables (`npm i @nestjs/config`):

```ts
TypeOrmModule.forRoot({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: +(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? 'biblioteca_db',
  autoLoadEntities: true,
  synchronize: false,   // el esquema lo crea el script .sql
}),
```

Si usa otro ORM (Prisma, Sequelize) o driver directo, aplica el mismo principio: leer `DB_*` de `process.env`. Esas son las variables que inyecta `docker-compose.yml`.

## 3. Crear la base de datos

```bash
mysql -u root -p < biblioteca_db.sql
```

Con Docker Compose el script se monta en `/docker-entrypoint-initdb.d/` y se ejecuta **solo la primera vez** (volumen vacío). Para reiniciar: `docker compose down -v`.

## 4. Verificación

```bash
curl -i http://localhost:3000/libros
curl -i -X OPTIONS http://localhost:3000/libros \
  -H "Origin: http://localhost:8080" -H "Access-Control-Request-Method: POST"
# Debe incluir: Access-Control-Allow-Origin: http://localhost:8080
./scripts/smoke-test.sh http://localhost:3000
```

## 5. Dockerfile del backend

Si `api_biblioteca` no tiene Dockerfile, el compose usa `docker/backend.Dockerfile` (build NestJS multi-etapa, usuario no root, `node dist/main.js`). Si el backend tiene el suyo, en `.env` pon `BACKEND_DOCKERFILE=Dockerfile`.
