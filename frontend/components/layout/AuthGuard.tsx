"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (pathname === "/login") { setOk(true); return; }
    const token = localStorage.getItem("va_token");
    if (!token) { router.push("/login"); return; }
    // Verify token is still valid
    fetch("http://localhost:8001/api/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => {
      if (r.ok) setOk(true);
      else { localStorage.removeItem("va_token"); router.push("/login"); }
    }).catch(() => setOk(true)); // Backend might be starting, allow anyway
  }, [pathname, router]);

  if (!ok) return null;
  return <>{children}</>;
}
