"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="flex items-center gap-3 border-b border-white/[0.04] px-6 py-3">
          <SidebarTrigger className="text-zinc-500 hover:text-zinc-200" />
        </div>
        <div className="mx-auto max-w-[1400px] px-6 py-8 md:px-10 md:py-12">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
