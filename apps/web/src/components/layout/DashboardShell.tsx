"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { LayoutGrid, Menu, LogOut, Sparkles, FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
};

function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function Sidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-2 py-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-5">AI Marketing Generator</div>
          <div className="truncate text-xs text-muted-foreground">Workspace</div>
        </div>
      </div>

      <Separator className="my-3" />

      <nav className="grid gap-1 px-1">
        <NavLink href="/dashboard" label="Overview" icon={<LayoutGrid className="h-4 w-4" />} />
        <NavLink href="/dashboard" label="Projects" icon={<FolderKanban className="h-4 w-4" />} />
      </nav>

      <div className="mt-auto px-1 pb-2">
        <Separator className="my-3" />
        <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Tip: run ingestion before generation.
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ user, children }: Props) {
  const label = user.name || user.email || "Account";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl">
        <aside className="sticky top-0 hidden h-screen w-72 border-r bg-background/70 backdrop-blur lg:block">
          <div className="h-full p-4">
            <Sidebar />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur">
            <div className="flex h-14 items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-2 lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Open menu">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-4">
                    <Sidebar />
                  </SheetContent>
                </Sheet>
                <div className="text-sm font-semibold">Dashboard</div>
              </div>

              <div className="hidden text-sm font-semibold lg:block">Dashboard</div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="max-w-[220px] justify-start">
                    <span className="truncate">{label}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={async (e) => {
                      e.preventDefault();
                      toast.loading("Signing out…");
                      const res = await fetch("/api/auth/signout", {
                        method: "POST",
                        headers: { "content-type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({ callbackUrl: "/" }).toString(),
                      });
                      if (res.ok) {
                        toast.success("Signed out");
                        window.location.href = "/";
                      } else {
                        toast.error("Sign out failed");
                      }
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 px-4 py-8 lg:px-6">
            <div className="mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

