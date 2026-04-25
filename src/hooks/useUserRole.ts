import { useState, useEffect, useCallback } from "react";

export function useUserRole() {
  const [role, setRole] = useState<string>("WHITELISTED");
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setRole(data.role || "WHITELISTED");
      }
    } catch (err) {
      console.error("Failed to fetch role:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  return { role, isAdmin: role === "ADMIN", loading, refresh: fetchRole };
}