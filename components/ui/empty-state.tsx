export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center">
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      {detail ? <p className="mt-1 text-sm text-zinc-500">{detail}</p> : null}
    </div>
  );
}
