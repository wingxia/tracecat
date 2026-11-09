"use client"

import type { LucideIcon } from "lucide-react"
import { BookText, LockIcon, Settings, ShieldCheckIcon } from "lucide-react"
import Link from "next/link"
import { useSettingsModal } from "@/components/settings/settings-modal-context"
import { Separator } from "@/components/ui/separator"
import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { siteConfig } from "@/config/site"
import { useAuth } from "@/hooks/use-auth"
import { useOrganization } from "@/hooks/use-organization"

type SidebarUserNavManageItem = {
  title: string
  href: string
  icon: LucideIcon
  isActive?: boolean
  locked?: boolean
}

export function SidebarUserNav({
  manageItems,
  showManageLabel = true,
}: {
  manageItems?: SidebarUserNavManageItem[]
  showManageLabel?: boolean
}) {
  const { user } = useAuth()
  const { setOpen } = useSettingsModal()
  const { organization, isLoading } = useOrganization()

  return (
    <SidebarMenu>
      <Separator className="my-1" />
      {showManageLabel ? (
        <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
          管理
        </div>
      ) : null}

      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => setOpen(true)} tooltip={"设置"}>
          <Settings className="size-4" />
          <span>设置</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {manageItems?.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={item.isActive}>
            <Link href={item.href}>
              <item.icon className="size-4" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
          {item.locked ? (
            <SidebarMenuBadge>
              <LockIcon aria-hidden="true" className="size-3.5" />
              <span className="sr-only">需要升级</span>
            </SidebarMenuBadge>
          ) : null}
        </SidebarMenuItem>
      ))}

      {user?.isSuperuser && (
        <SidebarMenuItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton asChild>
                <Link href="/admin">
                  <ShieldCheckIcon className="size-4" />
                  <span>管理后台</span>
                </Link>
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isLoading ? "..." : (organization?.name ?? "组织")}
            </TooltipContent>
          </Tooltip>
        </SidebarMenuItem>
      )}

      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={"文档"}>
          <Link
            href={siteConfig.links.docs}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookText className="size-4" />
            <span>文档</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
