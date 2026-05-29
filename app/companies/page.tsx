import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell } from "../../components/ui/table";
import { getCompanies } from "../../src/services/pricing/queries";

export const dynamic = "force-dynamic";

type CompaniesPageProps = {
  searchParams: Promise<{
    q?: string;
    active?: string;
  }>;
};

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(new Date(value)) : "-";
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const params = await searchParams;
  const companies = await getCompanies({ q: params.q, active: params.active });

  return (
    <>
      <header>
        <h1 className="text-xl font-semibold text-zinc-950">Empresas</h1>
        <p className="mt-1 text-sm text-zinc-500">Listado operativo de empresas descubiertas.</p>
      </header>

      <form className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 bg-white p-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Texto</span>
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Nombre de empresa" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Estado</span>
          <Select name="active" defaultValue={params.active ?? ""}>
            <option value="">Todas</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </Select>
        </label>
        <Button type="submit" variant="primary">
          Filtrar
        </Button>
      </form>

      {companies.length === 0 ? (
        <EmptyState title="Sin empresas" detail="No hay resultados para los filtros aplicados." />
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Empresa</TableHeaderCell>
                <TableHeaderCell>Web</TableHeaderCell>
                <TableHeaderCell>Ciudad</TableHeaderCell>
                <TableHeaderCell>Fuente</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Ultimo scrapeo</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-zinc-50">
                  <TableCell className="font-medium text-zinc-950">{company.name}</TableCell>
                  <TableCell>
                    {company.websiteUrl ? (
                      <a className="text-sky-700 hover:underline" href={company.websiteUrl}>
                        {company.websiteUrl}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{company.city}</TableCell>
                  <TableCell>{company.source}</TableCell>
                  <TableCell>
                    <Badge>{company.isActive ? "Activa" : "Inactiva"}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(company.lastScrapedAt)}</TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
