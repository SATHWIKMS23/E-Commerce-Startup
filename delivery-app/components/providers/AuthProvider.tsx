"use client";

import React, { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";

function SessionSync({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      const backendToken = (session as any)?.backendToken;
      const rider = (session as any)?.rider;

      if (backendToken) {
        localStorage.setItem("delivery_partner_token", backendToken);
      }
      if (rider) {
        localStorage.setItem("delivery_partner_rider", JSON.stringify(rider));
      }
    }
  }, [session]);

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionSync>{children}</SessionSync>
    </SessionProvider>
  );
}
