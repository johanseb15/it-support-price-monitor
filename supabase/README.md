# Supabase + Prisma

Este proyecto usa **PostgreSQL de Supabase** con **Prisma**. No usa `@supabase/supabase-js`.

## Conexion

1. Supabase → **Project Settings** → **Database** → **Connection string** → **URI**.
2. Usa **Direct** (puerto `5432`) para migraciones locales.
3. En **Vercel**, `DATABASE_URL` debe ser la misma URI Direct (con contrasena URL-encoded).

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
