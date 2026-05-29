"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "../../src/services/pricing/queries";
import { EmptyState } from "../ui/empty-state";

export function PriceTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="Sin tendencia disponible" detail="Aun no hay historico suficiente." />;
  }

  return (
    <div className="h-80 rounded border border-zinc-200 bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 20, top: 10, bottom: 6 }}>
          <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#71717a" />
          <YAxis tick={{ fontSize: 12 }} stroke="#71717a" width={72} />
          <Tooltip
            formatter={(value) =>
              typeof value === "number"
                ? new Intl.NumberFormat("es-AR", {
                    style: "currency",
                    currency: "ARS",
                    maximumFractionDigits: 0,
                  }).format(value)
                : value
            }
          />
          <Legend />
          <Line type="monotone" dataKey="LEVEL_1" stroke="#059669" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="LEVEL_2" stroke="#0284c7" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="LEVEL_3" stroke="#e11d48" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
