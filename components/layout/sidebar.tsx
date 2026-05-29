"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/companies", label: "Empresas" },
  { href: "/prices", label: "Precios" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 border-b border-zinc-200 bg-zinc-950 text-white md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="flex w-full flex-col gap-4 p-4">
        <div className="border-b border-white/10 pb-4">
          <p className="text-sm font-semibold">Monitor IT Cordoba</p>
          <p className="mt-1 text-xs text-zinc-400">Precios de soporte tecnico</p>
        </div>
        <nav className="flex gap-2 md:flex-col">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
