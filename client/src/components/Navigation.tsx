import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Map } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();

  const links = [
    {
      href: "/map",
      label: (
        <span className="flex items-center gap-2">
          <Map className="h-4 w-4" />
          Map
        </span>
      )
    }
  ];

  return (
    <nav className="flex items-center gap-6 ml-8">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "text-sm transition-colors hover:text-primary",
            location === href
              ? "text-foreground font-medium"
              : "text-muted-foreground"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}