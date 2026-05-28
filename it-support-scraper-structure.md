# Monitor de Precios IT Cordoba

Guia estructural para construir una herramienta profesional que descubre empresas de soporte tecnico en Cordoba Capital, extrae precios publicados, normaliza servicios por nivel de soporte y muestra historicos comparables en una web.

Este documento esta pensado para usarse con Codex/Cursor como contrato del proyecto. La IA debe respetar esta estructura salvo que exista una razon tecnica explicita y documentada.

## Decision Tecnica Principal

Stack recomendado:

- Framework: Next.js App Router con TypeScript.
- UI: Tailwind CSS y componentes React server/client segun corresponda.
- Base de datos: PostgreSQL.
- ORM: Prisma.
- Descubrimiento Google Maps/Search: SerpApi como primera opcion; Bright Data como alternativa enterprise.
- Scraping de sitios objetivo: Playwright para render dinamico y Cheerio para parseo HTML.
- Tablas: TanStack Table.
- Graficos: Recharts.
- Jobs: endpoint protegido + cron externo o GitHub Actions.
- Deploy inicial: Vercel para web/API y Supabase, Neon o Prisma Postgres para PostgreSQL.

Justificacion:

- No conviene scrapear Google Maps/Search directamente con Playwright porque Google cambia el DOM, aplica rate limits y bloqueos anti-bot. Una API SERP devuelve JSON estable y reduce riesgo operativo.
- Playwright si es adecuado para las webs de empresas locales, porque muchas cargan contenido con JavaScript.
- Prisma + PostgreSQL permite guardar historico sin sobrescribir precios anteriores.
- Next.js concentra web, API interna y panel administrativo en un solo repositorio al inicio.

Fuentes oficiales de referencia:

- Next.js App Router: https://nextjs.org/docs/app
- Prisma con Next.js/PostgreSQL: https://www.prisma.io/docs/guides/nextjs
- Playwright: https://playwright.dev/docs/intro
- SerpApi Google Local/Maps: https://serpapi.com/local-results

## Alcance del MVP

El MVP debe permitir:

1. Descubrir empresas de soporte tecnico en Cordoba Capital desde Google Maps/Search mediante API SERP.
2. Guardar empresas con nombre, web, telefono, direccion, ciudad y fuente.
3. Visitar webs de empresas activas y detectar textos con precios.
4. Normalizar montos en ARS y clasificar servicios como LEVEL_1, LEVEL_2 o LEVEL_3.
5. Guardar cada extraccion como registro historico.
6. Mostrar dashboard con empresas, precios recientes, nivel de soporte y tendencia historica.
7. Ejecutar el pipeline manualmente en desarrollo y por cron en produccion.

Fuera del MVP:

- Login multiusuario.
- Cobros SaaS.
- Proxies residenciales propios.
- Scraping agresivo o evasion avanzada.
- IA generativa obligatoria para clasificacion. Primero usar reglas deterministicas.

## Reglas Para Codex

- No crear carpetas fuera de este arbol sin explicar el motivo.
- No mezclar scraping con componentes de UI.
- No llamar Playwright desde componentes React.
- No escribir secretos reales en el repositorio.
- No sobrescribir historicos de precio; siempre crear registros nuevos en `PriceHistory`.
- No ejecutar scraping contra Google directamente. Usar proveedor SERP.
- Antes de tocar rutas de Next.js 16, revisar `node_modules/next/dist/docs/` si hay dudas de convenciones actuales.
- Mantener funciones de scraping testeables y desacopladas de la API route.
- Toda normalizacion monetaria debe convertir texto a numero decimal en ARS.
- Registrar errores por empresa sin cortar todo el pipeline.

## Estructura de Directorios

```text
monitor-precios-it/
  app/
    api/
      companies/
        route.ts
      prices/
        route.ts
      scraper/
        run/
          route.ts
    companies/
      page.tsx
    prices/
      page.tsx
    layout.tsx
    page.tsx
    globals.css
  components/
    dashboard/
      kpi-card.tsx
      price-trend-chart.tsx
      recent-prices-table.tsx
    layout/
      app-shell.tsx
      sidebar.tsx
    ui/
      badge.tsx
      button.tsx
      empty-state.tsx
      input.tsx
      select.tsx
      table.tsx
  lib/
    db.ts
    env.ts
    money.ts
    utils.ts
  prisma/
    schema.prisma
    seed.ts
  src/
    services/
      scraper/
        google-discovery.ts
        normalizer.ts
        runner.ts
        target-extractor.ts
        types.ts
      pricing/
        queries.ts
  tests/
    unit/
      money.test.ts
      normalizer.test.ts
    integration/
      scraper-runner.test.ts
  .env.example
  AGENTS.md
  it-support-scraper-structure.md
  package.json
  README.md
```

Nota: este proyecto ya tiene `app/`, por eso se mantiene App Router. La carpeta `src/services/` se usa para logica de dominio y scraping, no para paginas.

## Variables de Entorno

Crear `.env.example`:

```bash
DATABASE_URL="postgresql://usuario:password@localhost:5432/monitor_precios_it?schema=public"
SERP_API_KEY="tu_clave_de_api"
SERP_PROVIDER="serpapi"
CRON_SECRET="cambiar_por_un_token_largo"
SCRAPER_MAX_COMPANIES_PER_RUN="25"
SCRAPER_TARGET_CITY="Cordoba Capital, Cordoba, Argentina"
NODE_ENV="development"
```

Reglas:

- `.env` no se commitea.
- `CRON_SECRET` debe validarse en `app/api/scraper/run/route.ts`.
- `SCRAPER_MAX_COMPANIES_PER_RUN` evita corridas demasiado grandes.

## Modelo de Datos Prisma

Archivo: `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum SupportLevel {
  LEVEL_1
  LEVEL_2
  LEVEL_3
  UNKNOWN
}

enum DiscoverySource {
  SERPAPI_GOOGLE_MAPS
  SERPAPI_GOOGLE_SEARCH
  MANUAL
}

model Company {
  id             String          @id @default(uuid())
  name           String
  websiteUrl     String?         @unique
  mapsPlaceId    String?         @unique
  address        String?
  phone          String?
  city           String          @default("Cordoba")
  province       String          @default("Cordoba")
  country        String          @default("Argentina")
  source         DiscoverySource @default(SERPAPI_GOOGLE_MAPS)
  isActive       Boolean         @default(true)
  lastScrapedAt  DateTime?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  prices         PriceHistory[]
  scrapeRuns     ScrapeRun[]

  @@index([city, isActive])
}

model PriceHistory {
  id             String       @id @default(uuid())
  companyId      String
  company        Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  supportLevel   SupportLevel
  serviceName    String
  extractedPrice Decimal      @db.Decimal(12, 2)
  currency       String       @default("ARS")
  rawText        String?
  sourceUrl      String?
  confidence     Float        @default(0.5)
  scrapedAt      DateTime     @default(now())

  @@index([supportLevel])
  @@index([scrapedAt])
  @@index([companyId, scrapedAt])
}

model ScrapeRun {
  id                String    @id @default(uuid())
  companyId          String?
  company            Company?  @relation(fields: [companyId], references: [id], onDelete: SetNull)
  startedAt          DateTime  @default(now())
  finishedAt         DateTime?
  status             String
  discoveredCount    Int       @default(0)
  extractedCount     Int       @default(0)
  errorMessage       String?

  @@index([startedAt])
  @@index([status])
}
```

## Tipos Compartidos

Archivo: `src/services/scraper/types.ts`

```ts
import type { SupportLevel } from "@prisma/client";

export type DiscoveredCompany = {
  name: string;
  websiteUrl?: string | null;
  mapsPlaceId?: string | null;
  address?: string | null;
  phone?: string | null;
  city: string;
};

export type ScrapedServiceRaw = {
  title: string;
  text: string;
  priceRaw: string;
  sourceUrl: string;
};

export type NormalizedService = {
  isValid: boolean;
  supportLevel: SupportLevel;
  serviceName: string;
  price: number | null;
  confidence: number;
};
```

## Descubrimiento Google Maps/Search

Archivo: `src/services/scraper/google-discovery.ts`

Responsabilidad:

- Consultar proveedor SERP.
- Usar queries locales.
- Devolver empresas normalizadas.
- No escribir en DB directamente.

Queries iniciales:

```ts
export const DEFAULT_DISCOVERY_QUERIES = [
  "soporte tecnico pc cordoba capital",
  "servicio tecnico computadoras cordoba",
  "mantenimiento informatico empresas cordoba",
  "soporte servidores redes cordoba",
  "recuperacion datos ssd cordoba",
  "outsourcing soporte tecnico IT cordoba",
];
```

Contrato:

```ts
export async function discoverCompaniesFromMaps(): Promise<DiscoveredCompany[]> {
  // 1. Leer SERP_API_KEY desde env validado.
  // 2. Consultar SerpApi Google Local/Maps.
  // 3. Mapear resultados a DiscoveredCompany.
  // 4. Eliminar duplicados por mapsPlaceId, websiteUrl o name+address.
  // 5. Devolver datos limpios.
}
```

## Extractor de Sitios Objetivo

Archivo: `src/services/scraper/target-extractor.ts`

Responsabilidad:

- Abrir una web de empresa.
- Detectar textos con precios.
- Capturar contexto cercano.
- Devolver candidatos, no decidir la clasificacion final.

Reglas:

- Timeout maximo por sitio: 30 segundos.
- Cerrar browser/context siempre en `finally`.
- Ignorar textos gigantes.
- Limitar cantidad de resultados por pagina.
- Capturar `sourceUrl`.
- Preparar estructura para selectores especificos por dominio en una fase posterior.

Contrato:

```ts
export async function extractPricesFromWebsite(url: string): Promise<ScrapedServiceRaw[]> {
  // Usar Playwright para obtener HTML renderizado.
  // Usar Cheerio para parsear y extraer candidatos.
}
```

## Normalizacion

Archivo: `src/services/scraper/normalizer.ts`

Responsabilidad:

- Convertir dinero argentino a numero.
- Clasificar servicio por nivel.
- Calcular confianza.
- Filtrar falsos positivos.

Reglas de clasificacion inicial:

- LEVEL_1: formateo, limpieza, instalacion Windows, instalacion Office, backup simple, mantenimiento PC, antivirus.
- LEVEL_2: redes, routers, servidores basicos, impresoras de red, Outlook corporativo, dominios, Active Directory basico, soporte empresas.
- LEVEL_3: recuperacion de datos, RAID, SSD, ciberseguridad, firewall avanzado, servidores criticos, virtualizacion, incident response.
- UNKNOWN: precio valido pero servicio ambiguo.

Contrato:

```ts
export async function normalizeData(text: string, priceRaw: string): Promise<NormalizedService> {
  // 1. Extraer monto ARS.
  // 2. Clasificar por keywords ponderadas.
  // 3. Devolver confidence.
}
```

## Utilidades Monetarias

Archivo: `lib/money.ts`

Debe soportar:

- "$ 15.000"
- "$15,000"
- "ARS 15000"
- "15.000 pesos"
- "desde $ 25.500"
- "1.200,50"

Contrato:

```ts
export function parseArgentineMoney(input: string): number | null {
  // Devuelve numero en ARS o null si no hay precio confiable.
}
```

## Orquestador

Archivo: `src/services/scraper/runner.ts`

Responsabilidad:

- Crear ScrapeRun.
- Ejecutar descubrimiento.
- Upsert de empresas.
- Extraer precios de empresas activas.
- Normalizar y guardar historicos.
- Continuar aunque falle una empresa.

Contrato:

```ts
export async function runCompleteScrapingPipeline() {
  // 1. Crear ScrapeRun status RUNNING.
  // 2. Descubrir empresas.
  // 3. Upsert companies.
  // 4. Buscar companies activas con websiteUrl.
  // 5. Extraer servicios por sitio.
  // 6. Normalizar.
  // 7. Insertar PriceHistory.
  // 8. Finalizar ScrapeRun status SUCCESS/PARTIAL/FAILED.
}
```

## API Routes

### Ejecutar Scraper

Archivo: `app/api/scraper/run/route.ts`

Metodo: `POST`

Seguridad:

- Requiere header `Authorization: Bearer ${CRON_SECRET}`.
- Devuelve `401` si no coincide.

Respuesta esperada:

```json
{
  "ok": true,
  "runId": "uuid",
  "discoveredCount": 10,
  "extractedCount": 35
}
```

### Empresas

Archivo: `app/api/companies/route.ts`

Metodo: `GET`

Query params:

- `city`
- `active`
- `q`

### Precios

Archivo: `app/api/prices/route.ts`

Metodo: `GET`

Query params:

- `supportLevel`
- `companyId`
- `from`
- `to`

## UI

Pantallas:

- `/`: dashboard ejecutivo.
- `/companies`: listado de empresas descubiertas.
- `/prices`: tabla analitica de precios.

Dashboard:

- KPI: empresas activas.
- KPI: precios detectados ultimos 30 dias.
- KPI: precio promedio LEVEL_1.
- KPI: precio promedio LEVEL_2.
- KPI: precio promedio LEVEL_3.
- Tabla: ultimos precios detectados.
- Grafico: tendencia por nivel.

Lineamientos visuales:

- Interfaz sobria, de herramienta operativa.
- Sin landing page de marketing.
- Tablas densas y escaneables.
- Cards solo para KPIs y elementos repetidos.
- Estados vacios claros cuando no hay datos.

## Instalacion Recomendada

Comandos iniciales:

```bash
npm install prisma @prisma/client playwright cheerio zod recharts @tanstack/react-table
npm install -D tsx vitest @types/cheerio
npx prisma init
npx playwright install chromium
```

Luego:

```bash
npx prisma migrate dev --name init
npm run lint
npm run build
```

Si se agregan tests:

```bash
npm run test
```

## Scripts Sugeridos

Agregar a `package.json`:

```json
{
  "scripts": {
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "scraper:run": "tsx scripts/run-scraper.ts",
    "test": "vitest run"
  }
}
```

## Fases de Implementacion

### Fase 1: Base del Proyecto

- Instalar dependencias.
- Crear `.env.example`.
- Crear `prisma/schema.prisma`.
- Crear `lib/env.ts` con validacion Zod.
- Crear `lib/db.ts`.
- Ejecutar primera migracion.

Criterio de exito:

- `npx prisma validate` pasa.
- `npm run build` pasa.

### Fase 2: Normalizador

- Implementar `lib/money.ts`.
- Implementar `src/services/scraper/normalizer.ts`.
- Crear tests unitarios.

Criterio de exito:

- Casos de precios argentinos parsean bien.
- Clasificacion L1/L2/L3 funciona con keywords base.

### Fase 3: Descubrimiento

- Implementar `google-discovery.ts`.
- Mapear respuesta del proveedor SERP.
- Deduplicar resultados.
- Agregar modo mock para tests.

Criterio de exito:

- Con API key devuelve empresas normalizadas.
- Sin API key falla con mensaje claro.

### Fase 4: Extractor

- Implementar Playwright + Cheerio.
- Extraer candidatos de precio.
- Limitar resultados.
- Agregar manejo de errores.

Criterio de exito:

- Dada una URL real, devuelve candidatos sin romper el proceso.

### Fase 5: Orquestador y API

- Implementar `runner.ts`.
- Crear endpoint protegido `POST /api/scraper/run`.
- Crear endpoints `GET /api/companies` y `GET /api/prices`.

Criterio de exito:

- El pipeline crea empresas y price histories.
- El endpoint rechaza requests sin secreto.

### Fase 6: Dashboard

- Crear app shell.
- Crear KPIs.
- Crear tabla de precios recientes.
- Crear grafico de tendencia.
- Crear paginas `/companies` y `/prices`.

Criterio de exito:

- La app muestra datos reales de PostgreSQL.
- Estados vacios se ven correctos.

### Fase 7: Automatizacion

- Configurar cron externo o GitHub Actions.
- Documentar frecuencia.
- Agregar observabilidad basica con `ScrapeRun`.

Criterio de exito:

- El scraper corre automaticamente.
- Cada corrida queda auditada.

## Consideraciones Legales y Eticas

- Revisar terminos de uso de sitios objetivo.
- No extraer informacion personal innecesaria.
- No saturar sitios chicos: usar limites, delays y corridas espaciadas.
- Guardar fuente y fecha para auditoria.
- Priorizar APIs oficiales o proveedores SERP donde corresponda.
- Dar opcion de desactivar empresas manualmente con `isActive`.

## Prompt Maestro Para Codex

Usar este prompt al empezar una fase:

```text
Actua como un ingeniero full-stack senior. Lee `it-support-scraper-structure.md` y respeta su arbol de directorios, tipos y fases. Implementa solo la fase solicitada, sin crear carpetas fuera del contrato salvo que lo justifiques. Antes de editar, revisa los archivos existentes. Despues de editar, ejecuta validaciones razonables como lint, build, prisma validate o tests segun aplique. No escribas secretos reales en el repositorio.
```

Prompt para iniciar Fase 1:

```text
Implementa la Fase 1 del proyecto Monitor de Precios IT Cordoba: dependencias, `.env.example`, Prisma schema, `lib/env.ts`, `lib/db.ts` y primera validacion. Respeta estrictamente `it-support-scraper-structure.md`.
```

## Definicion de Terminado

Una fase se considera terminada cuando:

- El codigo compila.
- Los tipos TypeScript no tienen errores.
- Los tests relevantes pasan o se documenta por que no aplican.
- No hay secretos reales en archivos versionados.
- El cambio queda explicado brevemente en README o en este documento si afecta arquitectura.

