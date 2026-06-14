"use client";
import { useEffect, useState } from "react";
import { Key, LinkSimple, Cpu, FloppyDisk, CheckCircle, Warning, Globe } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.xiaomimimo.com/v1");
  const [model, setModel] = useState("mimo-v2.5");
  const [cookiesFrom, setCookiesFrom] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.api_key) setApiKey(d.api_key);
      if (d.base_url) setBaseUrl(d.base_url);
      if (d.model) setModel(d.model);
      if (d.cookies_from) setCookiesFrom(d.cookies_from);
    }).catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, base_url: baseUrl, model, cookies_from: cookiesFrom }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">API 配置</h1>
        <p className="text-sm text-zinc-500">配置多模态模型 API 连接参数，支持任意兼容 OpenAI 接口的服务</p>
      </div>
      <form onSubmit={handleSave}>
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 p-6 backdrop-blur-sm space-y-6">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Key weight="fill" className="h-4 w-4 text-amber-400" />API 密钥
            </Label>
            <Input id="apiKey" type="password" placeholder="sk-..." value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="h-12 rounded-xl border-white/[0.08] bg-zinc-950 text-sm placeholder:text-zinc-600 font-mono" />
            <p className="text-xs text-zinc-600">支持小米 MiMo 及其他兼容 OpenAI 接口的服务</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <LinkSimple weight="fill" className="h-4 w-4 text-blue-400" />API 地址
            </Label>
            <Input id="baseUrl" type="url" value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="h-12 rounded-xl border-white/[0.08] bg-zinc-950 text-sm placeholder:text-zinc-600 font-mono" />
            <p className="text-xs text-zinc-600">支持 OpenAI 兼容接口，可切换为不同服务商</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Cpu weight="fill" className="h-4 w-4 text-emerald-400" />模型名称
            </Label>
            <Input id="model" type="text" value={model}
              onChange={e => setModel(e.target.value)}
              className="h-12 rounded-xl border-white/[0.08] bg-zinc-950 text-sm placeholder:text-zinc-600 font-mono" />
            <p className="text-xs text-zinc-600">推荐: mimo-v2.5（多模态）/ mimo-v2.5-pro（增强推理）</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cookies" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Globe weight="fill" className="h-4 w-4 text-purple-400" />Cookie 来源
            </Label>
            <Input id="cookies" type="text" placeholder="chrome / edge / firefox（留空则不使用）" value={cookiesFrom}
              onChange={e => setCookiesFrom(e.target.value)}
              className="h-12 rounded-xl border-white/[0.08] bg-zinc-950 text-sm placeholder:text-zinc-600 font-mono" />
            <p className="text-xs text-zinc-600">国内平台（抖音、B站等）需登录Cookie才能下载，填浏览器名称即可自动提取</p>
          </div>
          {error && <div className="flex items-center gap-2 rounded-lg bg-red-500/5 border border-red-500/10 px-4 py-3"><Warning weight="fill" className="h-4 w-4 text-red-400 shrink-0" /><p className="text-sm text-red-400">{error}</p></div>}
          {saved && <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-4 py-3"><CheckCircle weight="fill" className="h-4 w-4 text-emerald-400 shrink-0" /><p className="text-sm text-emerald-400">配置已保存</p></div>}
          <Button type="submit" disabled={saving || !apiKey.trim()}
            className="w-full h-12 rounded-xl bg-emerald-500/90 text-sm font-medium text-zinc-950 hover:bg-emerald-500 disabled:opacity-40 active:scale-[0.98] transition-all">
            {saving ? "保存中..." : <span className="flex items-center gap-2"><FloppyDisk weight="fill" className="h-4 w-4" />保存配置</span>}
          </Button>
        </div>
      </form>
    </div>
  );
}
