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
      href: "/offers",
      icon: Package,
      highlight: hasActiveDelivery,
    },
    { label: "Earnings", href: "/earnings", icon: Wallet },
    { label: "Support", href: "/support", icon: MessageSquare },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#07070a]/95 backdrop-blur-xl border-t border-white/[0.08] shadow-2xl pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
      <div className="grid grid-cols-5 h-14 sm:h-16 items-center px-1">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 transition-all ${
                active ? "text-white font-semibold" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${item.highlight ? "text-white animate-pulse" : ""}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 h-4 w-4 rounded-full bg-white text-zinc-950 text-[9px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
                {item.highlight && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-black" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
