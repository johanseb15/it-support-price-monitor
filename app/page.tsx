import { KpiCard } from "../components/dashboard/kpi-card";
import { PriceTrendChart } from "../components/dashboard/price-trend-chart";
import { RecentPricesTable } from "../components/dashboard/recent-prices-table";
import { Button } from "../components/ui/button";
import { revalidatePath } from "next/cache";
import {
  getDashboardKpis,
  getLastScrapeRun,
  getPriceTrend,
  getRecentPrices,
} from "../src/services/pricing/queries";

export const dynamic = "force-dynamic";

async function runScraperAction() {
  "use server";

  try {
    const { db } = await import("../lib/db");
    await db.scrapeRun.create({ data: { status: "QUEUED" } });
    revalidatePath("/");
  } catch (error) {
    // Swallow errors to avoid surfacing 500 to the user; log for debugging
    console.error("Failed to enqueue scrape run:", error);
  }
}

function formatMoney(value: number | null): string {
  if (value === null) {
    return "Sin datos";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  let kpis: Awaited<ReturnType<typeof getDashboardKpis>> | null = null;
  let recentPrices: Awaited<ReturnType<typeof getRecentPrices>> = [];
  let trend: Awaited<ReturnType<typeof getPriceTrend>> = [];
  let lastRun: Awaited<ReturnType<typeof getLastScrapeRun>> | null = null;

  try {
    [kpis, recentPrices, trend, lastRun] = await Promise.all([
      getDashboardKpis(),
      getRecentPrices(10),
      getPriceTrend(),
      getLastScrapeRun(),
    ]);
  } catch (error) {
    console.error("Dashboard data fetch failed:", error);
  }

  if (!kpis) {
    return (
      <div className="rounded border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <h1 className="text-xl font-semibold">Dashboard no disponible</h1>
        <p className="mt-2 text-sm">
          No se pudo cargar la informacion de la base de datos. Revisa la configuracion de
          `DATABASE_URL` y reinicia el servidor.
        </p>
      </div>
    );
  }

  return (
    <>
      <header>
        <h1 className="text-xl font-semibold text-zinc-950">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Estado operativo del relevamiento de precios IT en Cordoba Capital.
        </p>
      </header>

      <section className="mb-6 rounded border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-950">Ejecutar scraper manual</p>
            <p className="mt-1 text-sm text-zinc-500">
              Inicia el pipeline de discovery y extracción de precios sin necesidad de cron externo.
            </p>
          </div>
          <form action={runScraperAction}>
            <Button type="submit" variant="primary">
              Lanzar scraper
            </Button>
          </form>
        </div>

        {lastRun ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ultima ejecucion</p>
              <p className="mt-2 text-sm text-zinc-900">{new Date(lastRun.startedAt).toLocaleString("es-AR")}</p>
            </div>
            <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Status</p>
              <p className="mt-2 text-sm text-zinc-900">{lastRun.status}</p>
            </div>
            <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Resultados</p>
              <p className="mt-2 text-sm text-zinc-900">{lastRun.discoveredCount} empresas</p>
              <p className="text-sm text-zinc-700">{lastRun.extractedCount} precios</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">Aun no se ejecuto el scraper. Usa el boton para iniciarlo.</p>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Empresas activas" value={String(kpis.activeCompanies)} />
        <KpiCard label="Precios 30 dias" value={String(kpis.pricesLast30Days)} />
        <KpiCard label="Promedio LEVEL_1" value={formatMoney(kpis.averageByLevel.LEVEL_1)} />
        <KpiCard label="Promedio LEVEL_2" value={formatMoney(kpis.averageByLevel.LEVEL_2)} />
        <KpiCard label="Promedio LEVEL_3" value={formatMoney(kpis.averageByLevel.LEVEL_3)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-950">Tendencia por nivel</h2>
          </div>
          <PriceTrendChart data={trend} />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-950">Ultimas extracciones</h2>
          </div>
          <RecentPricesTable rows={recentPrices} />
        </div>
      </section>
    </>
  );
}
