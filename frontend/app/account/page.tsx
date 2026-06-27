"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPage() {
  const router = useRouter();
  const [user] = useState(() => typeof window !== "undefined" ? localStorage.getItem("va_user") || "?" : "?");

  const logout = () => {
    localStorage.removeItem("va_token");
    localStorage.removeItem("va_user");
    router.push("/login");
  };

  const switchAccount = () => {
    localStorage.removeItem("va_token");
    localStorage.removeItem("va_user");
    router.push("/login");
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Account</h1>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4"/> Signed in as</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-2xl font-bold">{user}</p>
          <div className="space-y-2">
            <Button variant="outline" onClick={switchAccount} className="w-full gap-2"><Shield className="h-4 w-4"/> Switch Account</Button>
            <Button variant="destructive" onClick={logout} className="w-full gap-2"><LogOut className="h-4 w-4"/> Logout</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
