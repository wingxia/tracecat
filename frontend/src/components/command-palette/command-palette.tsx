"use client"

import {
  BlocksIcon,
  BotIcon,
  BoxIcon,
  BuildingIcon,
  ClipboardListIcon,
  GitBranchIcon,
  GlobeIcon,
  KeyRound,
  LayersIcon,
  ListChecksIcon,
  ListVideoIcon,
  LockIcon,
  LogInIcon,
  LogsIcon,
  type LucideIcon,
  MousePointerClickIcon,
  NetworkIcon,
  Pyramid,
  RadioTowerIcon,
  RefreshCwIcon,
  SendIcon,
  Settings,
  Settings2,
  ShieldCheckIcon,
  Sparkles,
  Table2Icon,
  TerminalIcon,
  UsersIcon,
  VariableIcon,
  VaultIcon,
  WorkflowIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSettingsModal } from "@/components/settings/settings-modal-context"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useEntitlements } from "@/hooks/use-entitlements"
import { useFormsAccess } from "@/hooks/use-forms-access"
import { useWorkflowManager, useWorkspaceManager } from "@/lib/hooks"
import { getWorkspaceLandingPath } from "@/lib/workspace-navigation"
import { useScopes } from "@/providers/scopes"
import { useOptionalWorkspaceId } from "@/providers/workspace-id"

/** A page the command palette can navigate to. */
type CommandPaletteLink = {
  title: string
  href: string
  icon: LucideIcon
  keywords?: string[]
  visible: boolean
}

/**
 * Global Cmd/Ctrl+K command palette for jumping between pages, workflows,
 * workspaces and organization settings.
 *
 * Handlers that own Cmd/Ctrl+K on a specific surface (for example the case
 * workflow trigger) call `preventDefault()` first, and the palette stays shut.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.repeat ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "k"
      ) {
        return
      }
      // While open, cmdk's own Ctrl+K binding (move up) prevents default on
      // the input, so only honour handled events when the palette is shut.
      if (event.defaultPrevented && !openRef.current) {
        return
      }
      event.preventDefault()
      setOpen((current) => !current)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      {open ? <CommandPaletteContent onClose={() => setOpen(false)} /> : null}
    </CommandDialog>
  )
}

function CommandPaletteContent({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const workspaceId = useOptionalWorkspaceId()
  const { hasScope, hasAnyScope, isLoading: scopesLoading } = useScopes()
  const { hasEntitlement } = useEntitlements()
  const formsAccess = useFormsAccess()
  const { workspaces } = useWorkspaceManager()
  const { setOpen: setSettingsOpen } = useSettingsModal()

  const navigate = useCallback(
    (href: string) => {
      onClose()
      router.push(href)
    },
    [onClose, router]
  )

  const can = (scope: string) => !scopesLoading && hasScope(scope)
  const basePath = workspaceId ? `/workspaces/${workspaceId}` : null
  const canViewWorkflows = can("workflow:read")

  const workspaceLinks: CommandPaletteLink[] = basePath
    ? [
        {
          title: "对话",
          href: `${basePath}/chat`,
          icon: SendIcon,
          keywords: ["mission control"],
          visible:
            can("agent:read") &&
            can("agent:execute") &&
            hasEntitlement("workspace_chat"),
        },
        {
          title: "工作流",
          href: `${basePath}/workflows`,
          icon: WorkflowIcon,
          visible: canViewWorkflows,
        },
        {
          title: "事件",
          href: `${basePath}/cases`,
          icon: LayersIcon,
          visible: can("case:read"),
        },
        {
          title: "智能体",
          href: `${basePath}/agents`,
          icon: MousePointerClickIcon,
          keywords: ["presets"],
          visible: can("agent:read"),
        },
        {
          title: "技能",
          href: `${basePath}/skills`,
          icon: Pyramid,
          visible: can("agent:read"),
        },
        {
          title: "表单",
          href: `${basePath}/forms`,
          icon: ClipboardListIcon,
          visible:
            (formsAccess === "enabled" || formsAccess === "locked") &&
            can("form:read") &&
            !scopesLoading &&
            hasAnyScope(["form:update", "form:submission:read"]),
        },
        {
          title: "数据表",
          href: `${basePath}/tables`,
          icon: Table2Icon,
          visible: can("table:read"),
        },
        {
          title: "变量",
          href: `${basePath}/variables`,
          icon: VariableIcon,
          visible: can("variable:read"),
        },
        {
          title: "凭据",
          href: `${basePath}/credentials`,
          icon: KeyRound,
          keywords: ["secrets"],
          visible: can("secret:read"),
        },
        {
          title: "集成",
          href: `${basePath}/integrations`,
          icon: BlocksIcon,
          keywords: ["oauth", "providers"],
          visible: can("integration:read"),
        },
        {
          title: "MCP 服务器",
          href: `${basePath}/mcp-servers`,
          icon: Sparkles,
          visible: can("integration:read"),
        },
        {
          title: "动作",
          href: `${basePath}/actions`,
          icon: BoxIcon,
          keywords: ["registry"],
          visible: can("org:registry:read"),
        },
        {
          title: "运行记录",
          href: `${basePath}/runs`,
          icon: ListVideoIcon,
          keywords: ["executions"],
          visible: canViewWorkflows,
        },
        {
          title: "收件箱",
          href: `${basePath}/inbox`,
          icon: ListChecksIcon,
          keywords: ["approvals"],
          visible: can("inbox:read"),
        },
        {
          title: "成员",
          href: `${basePath}/members`,
          icon: UsersIcon,
          keywords: ["workspace members"],
          visible: can("workspace:member:read"),
        },
        {
          title: "服务账号",
          href: `${basePath}/service-accounts`,
          icon: BotIcon,
          keywords: ["workspace service accounts"],
          visible:
            can("workspace:service_account:read") &&
            hasEntitlement("service_accounts"),
        },
        {
          title: "Git 同步",
          href: `${basePath}/git-sync`,
          icon: GitBranchIcon,
          visible:
            !scopesLoading &&
            hasAnyScope(["workspace_sync:sync", "workspace:update"]),
        },
        {
          title: "隧道",
          href: `${basePath}/tunnels`,
          icon: NetworkIcon,
          visible: can("tunnel:read"),
        },
        {
          title: "MCP 访问",
          href: `${basePath}/mcp`,
          icon: TerminalIcon,
          visible: can("workspace:read"),
        },
      ]
    : []

  const canViewOrgSettings = can("org:settings:read")
  const organizationLinks: CommandPaletteLink[] = [
    {
      title: "组织成员",
      href: "/organization/members",
      icon: UsersIcon,
      visible: can("org:member:read"),
    },
    {
      title: "组织会话",
      href: "/organization/sessions",
      icon: LogInIcon,
      visible: can("org:member:read"),
    },
    {
      title: "组织服务账号",
      href: "/organization/settings/service-accounts",
      icon: KeyRound,
      visible:
        can("org:service_account:read") && hasEntitlement("service_accounts"),
    },
    {
      title: "SAML（单点登录）",
      href: "/organization/settings/sso",
      icon: LockIcon,
      keywords: ["single sign-on"],
      visible: canViewOrgSettings,
    },
    {
      title: "域名",
      href: "/organization/settings/domains",
      icon: GlobeIcon,
      visible: canViewOrgSettings,
    },
    {
      title: "SCIM",
      href: "/organization/settings/scim",
      icon: RefreshCwIcon,
      keywords: ["provisioning"],
      visible: can("org:scim:manage"),
    },
    {
      title: "密钥存储",
      href: "/organization/settings/secret-stores",
      icon: VaultIcon,
      visible: can("org:secret:read"),
    },
    {
      title: "应用设置",
      href: "/organization/settings/app",
      icon: Settings2,
      visible: canViewOrgSettings,
    },
    {
      title: "审计日志",
      href: "/organization/settings/audit",
      icon: LogsIcon,
      visible: canViewOrgSettings,
    },
    {
      title: "IP 白名单",
      href: "/organization/settings/security",
      icon: ShieldCheckIcon,
      keywords: ["security"],
      visible: canViewOrgSettings,
    },
    {
      title: "Git 提供商",
      href: "/organization/vcs",
      icon: GitBranchIcon,
      keywords: ["vcs", "github"],
      visible: canViewOrgSettings,
    },
    {
      title: "自定义注册表",
      href: "/organization/settings/custom-registry",
      icon: BoxIcon,
      visible: canViewOrgSettings,
    },
    {
      title: "智能体配置",
      href: "/organization/settings/agent",
      icon: MousePointerClickIcon,
      keywords: ["models", "providers"],
      visible: canViewOrgSettings,
    },
    {
      title: "智能体遥测",
      href: "/organization/settings/agent/telemetry",
      icon: RadioTowerIcon,
      visible: canViewOrgSettings,
    },
  ]

  const visibleWorkspaceLinks = workspaceLinks.filter((link) => link.visible)
  const visibleOrganizationLinks = organizationLinks.filter(
    (link) => link.visible
  )

  return (
    <>
      <CommandInput placeholder={"搜索页面、工作流和工作空间…"} />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>未找到结果。</CommandEmpty>
        {visibleWorkspaceLinks.length > 0 ? (
          <CommandGroup heading="Go to">
            {visibleWorkspaceLinks.map((link) => (
              <CommandPaletteLinkItem
                key={link.href}
                link={link}
                onSelect={navigate}
              />
            ))}
          </CommandGroup>
        ) : null}
        {workspaceId && canViewWorkflows ? (
          <CommandPaletteWorkflows
            workspaceId={workspaceId}
            onSelect={navigate}
          />
        ) : null}
        {workspaces && workspaces.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={"工作空间"}>
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={`${workspace.name} ${workspace.id}`}
                  onSelect={() =>
                    navigate(getWorkspaceLandingPath(workspace.id))
                  }
                >
                  <BuildingIcon />
                  <span className="truncate">{workspace.name}</span>
                  {workspace.id === workspaceId ? (
                    <CommandShortcut className="tracking-normal">
                      当前
                    </CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
        {visibleOrganizationLinks.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={"组织"}>
              {visibleOrganizationLinks.map((link) => (
                <CommandPaletteLinkItem
                  key={link.href}
                  link={link}
                  onSelect={navigate}
                />
              ))}
            </CommandGroup>
          </>
        ) : null}
        <CommandSeparator />
        <CommandGroup heading={"常规"}>
          <CommandItem
            value="Open settings"
            keywords={["profile", "appearance", "theme", "preferences"]}
            onSelect={() => {
              onClose()
              setSettingsOpen(true)
            }}
          >
            <Settings />
            <span>打开设置</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </>
  )
}

function CommandPaletteLinkItem({
  link,
  onSelect,
}: {
  link: CommandPaletteLink
  onSelect: (href: string) => void
}) {
  const Icon = link.icon
  return (
    <CommandItem
      value={link.title}
      keywords={link.keywords}
      onSelect={() => onSelect(link.href)}
    >
      <Icon />
      <span>{link.title}</span>
    </CommandItem>
  )
}

function CommandPaletteWorkflows({
  workspaceId,
  onSelect,
}: {
  workspaceId: string
  onSelect: (href: string) => void
}) {
  const { workflows } = useWorkflowManager()

  if (!workflows || workflows.length === 0) {
    return null
  }

  return (
    <>
      <CommandSeparator />
      <CommandGroup heading={"工作流"}>
        {workflows.map((workflow, index) => (
          <CommandItem
            key={workflow.id}
            // Titles can repeat; the index keeps each cmdk value unique
            // without letting base62 IDs match unrelated searches.
            value={`${workflow.title} ${index}`}
            keywords={workflow.alias ? [workflow.alias] : undefined}
            onSelect={() =>
              onSelect(`/workspaces/${workspaceId}/workflows/${workflow.id}`)
            }
          >
            <WorkflowIcon />
            <span className="truncate">{workflow.title}</span>
            {workflow.alias ? (
              <CommandShortcut className="truncate tracking-normal">
                {workflow.alias}
              </CommandShortcut>
            ) : null}
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  )
}
