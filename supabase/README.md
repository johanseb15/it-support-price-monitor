# Supabase + Prisma

Este proyecto usa **PostgreSQL de Supabase** con **Prisma**. No usa `@supabase/supabase-js`.

## Conexion

1. Supabase → **Project Settings** → **Database** → **Connection string** → **URI**.
2. En **Vercel**, usa **Session pooler** (puerto `5432` en `aws-0-<region>.pooler.supabase.com`).
3. El host `db.<ref>.supabase.co:5432` suele fallar con `P1001` desde redes serverless; usa el pooler.
4. Si migrate falla, ejecuta `supabase/init.sql` en **SQL Editor** (idempotente).
5. El scraper semanal corre en **GitHub Actions** (`scraper-cron.yml`), no en Vercel (Playwright + timeouts).
6. Secrets en GitHub: `DATABASE_URL`, `SERP_API_KEY`, `CRON_SECRET`, `DB_ALLOW_SELF_SIGNED_CERT`.

## Setup de producción (Supabase + Vercel + GitHub)

### Credenciales Supabase

Proyecto: `oawdjjlmvmfnpshgbnix`

**Conexión directa (local migrations, puerto 5432)**:
```
postgresql://postgres:[PASSWORD]@db.oawdjjlmvmfnpshgbnix.supabase.co:5432/postgres?uselibpqcompat=true&sslmode=require
```

**Session pooler (Vercel + GitHub Actions, puerto 6543)**:
```
postgresql://postgres.[oawdjjlmvmfnpshgbnix]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
```

### Pasos finales

1. En GitHub (**Settings** → **Secrets and variables**):
   - `DATABASE_URL` = session pooler URL con tu contraseña real
   - `SERP_API_KEY` = tu clave real
   - `CRON_SECRET` = token secreto
   - `DB_ALLOW_SELF_SIGNED_CERT` = `true`

2. En Vercel (**Settings** → **Environment Variables**):
   - Copia las mismas variables para **Production**

3. Desde tu máquina (local setup):
   ```bash
   # Temporal: actualiza .env con DATABASE_URL de conexión directa
   npx prisma db push
   # Devuelve .env a localhost
   ```

4. Push a GitHub:
   ```bash
   git add .
   git commit -m "Setup production environment"
   git push origin main
   ```

5. Vercel despliega automáticamente.
6. GitHub Actions ejecuta scraper los **domingos a las 00:00 UTC** (cron `"0 0 * * 0"`).

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
