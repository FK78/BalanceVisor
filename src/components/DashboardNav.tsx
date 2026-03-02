"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  Tags,
  Trophy,
  TrendingUp,
  Repeat,
  Settings,
  ChevronDown,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const primaryItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/accounts", label: "Accounts", icon: Wallet },
  { href: "/dashboard/investments", label: "Investments", icon: TrendingUp },
];

const moreItems = [
  { href: "/dashboard/categories", label: "Categories", icon: Tags },
  { href: "/dashboard/budgets", label: "Budgets", icon: Target },
  { href: "/dashboard/goals", label: "Goals", icon: Trophy },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const allItems = [...primaryItems, ...moreItems];

function isActive(href: string, pathname: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

const linkClass = (active: boolean) =>
  `flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
    active
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  }`;

export function DashboardNav() {
  const pathname = usePathname();

  const moreIsActive = moreItems.some((item) => isActive(item.href, pathname));

  return (
    <>
      {/* Desktop: primary links + "More" dropdown */}
      <div className="hidden items-center gap-1 md:flex">
        {primaryItems.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link key={item.href} href={item.href} className={linkClass(active)}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`${linkClass(moreIsActive)} cursor-pointer select-none`}
            >
              More
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {moreItems.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={`flex w-full items-center gap-2 ${active ? "font-semibold text-foreground" : ""}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile: single hamburger dropdown */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Open navigation menu">
              <Menu className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            {allItems.map((item) => {
              const active = isActive(item.href, pathname);
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={`flex w-full items-center gap-2 ${active ? "font-semibold text-foreground" : ""}`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
