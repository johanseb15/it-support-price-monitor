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

La automatizacion semanal queda preparada en `.github/workflows/scraper-cron.yml`. Antes de usarla en produccion:

- Configurar el secret `CRON_SECRET` en GitHub Actions (mismo valor que en Vercel).
- URL de produccion: `https://monitor-precios-it.vercel.app`
- Verificar que la base de datos de produccion y `SERP_API_KEY` esten configuradas en el entorno de deploy.

Configurar secrets de GitHub (con `gh` autenticado):

```powershell
npx vercel env pull .env.local --environment=production --yes
.\scripts\setup-github-secrets.ps1
```

## Produccion (Vercel + Supabase)

1. Variables en Vercel: `DATABASE_URL`, `SERP_API_KEY`, `SERP_PROVIDER`, `CRON_SECRET`, `SCRAPER_*`.
2. El build ejecuta `prisma migrate deploy` y seed contra Supabase.
3. Proyecto en produccion: [monitor-precios-it.vercel.app](https://monitor-precios-it.vercel.app)

Detalle de conexion Supabase: `supabase/README.md`.

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
