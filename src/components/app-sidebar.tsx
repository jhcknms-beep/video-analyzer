"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  ChartBar,
  PlusCircle,
  FilmSlate,
  Queue,
  Play,
  Gear,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  {
    title: "控制台",
    url: "/",
    icon: ChartBar,
  },
  {
    title: "提交分析",
    url: "/submit",
    icon: PlusCircle,
  },
  {
    title: "视频列表",
    url: "/videos",
    icon: FilmSlate,
  },
  {
    title: "队列状态",
    url: "/queue",
    icon: Queue,
  },
  {
    title: "API 配置",
    url: "/settings",
    icon: Gear,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-white/[0.06]">
      <SidebarHeader className="px-4 py-5">
        <Link href="/" className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
            <Play weight="fill" className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-200 group-data-[collapsible=icon]:hidden">
            VideoScope
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium tracking-wider text-zinc-500 uppercase group-data-[collapsible=icon]:hidden">
            导航
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive =
                  item.url === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.url} className="flex items-center gap-2">
                        <item.icon
                          weight={isActive ? "fill" : "regular"}
                          className="h-[18px] w-[18px]"
                        />
                        <span>{item.title}</span>
                      </Link>}
                      className={cn(
                        "transition-colors duration-200",
                        isActive
                          ? "bg-white/[0.06] text-emerald-400"
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
