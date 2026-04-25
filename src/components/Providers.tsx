"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect } from "react";

function SessionRefresher() {
  const { update } = useSession();

  useEffect(() => {
    // Refresh session when tab becomes visible again (catches role updates)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        update();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [update]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <SessionRefresher />
    </SessionProvider>
  );
}
