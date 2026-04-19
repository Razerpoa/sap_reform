"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle, LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

type NavigationProps = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Entri Baru", href: "/entry", icon: PlusCircle },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">SR</span>
              </div>
              <span className="text-slate-900 font-bold tracking-tight hidden sm:block">
                SAP REFORM
              </span>
            </Link>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center bg-slate-100 p-1 rounded-xl relative">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "relative z-10 flex items-center px-4 py-2 text-sm font-bold transition-all duration-300 rounded-lg",
                    isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-white rounded-lg shadow-sm animate-in fade-in zoom-in-95 duration-300 -z-10" />
                  )}
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-600 hidden md:block">
                {user?.name || user?.email}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl p-2 flex justify-between items-center z-50 overflow-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isEntry = item.href === "/entry";

          if (isEntry) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all active:scale-90",
                  isActive
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-500/40 -translate-y-4 ring-8 ring-slate-50"
                    : "bg-blue-500 text-white shadow-lg shadow-blue-500/20 -translate-y-2"
                )}
              >
                <item.icon className="w-8 h-8" />
                <span className="sr-only">{item.name}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 transition-all relative",
                isActive ? "text-white" : "text-slate-400"
              )}
            >
              {isActive && (
                <div className="absolute inset-x-4 inset-y-2 bg-white/10 rounded-2xl animate-in fade-in zoom-in-95 duration-300" />
              )}
              <item.icon className={cn("w-6 h-6 relative z-10 transition-transform", isActive && "scale-110")} />
              <span className="text-[10px] font-black uppercase tracking-widest relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
