# Monitor de Precios IT Cordoba

Herramienta profesional para descubrir empresas de soporte tecnico en Cordoba Capital, extraer precios publicados, normalizar servicios por nivel de soporte y visualizar historicos comparables en una interfaz operativa.

El proyecto concentra descubrimiento, scraping, persistencia historica, API interna y dashboard en una arquitectura full-stack modular. La regla central es preservar el historial: cada precio detectado se inserta como un nuevo registro en `PriceHistory`, sin sobrescribir mediciones anteriores.

## Stack

- Next.js 14+ App Router con TypeScript.
- PostgreSQL + Prisma ORM.
- Tailwind CSS para interfaz sobria y densa.
- SerpApi para descubrimiento en Google Local/Maps.
- Playwright + Cheerio para extraccion de sitios objetivo.
- TanStack Table para tablas analiticas.
- Recharts para tendencias de precios.
- Vitest para pruebas unitarias e integracion.

## Instalacion Y Configuracion

1. Instalar dependencias:

```bash
npm install
```

2. Crear el archivo local de entorno:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Configurar `.env` con valores reales o locales:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/monitor_precios_it?schema=public"
SERP_API_KEY="tu_clave_de_serpapi"
SERP_PROVIDER="serpapi"
CRON_SECRET="token_largo_para_endpoint_cron"
SCRAPER_MAX_COMPANIES_PER_RUN="25"
SCRAPER_TARGET_CITY="Cordoba Capital, Cordoba, Argentina"
NODE_ENV="development"
```

4. Descargar Chromium para Playwright:

```bash
npm exec playwright -- install chromium
```

5. Validar Prisma y crear tablas:

```bash
npm exec prisma validate
npm run db:migrate -- --name init
npm run db:seed
```

Desarrollo local con `.env`. Produccion (Supabase): ver `supabase/README.md`.

6. Levantar la aplicacion:

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Comandos Utiles

```bash
npm run dev
```

Inicia Next.js en desarrollo.

```bash
npm run build
```

Compila la aplicacion completa.

```bash
npm run lint
```

Ejecuta ESLint.

```bash
npm run test
```

Ejecuta la suite de Vitest.

```bash
npm exec prisma validate
```

Valida el schema de Prisma.

```bash
npm run db:migrate -- --name init
```

Aplica migraciones en desarrollo.

```bash
npm run db:deploy
```

Aplica migraciones en la base configurada en `DATABASE_URL` (por ejemplo Supabase).

```bash
npm run db:seed
```

Inserta datos demo idempotentes.

```bash
npm run db:studio
```

Abre Prisma Studio.

```bash
npm run scraper:run
```

Ejecuta manualmente el pipeline completo de descubrimiento, extraccion, normalizacion y persistencia.

## Automatizacion

El endpoint `POST /api/scraper/run` esta protegido por:

```http
Authorization: Bearer ${CRON_SECRET}
```

La automatizacion semanal corre en `.github/workflows/scraper-cron.yml` (GitHub Actions ejecuta `npm run scraper:run` con Playwright). No uses el endpoint HTTP en Vercel para el cron: los limites serverless rompen el pipeline.

Secrets en GitHub (Repository secrets):

- `DATABASE_URL` (pooler Supabase, misma URL que en Vercel)
- `SERP_API_KEY`
- `CRON_SECRET`

Dashboard en produccion: `https://monitor-precios-it.vercel.app`

Configurar secrets de GitHub (**Settings** → **Secrets and variables** → **Actions**):

```bash
# Repository Secrets:
DATABASE_URL="postgresql://postgres:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
SERP_API_KEY="tu_clave_real_de_serpapi"
CRON_SECRET="token_secreto_largo_para_proteger_endpoint"
DB_ALLOW_SELF_SIGNED_CERT="true"
```

**Nota**: reemplaza `[PASSWORD]` con tu contraseña real de Supabase. Nunca pushes estas credenciales al repositorio; úsalas solo en GitHub Secrets y Vercel.

## Produccion (Vercel + Supabase)

### Paso 1: Crear tablas en Supabase

Antes del primer despliegue, crea las tablas desde tu máquina local:

```bash
# Actualiza .env temporalmente con DATABASE_URL de Supabase (puerto 5432)
npx prisma db push
```

### Paso 2: Configurar variables en Vercel

En **Vercel** (**Settings** → **Environment Variables**), carga para **Production**:

- `DATABASE_URL`: URL con session pooler (puerto 6543) de Supabase
- `DB_ALLOW_SELF_SIGNED_CERT`: `true`
- `SERP_API_KEY`, `CRON_SECRET`: desde GitHub Secrets

### Paso 3: Desplegar

1. Git push a `main`
2. Vercel inicia build automático
3. GitHub Actions ejecuta scraper semanalmente (domingo a medianoche UTC)

Detalle de conexion Supabase: `supabase/README.md`.

## 🔒 Seguridad y Conexión a Base de Datos (TLS/SSL)

En `lib/create-prisma-client.ts` el cliente PostgreSQL se inicializa usando un `pg.Pool`. Cuando la URL no define parámetros TLS, el cliente agrega automáticamente `sslmode=verify-full` para mantener el comportamiento seguro y estable de `pg`.

Advertencia y recomendaciones:
+ - `sslmode=verify-full` es la opción más segura para producción, ya que verifica tanto el certificado TLS como el nombre del host.
+ - Si tu conexión necesita compatibilidad con la semántica libpq antigua, establece `DB_USE_LIBPQ_COMPAT=true`; el cliente entonces usará `uselibpqcompat=true&sslmode=require`.
+ - Para conexiones a `localhost` sin parámetros TLS, el cliente ahora usa `sslmode=disable` por defecto.
+ - Para conexiones con certificados autofirmados en desarrollo, puedes activar `DB_ALLOW_SELF_SIGNED_CERT=true`. Cuando se activa, el cliente fuerza `uselibpqcompat=true&sslmode=require` y deshabilita la verificación estricta de la cadena TLS.
+ - Evita usar `NODE_TLS_REJECT_UNAUTHORIZED=0` en producción: desactiva la validación TLS a nivel global y expone la aplicación a ataques "man-in-the-middle".
+ - Valida `DATABASE_URL` antes de iniciar la aplicación. Una URL mal formada o con espacios en blanco puede provocar errores de resolución de host como `ENOTFOUND`.

Documentar en el runbook de la plataforma de despliegue qué estrategia TLS se utiliza y cómo rotar certificados/credenciales.

## CI/CD

El repositorio incluye tres workflows:

- `.github/workflows/ci.yml`: valida Prisma, lint, tests y build en cada push a `main` y pull request.
- `.github/workflows/deploy-vercel.yml`: despliega a Vercel en cada push a `main` o manualmente.
- `.github/workflows/scraper-cron.yml`: dispara el scraper por HTTP una vez por semana o manualmente.

Secrets requeridos para CI/CD:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `CRON_SECRET` (mismo valor que en Vercel)

Las variables de runtime de la aplicacion (`DATABASE_URL`, `SERP_API_KEY`, `SERP_PROVIDER`, `SCRAPER_MAX_COMPANIES_PER_RUN`, `SCRAPER_TARGET_CITY`, `CRON_SECRET`) deben configurarse en Vercel.

## Estructura Principal

- `src/services/scraper/`: descubrimiento, extractor, normalizador y runner.
- `src/services/pricing/`: consultas Prisma para dashboard y listados.
- `app/api/`: controladores HTTP finos.
- `components/`: layout, UI base y visualizaciones.
- `prisma/`: schema, migraciones y seed.
- `tests/`: pruebas unitarias e integracion.
