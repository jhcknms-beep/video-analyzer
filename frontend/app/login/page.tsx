"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const login = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("http://localhost:8001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        setError("Invalid password");
        setLoading(false);
        return;
      }
      const data = await r.json();
      localStorage.setItem("va_token", data.token);
      router.push("/");
    } catch {
      setError("Connection failed - backend not running");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-center text-lg">Video Analyzer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-center text-muted-foreground">Enter password to access</p>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
          <Button onClick={login} disabled={loading} className="w-full gap-2">
            <KeyRound className="h-4 w-4" />
            {loading ? "Logging in..." : "Login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
