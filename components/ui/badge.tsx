import type { SupportLevel } from "@prisma/client";

const levelClassName: Record<SupportLevel, string> = {
  LEVEL_1: "border-emerald-200 bg-emerald-50 text-emerald-700",
  LEVEL_2: "border-sky-200 bg-sky-50 text-sky-700",
  LEVEL_3: "border-rose-200 bg-rose-50 text-rose-700",
  UNKNOWN: "border-zinc-200 bg-zinc-100 text-zinc-700",
};

export function Badge({
  children,
  level,
}: {
  children: React.ReactNode;
  level?: SupportLevel;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded border px-2 text-xs font-medium ${
        level ? levelClassName[level] : "border-zinc-200 bg-zinc-100 text-zinc-700"
      }`}
    >
      {children}
    </span>
  );
}
