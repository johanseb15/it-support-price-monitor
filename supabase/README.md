# Supabase + Prisma

Este proyecto usa **PostgreSQL de Supabase** con **Prisma**. No usa `@supabase/supabase-js`.

## Conexion

1. Supabase → **Project Settings** → **Database** → **Connection string** → **URI**.
2. En **Vercel**, usa **Session pooler** (puerto `5432` en `aws-0-<region>.pooler.supabase.com`).
3. El host `db.<ref>.supabase.co:5432` suele fallar con `P1001` desde redes serverless; usa el pooler.
4. Si migrate falla, ejecuta `supabase/init.sql` en **SQL Editor** (idempotente).
5. El scraper semanal corre en **GitHub Actions** (`scraper-cron.yml`), no en Vercel (Playwright + timeouts).
6. Secrets en GitHub: `DATABASE_URL`, `SERP_API_KEY`, `CRON_SECRET`.

Referencia del proyecto: `https://oawdjjlmvmfnpshgbnix.supabase.co`

## Tablas

En cada deploy, Vercel ejecuta `prisma migrate deploy` y el seed demo.

Para aplicar migraciones a mano:

```bash
npm run db:deploy
```

Si falla `P1001` desde tu PC, ejecuta el SQL de `prisma/migrations/20260528170000_init/migration.sql` en **SQL Editor** de Supabase.

## Verificacion

- Table Editor: `Company`, `PriceHistory`, `ScrapeRun`
- API: `https://monitor-precios-it.vercel.app/api/companies`
