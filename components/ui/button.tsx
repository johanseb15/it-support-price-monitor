import Link from "next/link";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

const variants = {
  primary: "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800",
  secondary: "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
};

export function Button({ className = "", variant = "secondary", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded border px-3 text-sm font-medium transition ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  className = "",
  variant = "secondary",
  ...props
}: React.ComponentProps<typeof Link> & { variant?: "primary" | "secondary" }) {
  return (
    <Link
      className={`inline-flex h-9 items-center justify-center rounded border px-3 text-sm font-medium transition ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
