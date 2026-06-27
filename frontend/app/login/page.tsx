"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const router = useRouter();

  const submit = async () => {
    setError("");
    if (!username.trim()) { setError("Username required"); return; }
    if (!password) { setError("Password required"); return; }
    setLoading(true);

    const endpoint = mode === "login" ? "login" : "signup";
    try {
      const r = await fetch(`http://localhost:8001/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({ detail: "Error" }));
        setError(d.detail || "Failed");
        setLoading(false);
        return;
      }
      const data = await r.json();
      localStorage.setItem("va_token", data.token);
      localStorage.setItem("va_user", data.username);
      router.push("/");
    } catch {
      setError("Connection failed");
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-center text-lg">Video Analyzer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
          <Button onClick={submit} disabled={loading} className="w-full gap-2">
            {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {loading ? "..." : mode === "login" ? "Login" : "Create Account"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {mode === "login" ? (
              <>No account? <button className="text-primary hover:underline" onClick={() => setMode("signup")}>Create one</button></>
            ) : (
              <>Have an account? <button className="text-primary hover:underline" onClick={() => setMode("login")}>Login</button></>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
