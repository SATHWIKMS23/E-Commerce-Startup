"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Radio, Package, Wallet, MessageSquare } from "lucide-react";

interface BottomNavProps {
  hasActiveDelivery?: boolean;
  offersCount?: number;
}

export function BottomNav({ hasActiveDelivery = false, offersCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  const items = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    {
      label: "Offers",
      href: "/offers",
      icon: Radio,
      badge: offersCount > 0 ? offersCount : undefined,
    },
    {
      label: "Active",
      href: "/offers", // will redirect to active delivery in dashboard
      icon: Package,
      highlight: hasActiveDelivery,
    },
    { label: "Earnings", href: "/earnings", icon: Wallet },
    { label: "Support", href: "/support", icon: MessageSquare },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-panel border-t border-white/10 pb-safe shadow-2xl">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 transition-all ${
                active ? "text-blue-400" : "text-white/40 hover:text-white/80"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${item.highlight ? "text-emerald-400 animate-pulse" : ""}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center animate-bounce">
                    {item.badge}
                  </span>
                )}
                {item.highlight && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-black" />
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
