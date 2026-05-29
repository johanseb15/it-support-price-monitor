export function Table({ className = "", ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={`w-full border-collapse text-sm ${className}`} {...props} />;
}

export function TableHead({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`bg-zinc-100 text-xs uppercase text-zinc-500 ${className}`} {...props} />;
}

export function TableHeaderCell({ className = "", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={`border-b border-zinc-200 px-3 py-2 text-left font-semibold ${className}`} {...props} />;
}

export function TableBody({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`divide-y divide-zinc-100 ${className}`} {...props} />;
}

export function TableCell({ className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-3 py-2 align-middle text-zinc-700 ${className}`} {...props} />;
}
