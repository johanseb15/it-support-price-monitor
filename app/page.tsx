import { KpiCard } from "../components/dashboard/kpi-card";
import { PriceTrendChart } from "../components/dashboard/price-trend-chart";
import { RecentPricesTable } from "../components/dashboard/recent-prices-table";
import {
  getDashboardKpis,
  getPriceTrend,
  getRecentPrices,
} from "../src/services/pricing/queries";

export const dynamic = "force-dynamic";

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

  try {
    [kpis, recentPrices, trend] = await Promise.all([
      getDashboardKpis(),
      getRecentPrices(10),
      getPriceTrend(),
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
