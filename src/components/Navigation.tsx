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

          <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors",
                  pathname === item.href
                    ? "border-blue-600 text-slate-900"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                )}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.name}
              </Link>
            ))}
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
      <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-white/80 backdrop-blur-lg border border-slate-200 rounded-2xl shadow-2xl p-2 flex justify-around items-center z-50">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-500"
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-bold">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
