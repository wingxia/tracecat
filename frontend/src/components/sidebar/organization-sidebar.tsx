"use client"

import {
  ChevronLeftIcon,
  GitBranchIcon,
  GlobeIcon,
  HistoryIcon,
  KeyRoundIcon,
  LockIcon,
  LogInIcon,
  LogsIcon,
  MousePointerClickIcon,
  RadioTowerIcon,
  RefreshCwIcon,
  Settings2,
  ShieldCheckIcon,
  UsersIcon,
  VaultIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type * as React from "react"
import { useScopeCheck } from "@/components/auth/scope-guard"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useEntitlements } from "@/hooks/use-entitlements"

export function OrganizationSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { hasEntitlement } = useEntitlements()
  const customRegistryEnabled = hasEntitlement("custom_registry")
  const gitSyncEnabled = hasEntitlement("git_sync")
  const serviceAccountsEnabled = hasEntitlement("service_accounts")
  const externalSecretStoresEnabled = hasEntitlement("external_secret_stores")
  const rbacAddonsEnabled = hasEntitlement("rbac_addons")

  // Scope checks for org sidebar items
  const canViewSecretStores = useScopeCheck("org:secret:read")
  const canViewSettings = useScopeCheck("org:settings:read")
  const canViewServiceAccounts = useScopeCheck("org:service_account:read")
  const canViewMembers = useScopeCheck("org:member:read")
  const canManageScim = useScopeCheck("org:scim:manage")

  const navCustomRegistry = [
    {
      title: "仓库",
      url: "/organization/settings/custom-registry",
      icon: GitBranchIcon,
      isActive: pathname === "/organization/settings/custom-registry",
      visible: canViewSettings === true,
      locked: !customRegistryEnabled,
    },
    {
      title: "版本",
      url: "/organization/settings/custom-registry/versions",
      icon: HistoryIcon,
      isActive: pathname?.startsWith(
        "/organization/settings/custom-registry/versions"
      ),
      visible: canViewSettings === true,
      locked: !customRegistryEnabled,
    },
  ]

  interface OrgSettingsNavItem {
    title: string
    url: string
    icon: React.ComponentType<{ className?: string }>
    isActive: boolean | undefined
    visible: boolean
    locked: boolean
  }

  const navSettings: OrgSettingsNavItem[] = [
    {
      title: "SAML（单点登录）",
      url: "/organization/settings/sso",
      icon: LockIcon,
      isActive: pathname?.includes("/organization/settings/sso"),
      visible: canViewSettings === true,
      locked: false,
    },
    {
      title: "域名",
      url: "/organization/settings/domains",
      icon: GlobeIcon,
      isActive: pathname?.includes("/organization/settings/domains"),
      visible: canViewSettings === true,
      locked: false,
    },
    {
      title: "SCIM",
      url: "/organization/settings/scim",
      icon: RefreshCwIcon,
      isActive: pathname?.includes("/organization/settings/scim"),
      visible: canManageScim === true,
      locked: !rbacAddonsEnabled,
    },
    {
      title: "密钥存储",
      url: "/organization/settings/secret-stores",
      icon: VaultIcon,
      isActive: pathname?.includes("/organization/settings/secret-stores"),
      visible: canViewSecretStores === true,
      locked: !externalSecretStoresEnabled,
    },
    {
      title: "应用",
      url: "/organization/settings/app",
      icon: Settings2,
      isActive: pathname?.includes("/organization/settings/app"),
      visible: canViewSettings === true,
      locked: false,
    },
    {
      title: "审计日志",
      url: "/organization/settings/audit",
      icon: LogsIcon,
      isActive: pathname?.includes("/organization/settings/audit"),
      visible: canViewSettings === true,
      locked: false,
    },
    {
      title: "IP 白名单",
      url: "/organization/settings/security",
      icon: ShieldCheckIcon,
      isActive: pathname?.includes("/organization/settings/security"),
      visible: canViewSettings === true,
      locked: false,
    },
    {
      title: "Git 提供商",
      url: "/organization/vcs",
      icon: GitBranchIcon,
      isActive: pathname?.includes("/organization/vcs"),
      visible: canViewSettings === true,
      locked: !gitSyncEnabled,
    },
    // MCP settings page not yet implemented — hidden until route exists
    // {
    //   title: "MCP",
    //   url: "/organization/settings/mcp",
    //   icon: LinkIcon,
    //   isActive: pathname?.includes("/organization/settings/mcp"),
    // },
  ]

  const navAgent = [
    {
      title: "配置",
      url: "/organization/settings/agent",
      icon: MousePointerClickIcon,
      isActive: pathname === "/organization/settings/agent",
      visible: canViewSettings === true,
      locked: false,
    },
    {
      title: "遥测",
      url: "/organization/settings/agent/telemetry",
      icon: RadioTowerIcon,
      isActive: pathname?.startsWith("/organization/settings/agent/telemetry"),
      visible: canViewSettings === true,
      locked: false,
    },
  ]

  const navManage = [
    {
      title: "成员",
      url: "/organization/members",
      icon: UsersIcon,
      isActive: pathname?.includes("/organization/members"),
      visible: canViewMembers === true,
    },
    {
      title: "会话",
      url: "/organization/sessions",
      icon: LogInIcon,
      isActive: pathname?.includes("/organization/sessions"),
      visible: canViewMembers === true,
    },
    {
      title: "服务账号",
      url: "/organization/settings/service-accounts",
      icon: KeyRoundIcon,
      isActive: pathname?.includes("/organization/settings/service-accounts"),
      visible: canViewServiceAccounts === true && serviceAccountsEnabled,
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/workspaces" className="text-muted-foreground">
                <ChevronLeftIcon />
                <span>返回工作空间列表</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navSettings.some((item) => item.visible === true) && (
          <SidebarGroup>
            <SidebarGroupLabel>设置</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navSettings
                  .filter((item) => item.visible === true)
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={item.isActive}>
                        <Link href={item.url}>
                          <item.icon />
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {navAgent.some((item) => item.visible === true) && (
          <SidebarGroup>
            <SidebarGroupLabel>智能体</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navAgent
                  .filter((item) => item.visible === true)
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={item.isActive}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {navCustomRegistry.some((item) => item.visible === true) && (
          <SidebarGroup>
            <SidebarGroupLabel>自定义注册表</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navCustomRegistry
                  .filter((item) => item.visible === true)
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={item.isActive}>
                        <Link href={item.url}>
                          <item.icon />
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {navManage.some((item) => item.visible === true) && (
          <SidebarGroup>
            <SidebarGroupLabel>管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navManage
                  .filter((item) => item.visible === true)
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={item.isActive}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
