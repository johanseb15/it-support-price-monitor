"use client";

import type { SupportLevel } from "@prisma/client";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import type { RecentPriceRow } from "../../src/services/pricing/queries";
import { Badge } from "../ui/badge";
import { EmptyState } from "../ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell } from "../ui/table";

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

const columns: ColumnDef<RecentPriceRow>[] = [
  {
    accessorKey: "companyName",
    header: "Empresa",
  },
  {
    accessorKey: "serviceName",
    header: "Servicio",
  },
  {
    accessorKey: "supportLevel",
    header: "Nivel",
    cell: ({ getValue }) => {
      const level = getValue<SupportLevel>();
      return <Badge level={level}>{level}</Badge>;
    },
  },
  {
    accessorKey: "price",
    header: "Precio",
    cell: ({ getValue }) => <span className="font-medium">{formatPrice(getValue<number>())}</span>,
  },
  {
    accessorKey: "scrapedAt",
    header: "Fecha",
    cell: ({ getValue }) => formatDate(getValue<string>()),
  },
];

export function RecentPricesTable({ rows }: { rows: RecentPriceRow[] }) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (rows.length === 0) {
    return <EmptyState title="Sin precios recientes" detail="Ejecuta el scraper para poblar la tabla." />;
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
      <Table>
        <TableHead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHeaderCell key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHeaderCell>
              ))}
            </tr>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-zinc-50">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
