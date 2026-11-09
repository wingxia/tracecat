"use client"

import {
  BookOpenIcon,
  BuildingIcon,
  InfoIcon,
  LayersIcon,
  LogOutIcon,
  LogsIcon,
  MousePointerClickIcon,
  PackageIcon,
  ShieldCheckIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuthActions } from "@/hooks/use-auth"

export function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { logout } = useAuthActions()
  const handleLogout = async () => {
    await logout()
  }

  const navPlatform = [
    {
      title: "组织",
      url: "/admin/organizations",
      icon: BuildingIcon,
      isActive: pathname?.includes("/admin/organizations"),
    },
    {
      title: "用户",
      url: "/admin/users",
      icon: UsersIcon,
      isActive: pathname?.includes("/admin/users"),
    },
    {
      title: "套餐",
      url: "/admin/tiers",
      icon: LayersIcon,
      isActive: pathname?.includes("/admin/tiers"),
    },
    {
      title: "智能体",
      url: "/admin/agent",
      icon: MousePointerClickIcon,
      isActive: pathname?.includes("/admin/agent"),
    },
    {
      title: "托管工作空间",
      url: "/admin/managed-package",
      icon: PackageIcon,
      isActive: pathname?.includes("/admin/managed-package"),
    },
    {
      title: "审计日志",
      url: "/admin/audit",
      icon: LogsIcon,
      isActive: pathname?.includes("/admin/audit"),
    },
    {
      title: "安全",
      url: "/admin/security",
      icon: ShieldCheckIcon,
      isActive: pathname?.includes("/admin/security"),
    },
    {
      title: "维护",
      url: "/admin/maintenance",
      icon: WrenchIcon,
      isActive: pathname?.includes("/admin/maintenance"),
    },
    {
      title: "构建信息",
      url: "/admin/build-info",
      icon: InfoIcon,
      isActive: pathname?.includes("/admin/build-info"),
    },
  ]

  const navRegistry = [
    {
      title: "仓库",
      url: "/admin/registry",
      isActive: pathname === "/admin/registry",
    },
    {
      title: "版本",
      url: "/admin/registry/versions",
      isActive: pathname?.includes("/admin/registry/versions"),
    },
    {
      title: "设置",
      url: "/admin/registry/settings",
      isActive: pathname?.includes("/admin/registry/settings"),
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" variant="inset" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>平台</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navPlatform.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <div className="flex w-full items-center gap-2 overflow-hidden rounded-md py-1.5 px-2 text-left text-[13px] text-sidebar-foreground">
                  <BookOpenIcon className="size-4 shrink-0" />
                  <span className="font-medium">注册表</span>
                </div>
                <SidebarMenuSub>
                  {navRegistry.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        asChild
                        isActive={subItem.isActive}
                        className="text-[13px]"
                      >
                        <Link href={subItem.url}>
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip={"退出登录"}>
              <LogOutIcon />
              <span>退出登录</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
