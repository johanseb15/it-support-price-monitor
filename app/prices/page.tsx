import type { SupportLevel } from "@prisma/client";

import { Badge } from "../../components/ui/badge";
import { Button, ButtonLink } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell } from "../../components/ui/table";
import { getPriceHistory } from "../../src/services/pricing/queries";

export const dynamic = "force-dynamic";

type PricesPageProps = {
  searchParams: Promise<{
    supportLevel?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function pageHref(params: Awaited<PricesPageProps["searchParams"]>, page: number): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries({ ...params, page: String(page) })) {
    if (value) {
      query.set(key, value);
    }
  }

  return `/prices?${query.toString()}`;
}

export default async function PricesPage({ searchParams }: PricesPageProps) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const result = await getPriceHistory({
    supportLevel: params.supportLevel,
    from: params.from,
    to: params.to,
    page,
    pageSize: 25,
  });
  const totalPages = Math.max(Math.ceil(result.total / result.pageSize), 1);

  return (
    <>
      <header>
        <h1 className="text-xl font-semibold text-zinc-950">Precios</h1>
        <p className="mt-1 text-sm text-zinc-500">Historico auditable de precios detectados.</p>
      </header>

      <form className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 bg-white p-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Nivel</span>
          <Select name="supportLevel" defaultValue={params.supportLevel ?? "ALL"}>
            <option value="ALL">Todos</option>
            <option value="LEVEL_1">LEVEL_1</option>
            <option value="LEVEL_2">LEVEL_2</option>
            <option value="LEVEL_3">LEVEL_3</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Desde</span>
          <Input name="from" type="date" defaultValue={params.from ?? ""} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Hasta</span>
          <Input name="to" type="date" defaultValue={params.to ?? ""} />
        </label>
        <Button type="submit" variant="primary">
          Filtrar
        </Button>
      </form>

      {result.rows.length === 0 ? (
        <EmptyState title="Sin precios" detail="No hay registros para los filtros aplicados." />
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Empresa</TableHeaderCell>
                <TableHeaderCell>Servicio</TableHeaderCell>
                <TableHeaderCell>Nivel</TableHeaderCell>
                <TableHeaderCell>Precio</TableHeaderCell>
                <TableHeaderCell>Conf.</TableHeaderCell>
                <TableHeaderCell>Fecha</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {result.rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50">
                  <TableCell className="font-medium text-zinc-950">{row.companyName}</TableCell>
                  <TableCell>{row.serviceName}</TableCell>
                  <TableCell>
                    <Badge level={row.supportLevel as SupportLevel}>{row.supportLevel}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-zinc-950">{formatPrice(row.price)}</TableCell>
                  <TableCell>{Math.round(row.confidence * 100)}%</TableCell>
                  <TableCell>{formatDate(row.scrapedAt)}</TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-zinc-600">
        <span>
          Pagina {result.page} de {totalPages} · {result.total} registros
        </span>
        <div className="flex gap-2">
          <ButtonLink
            href={pageHref(params, Math.max(result.page - 1, 1))}
            className={result.page <= 1 ? "pointer-events-none opacity-50" : ""}
          >
            Anterior
          </ButtonLink>
          <ButtonLink
            href={pageHref(params, Math.min(result.page + 1, totalPages))}
            className={result.page >= totalPages ? "pointer-events-none opacity-50" : ""}
          >
            Siguiente
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
