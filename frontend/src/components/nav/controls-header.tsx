"use client"

import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClockPlus,
  ExternalLinkIcon,
  FileText,
  FileUpIcon,
  Flag,
  Flame,
  FolderIcon,
  KeyRound,
  ListIcon,
  ListTreeIcon,
  LockKeyhole,
  MessageSquare,
  MousePointerClickIcon,
  PanelRight,
  PenLine,
  Plus,
  TagsIcon,
  Trash2,
  UngroupIcon,
  User,
  X,
} from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  type CaseStatus,
  casesAddTag,
  casesCreateComment,
  casesGetCase,
  casesUpdateCase,
} from "@/client"
import { AgentPresetDetailHeaderActions } from "@/components/agents/agent-preset-detail-actions"
import {
  AgentsCatalogViewMode,
  AgentsCatalogViewToggle,
} from "@/components/agents/agents-catalog-view-toggle"
import { AgentFolderCreateDialog } from "@/components/agents/agents-dashboard"
import { CreateAgentDialog } from "@/components/agents/create-agent-dialog"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { AddCaseDropdown } from "@/components/cases/add-case-dropdown"
import { AddCaseDuration } from "@/components/cases/add-case-duration"
import { AddCaseTag } from "@/components/cases/add-case-tag"
import { AddCustomField } from "@/components/cases/add-custom-field"
import { CaseAgentRunsAction } from "@/components/cases/case-agent-runs-action"
import {
  PRIORITIES,
  SEVERITIES,
  STATUSES,
} from "@/components/cases/case-categories"
import { CaseClosureDialog } from "@/components/cases/case-closure-dialog"
import { CreateCaseDialog } from "@/components/cases/case-create-dialog"
import { CaseDurationMetrics } from "@/components/cases/case-duration-metrics"
import { UNASSIGNED } from "@/components/cases/case-panel-selectors"
import { useCaseSelection } from "@/components/cases/case-selection-context"
import { CasePickerDialog } from "@/components/cases/case-sub-cases"
import { CaseVersionHistory } from "@/components/cases/case-version-history"
import {
  CasesViewMode,
  CasesViewToggle,
} from "@/components/cases/cases-view-toggle"
import { AddWorkflowTag } from "@/components/dashboard/add-workflow-tag"
import { CreateWorkflowButton } from "@/components/dashboard/create-workflow-button"
import {
  WorkflowsCatalogViewMode,
  WorkflowsCatalogViewToggle,
} from "@/components/dashboard/workflows-catalog-view-toggle"
import { DynamicLucideIcon } from "@/components/dynamic-lucide-icon"
import { FormViewToggle } from "@/components/forms/form-view-toggle"
import { CreateFormDialog } from "@/components/forms/forms-dashboard"
import { CreateCustomProviderDialog } from "@/components/integrations/create-custom-provider-dialog"
import { Spinner } from "@/components/loading/spinner"
import { ManagedResourceStatus } from "@/components/managed/managed-resource-status"
import { FolderPathBreadcrumb } from "@/components/nav/folder-path-breadcrumb"
import { CreateSkillButton } from "@/components/skills/create-skill-button"
import { SkillLibrarySkillActions } from "@/components/skills/skill-library-skill-view"
import {
  SkillsCatalogViewMode,
  SkillsCatalogViewToggle,
} from "@/components/skills/skills-catalog-view-toggle"
import { SkillFolderCreateDialog } from "@/components/skills/skills-dashboard"
import { SkillsDetailActions } from "@/components/skills/skills-detail-actions"
import { TableSelectionActionsBar } from "@/components/tables/ag-grid-bulk-actions"
import { CreateTableDialog } from "@/components/tables/table-create-dialog"
import { TableImportTableDialog } from "@/components/tables/table-import-table-dialog"
import { TableInsertButton } from "@/components/tables/table-insert-button"
import { TableSearchBadge } from "@/components/tables/table-search-badge"
import { TableSearchProvider } from "@/components/tables/table-search-context"
import { CreateTagDialog } from "@/components/tags/create-tag-dialog"
import { CreateTunnelButton } from "@/components/tunnels/workspace-tunnels"
import { useQueryClient } from "@/lib/query"
import { groupLibraryProviders } from "@/lib/skill-library"

const SimpleEditor = dynamic(
  () =>
    import("@/components/tiptap-templates/simple/simple-editor").then(
      (m) => m.SimpleEditor
    ),
  { ssr: false }
)

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { WorkspaceResourceSyncActions } from "@/components/workspace-sync/resource-sync-actions"
import { AddWorkspaceMember } from "@/components/workspaces/add-workspace-member"
import {
  NewVariableDialog,
  NewVariableDialogTrigger,
} from "@/components/workspaces/add-workspace-variable"
import { CreateCredentialDialog } from "@/components/workspaces/create-credential-dialog"
import {
  useAgentFolders,
  useAgentPreset,
  useAgentTagCatalog,
} from "@/hooks/use-agent-presets"
import { useEntitlements } from "@/hooks/use-entitlements"
import { useFormDetail, useUpdateForm } from "@/hooks/use-forms"
import { useFormsAccess } from "@/hooks/use-forms-access"
import { useSkillLibrary } from "@/hooks/use-skill-library"
import { useSkillTagCatalog } from "@/hooks/use-skill-tags"
import { useSkill } from "@/hooks/use-skills"
import { useWorkspaceDetails, useWorkspaceMembers } from "@/hooks/use-workspace"
import { getFormErrorDetail } from "@/lib/forms/errors"
import {
  useCaseDropdownDefinitions,
  useCaseDurationDefinitions,
  useCaseDurations,
  useCaseFields,
  useCaseTagCatalog,
  useGetCase,
  useGetTable,
} from "@/lib/hooks"
import { capitalizeFirst, cn } from "@/lib/utils"
import { useWorkspaceId } from "@/providers/workspace-id"

interface PageConfig {
  title: string | ReactNode
  actions?: ReactNode
}

interface ControlsHeaderProps {
  /** Callback to toggle the chat sidebar */
  onToggleChat?: () => void
}

const CHAT_TOGGLE_KEY = "c"

function WorkflowsActions() {
  const pathname = usePathname()
  const workspaceId = useWorkspaceId()
  const searchParams = useSearchParams()
  const catalogView = pathname?.includes("/workflows/tags")
    ? WorkflowsCatalogViewMode.Tags
    : WorkflowsCatalogViewMode.Workflows
  const view = searchParams?.get("view") === "list" ? "list" : "folders"
  const currentPath =
    view === "folders" ? searchParams?.get("path") || "/" : null
  const workflowsHref = `/workspaces/${workspaceId}/workflows`
  const tagsHref = `/workspaces/${workspaceId}/workflows/tags`

  return (
    <>
      <WorkflowsCatalogViewToggle
        view={catalogView}
        workflowsHref={workflowsHref}
        tagsHref={tagsHref}
      />
      <WorkspaceResourceSyncActions
        label={"个工作流"}
        branchSlug="workflows"
        resources={["workflow"]}
      />
      {catalogView === WorkflowsCatalogViewMode.Tags ? (
        <AddWorkflowTag />
      ) : (
        <CreateWorkflowButton
          view={view === "folders" ? "folders" : "default"}
          currentFolderPath={currentPath}
        />
      )}
    </>
  )
}

function WorkflowsBreadcrumb({
  workspaceId,
  path,
}: {
  workspaceId: string
  path: string | null
}) {
  return (
    <FolderPathBreadcrumb
      rootLabel={"工作流"}
      rootHref={`/workspaces/${workspaceId}/workflows`}
      folderPath={path}
    />
  )
}

function TablesActions() {
  const [activeDialog, setActiveDialog] = useState<"create" | "import" | null>(
    null
  )

  return (
    <>
      <WorkspaceResourceSyncActions
        label={"个数据表"}
        branchSlug="tables"
        resources={["table"]}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 bg-background">
            <Plus className="mr-1 h-3.5 w-3.5" />
            创建
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="
            [&_[data-radix-collection-item]]:flex
            [&_[data-radix-collection-item]]:items-center
            [&_[data-radix-collection-item]]:gap-2
          "
        >
          <DropdownMenuItem onSelect={() => setActiveDialog("create")}>
            <Plus className="size-4 text-foreground/80" />
            <div className="flex flex-col text-xs">
              <span>数据表</span>
              <span className="text-xs text-muted-foreground">手动定义列</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setActiveDialog("import")}>
            <FileUpIcon className="size-4 text-foreground/80" />
            <div className="flex flex-col text-xs">
              <span>从 CSV 导入</span>
              <span className="text-xs text-muted-foreground">
                从 CSV 文件推断列并导入数据
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateTableDialog
        open={activeDialog === "create"}
        onOpenChange={(open) => setActiveDialog(open ? "create" : null)}
      />
      <TableImportTableDialog
        open={activeDialog === "import"}
        onOpenChange={(open) => setActiveDialog(open ? "import" : null)}
      />
    </>
  )
}

function IntegrationsActions() {
  const [oauthDialogOpen, setOauthDialogOpen] = useState(false)
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false)
  const canCreateSecrets = useScopeCheck("secret:create") === true

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 bg-background">
            <Plus className="mr-1 h-3.5 w-3.5" />
            添加集成
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="
            [&_[data-radix-collection-item]]:flex
            [&_[data-radix-collection-item]]:items-center
            [&_[data-radix-collection-item]]:gap-2
          "
        >
          <DropdownMenuGroup>
            {canCreateSecrets ? (
              <DropdownMenuItem onSelect={() => setCredentialDialogOpen(true)}>
                <KeyRound className="size-4 text-foreground/80" />
                <div className="flex flex-col text-xs">
                  <span>键值凭据</span>
                  <span className="text-xs text-muted-foreground">
                    保存 API 密钥和令牌
                  </span>
                </div>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => setOauthDialogOpen(true)}>
              <LockKeyhole className="size-4 text-foreground/80" />
              <div className="flex flex-col text-xs">
                <span>自定义 OAuth 提供商</span>
                <span className="text-xs text-muted-foreground">
                  配置 OAuth 应用凭据
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateCredentialDialog
        open={credentialDialogOpen}
        onOpenChange={setCredentialDialogOpen}
      />
      <CreateCustomProviderDialog
        open={oauthDialogOpen}
        onOpenChange={setOauthDialogOpen}
        hideTrigger
      />
    </>
  )
}

function SkillsActions() {
  const pathname = usePathname()
  const workspaceId = useWorkspaceId()
  const searchParams = useSearchParams()
  const canCreateSkill = useScopeCheck("agent:create")
  const { hasEntitlement } = useEntitlements()
  const organizationEnabled = hasEntitlement("agent_addons")
  const [createTagDialogOpen, setCreateTagDialogOpen] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  let catalogView = SkillsCatalogViewMode.Skills
  if (pathname?.includes("/skills/tags")) {
    catalogView = SkillsCatalogViewMode.Tags
  } else if (pathname?.includes("/skills/library")) {
    catalogView = SkillsCatalogViewMode.Library
  }
  const skillsHref = `/workspaces/${workspaceId}/skills`
  const tagsHref = `/workspaces/${workspaceId}/skills/tags`
  const libraryHref = `/workspaces/${workspaceId}/skills/library`
  const isFoldersView =
    organizationEnabled && searchParams?.get("view") !== "list"
  const currentPath = normalizeAgentActionPath(
    searchParams?.get("path") ?? null
  )
  const canUseSkillActions = canCreateSkill === true

  let skillActionControls: ReactNode = null
  if (canUseSkillActions) {
    if (catalogView === SkillsCatalogViewMode.Tags) {
      if (organizationEnabled) {
        skillActionControls = (
          <AddSkillTag
            open={createTagDialogOpen}
            onOpenChange={setCreateTagDialogOpen}
          />
        )
      }
    } else if (catalogView === SkillsCatalogViewMode.Skills) {
      skillActionControls = (
        <>
          <CreateSkillButton
            currentPath={isFoldersView ? currentPath : null}
            showFolder={isFoldersView}
            onCreateFolder={() => setFolderDialogOpen(true)}
          />
          {organizationEnabled ? (
            <SkillFolderCreateDialog
              open={folderDialogOpen}
              onOpenChange={setFolderDialogOpen}
              currentPath={currentPath}
            />
          ) : null}
        </>
      )
    } else if (catalogView === SkillsCatalogViewMode.Library) {
      // Library skills are installed per row; keep a disabled placeholder so
      // the header doesn't shift when switching tabs.
      skillActionControls = (
        <Button
          variant="outline"
          size="sm"
          className="h-7 bg-background"
          disabled
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          创建
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      )
    }
  }

  return (
    <>
      <SkillsCatalogViewToggle
        view={catalogView}
        skillsHref={skillsHref}
        tagsHref={organizationEnabled ? tagsHref : undefined}
        libraryHref={libraryHref}
      />
      <WorkspaceResourceSyncActions
        label={"个技能"}
        branchSlug="skills"
        resources={["skill"]}
      />
      {skillActionControls}
    </>
  )
}

function AddSkillTag({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const workspaceId = useWorkspaceId()
  const { skillTags, createSkillTag } = useSkillTagCatalog(workspaceId, {
    enabled: open,
  })

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 bg-background"
        onClick={() => onOpenChange(true)}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        创建标签
      </Button>
      <CreateTagDialog
        open={open}
        onOpenChange={onOpenChange}
        existingTags={skillTags}
        onCreateTag={async (params) => {
          await createSkillTag(params)
        }}
        title={"创建标签"}
        description={"输入新技能标签的名称。"}
      />
    </>
  )
}

function BreadcrumbEntityPage({
  label,
  skeletonClassName,
}: {
  label?: string | null
  skeletonClassName: string
}) {
  if (!label) {
    return <Skeleton className={skeletonClassName} />
  }

  return (
    <BreadcrumbPage className="font-semibold text-muted-foreground">
      {label}
    </BreadcrumbPage>
  )
}

function SkillsBreadcrumb({
  workspaceId,
  skillId,
}: {
  workspaceId: string
  skillId: string
}) {
  const { skill } = useSkill(workspaceId, skillId)

  return (
    <Breadcrumb>
      <BreadcrumbList className="relative z-10 flex items-center gap-2 text-sm flex-nowrap overflow-hidden whitespace-nowrap min-w-0 bg-transparent pr-1">
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="font-semibold hover:no-underline">
            <Link href={`/workspaces/${workspaceId}/skills`}>技能</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="shrink-0">
          <span className="text-muted-foreground">/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem className="gap-2">
          <BreadcrumbEntityPage
            label={skill?.name}
            skeletonClassName="h-4 w-28"
          />
          {skill && (
            <ManagedResourceStatus
              resourceType="skill"
              id={skill.id}
              name={skill.slug}
              showDetach
            />
          )}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function SkillLibraryProviderBreadcrumb({
  workspaceId,
  providerSlug,
  skillSlug,
}: {
  workspaceId: string
  /** Omitted on the library index, where Library is the current page. */
  providerSlug?: string
  /** Set on a skill preview; the provider crumb then links to its page. */
  skillSlug?: string
}) {
  const canRead = useScopeCheck("agent:read") === true
  const { librarySkills } = useSkillLibrary(workspaceId, { enabled: canRead })
  const provider = useMemo(
    () =>
      groupLibraryProviders(librarySkills ?? []).find((candidate) =>
        skillSlug
          ? candidate.skills.some((skill) => skill.slug === skillSlug)
          : candidate.slug === providerSlug
      ),
    [librarySkills, providerSlug, skillSlug]
  )
  // A one-skill entry has no overview page to link back to.
  const showProviderCrumb =
    providerSlug !== undefined &&
    (!skillSlug || (provider?.skills.length ?? 0) > 1)

  return (
    <Breadcrumb>
      <BreadcrumbList className="relative z-10 flex items-center gap-2 text-sm flex-nowrap overflow-hidden whitespace-nowrap min-w-0 bg-transparent pr-1">
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="font-semibold hover:no-underline">
            <Link href={`/workspaces/${workspaceId}/skills`}>技能</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="shrink-0">
          <span className="text-muted-foreground">/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem className="gap-1.5">
          {providerSlug === undefined ? (
            <BreadcrumbPage className="font-semibold text-muted-foreground">
              资源库
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild className="text-muted-foreground">
              <Link href={`/workspaces/${workspaceId}/skills/library`}>
                资源库
              </Link>
            </BreadcrumbLink>
          )}
          <span className="shrink-0 rounded-full border px-1.5 py-px text-[10px] font-medium leading-none text-muted-foreground">
            测试版
          </span>
        </BreadcrumbItem>
        {showProviderCrumb ? (
          <>
            <BreadcrumbSeparator className="shrink-0">
              <span className="text-muted-foreground">/</span>
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {skillSlug ? (
                <BreadcrumbLink asChild className="text-muted-foreground">
                  <Link
                    href={`/workspaces/${workspaceId}/skills/library/${providerSlug}`}
                  >
                    {provider?.name ?? providerSlug}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbEntityPage
                  label={provider?.name}
                  skeletonClassName="h-4 w-20"
                />
              )}
            </BreadcrumbItem>
          </>
        ) : null}
        {skillSlug ? (
          <>
            <BreadcrumbSeparator className="shrink-0">
              <span className="text-muted-foreground">/</span>
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-muted-foreground">
                {skillSlug}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function normalizeAgentActionPath(rawPath: string | null): string {
  if (!rawPath || rawPath === "/") {
    return "/"
  }
  const withLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`
  return withLeadingSlash.endsWith("/") && withLeadingSlash !== "/"
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash
}

function AgentFoldersBreadcrumb({
  workspaceId,
  path,
}: {
  workspaceId: string
  path: string | null
}) {
  const { hasEntitlement } = useEntitlements()
  const organizationEnabled = hasEntitlement("agent_addons")
  return (
    <FolderPathBreadcrumb
      rootLabel={"智能体"}
      rootHref={`/workspaces/${workspaceId}/agents`}
      folderPath={organizationEnabled ? path : "/"}
    />
  )
}

function SkillsFoldersBreadcrumb({
  workspaceId,
  path,
}: {
  workspaceId: string
  path: string | null
}) {
  const { hasEntitlement } = useEntitlements()
  const organizationEnabled = hasEntitlement("agent_addons")
  return (
    <FolderPathBreadcrumb
      rootLabel={"技能"}
      rootHref={`/workspaces/${workspaceId}/skills`}
      folderPath={organizationEnabled ? path : "/"}
    />
  )
}

function AgentsActions() {
  const pathname = usePathname()
  const workspaceId = useWorkspaceId()
  const searchParams = useSearchParams()
  const canCreateAgent = useScopeCheck("agent:create")
  const { hasEntitlement } = useEntitlements()
  // Folders and tags are agent add-ons; core preset creation is not.
  const organizationEnabled = hasEntitlement("agent_addons")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createTagDialogOpen, setCreateTagDialogOpen] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)

  const catalogView = pathname?.includes("/agents/tags")
    ? AgentsCatalogViewMode.Tags
    : AgentsCatalogViewMode.Agents
  const agentsHref = `/workspaces/${workspaceId}/agents`
  const tagsHref = `/workspaces/${workspaceId}/agents/tags`
  const isFoldersView =
    organizationEnabled && searchParams?.get("view") !== "list"
  const currentPath = normalizeAgentActionPath(
    searchParams?.get("path") ?? null
  )
  const canUseAgentActions = canCreateAgent === true
  let agentActionControls: ReactNode = null

  if (canUseAgentActions) {
    if (catalogView === AgentsCatalogViewMode.Tags) {
      if (organizationEnabled) {
        agentActionControls = (
          <AddAgentTag
            open={createTagDialogOpen}
            onOpenChange={setCreateTagDialogOpen}
          />
        )
      }
    } else {
      agentActionControls = (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 bg-background">
                <Plus className="mr-1 h-3.5 w-3.5" />
                创建
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="
                [&_[data-radix-collection-item]]:flex
                [&_[data-radix-collection-item]]:items-center
                [&_[data-radix-collection-item]]:gap-2
              "
            >
              <DropdownMenuItem onSelect={() => setCreateDialogOpen(true)}>
                <MousePointerClickIcon className="size-4 text-foreground/80" />
                <div className="flex flex-col text-xs">
                  <span>智能体</span>
                  <span className="text-xs text-muted-foreground">
                    从头开始
                  </span>
                </div>
              </DropdownMenuItem>
              {isFoldersView && (
                <DropdownMenuItem onSelect={() => setFolderDialogOpen(true)}>
                  <FolderIcon className="size-4 text-foreground/80" />
                  <div className="flex flex-col text-xs">
                    <span>文件夹</span>
                    <span className="text-xs text-muted-foreground">
                      智能体分组
                    </span>
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <CreateAgentDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            currentPath={isFoldersView ? currentPath : null}
          />
          {organizationEnabled ? (
            <AgentFolderCreateDialog
              open={folderDialogOpen}
              onOpenChange={setFolderDialogOpen}
              currentPath={currentPath}
            />
          ) : null}
        </>
      )
    }
  }

  return (
    <>
      {organizationEnabled ? (
        <AgentsCatalogViewToggle
          view={catalogView}
          agentsHref={agentsHref}
          tagsHref={tagsHref}
        />
      ) : null}
      <WorkspaceResourceSyncActions
        label={"个智能体"}
        branchSlug="agents"
        resources={["agent_preset"]}
      />
      {agentActionControls}
    </>
  )
}

function AddAgentTag({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const workspaceId = useWorkspaceId()
  const { agentTags, createAgentTag } = useAgentTagCatalog(workspaceId, {
    enabled: open,
  })

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 bg-background"
        onClick={() => onOpenChange(true)}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        创建标签
      </Button>
      <CreateTagDialog
        open={open}
        onOpenChange={onOpenChange}
        existingTags={agentTags}
        onCreateTag={async (params) => {
          await createAgentTag(params)
        }}
        title={"创建标签"}
        description={"输入新智能体标签的名称。"}
      />
    </>
  )
}

function CasesActions() {
  const pathname = usePathname()
  const workspaceId = useWorkspaceId()
  const [dialogOpen, setDialogOpen] = useState(false)

  const view = pathname?.includes("/cases/custom-fields")
    ? CasesViewMode.CustomFields
    : pathname?.includes("/cases/closure-requirements")
      ? CasesViewMode.ClosureRequirements
      : pathname?.includes("/cases/durations")
        ? CasesViewMode.Durations
        : pathname?.includes("/cases/tags")
          ? CasesViewMode.Tags
          : pathname?.includes("/cases/dropdowns")
            ? CasesViewMode.Dropdowns
            : CasesViewMode.Cases

  const casesHref = workspaceId ? `/workspaces/${workspaceId}/cases` : undefined
  const tagsHref = workspaceId
    ? `/workspaces/${workspaceId}/cases/tags`
    : undefined
  const customFieldsHref = workspaceId
    ? `/workspaces/${workspaceId}/cases/custom-fields`
    : undefined
  const dropdownsHref = workspaceId
    ? `/workspaces/${workspaceId}/cases/dropdowns`
    : undefined
  const closureRequirementsHref = workspaceId
    ? `/workspaces/${workspaceId}/cases/closure-requirements`
    : undefined
  const durationsHref = workspaceId
    ? `/workspaces/${workspaceId}/cases/durations`
    : undefined
  let syncActions: ReactNode = null
  if (view === CasesViewMode.CustomFields) {
    syncActions = (
      <WorkspaceResourceSyncActions
        label={"事件自定义字段"}
        branchSlug="case-fields"
        resources={["case_field"]}
      />
    )
  } else if (view === CasesViewMode.Durations) {
    syncActions = (
      <WorkspaceResourceSyncActions
        label={"事件时长指标"}
        branchSlug="case-durations"
        resources={["case_duration"]}
      />
    )
  } else if (view === CasesViewMode.Tags) {
    syncActions = (
      <WorkspaceResourceSyncActions
        label={"事件标签"}
        branchSlug="case-tags"
        resources={["case_tag"]}
      />
    )
  } else if (view === CasesViewMode.Dropdowns) {
    syncActions = (
      <WorkspaceResourceSyncActions
        label={"事件下拉字段"}
        branchSlug="case-dropdowns"
        resources={["case_dropdown"]}
      />
    )
  } else if (view === CasesViewMode.ClosureRequirements) {
    // Nothing to push or create here; keep disabled placeholders so the
    // header doesn't shift when switching tabs.
    syncActions = (
      <WorkspaceResourceSyncActions
        label={"关闭条件"}
        branchSlug="case-closure-requirements"
        resources={["case_field", "case_dropdown"]}
        disabled
      />
    )
  } else {
    // Cases themselves aren't synced; keep Push aligned with the settings tabs.
    syncActions = (
      <WorkspaceResourceSyncActions
        label={"个事件"}
        branchSlug="cases"
        resources={["case_tag", "case_field", "case_dropdown", "case_duration"]}
        disabled
      />
    )
  }

  return (
    <>
      <CasesViewToggle
        view={view}
        casesHref={casesHref}
        tagsHref={tagsHref}
        customFieldsHref={customFieldsHref}
        dropdownsHref={dropdownsHref}
        closureRequirementsHref={closureRequirementsHref}
        durationsHref={durationsHref}
      />
      {syncActions}
      {view === CasesViewMode.CustomFields ? (
        <AddCustomField />
      ) : view === CasesViewMode.Durations ? (
        <AddCaseDuration />
      ) : view === CasesViewMode.Tags ? (
        <AddCaseTag />
      ) : view === CasesViewMode.Dropdowns ? (
        <AddCaseDropdown />
      ) : view === CasesViewMode.ClosureRequirements ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 bg-background"
          disabled
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          创建
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-7 bg-background"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            创建事件
          </Button>
          <CreateCaseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </>
      )}
    </>
  )
}

function CasesSelectionActionsBar({ enabled = true }: { enabled?: boolean }) {
  const {
    selectedCount,
    selectedCaseIds,
    clearSelection,
    deleteSelected,
    bulkUpdateSelectedCases,
    isDeleting,
    isUpdating,
    setParentForSelectedCases,
    isChangingParent,
  } = useCaseSelection()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [isApplyingTags, setIsApplyingTags] = useState(false)
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [isAddingComments, setIsAddingComments] = useState(false)
  const [appendDialogOpen, setAppendDialogOpen] = useState(false)
  const [appendText, setAppendText] = useState("")
  const [isAppending, setIsAppending] = useState(false)
  const [parentPickerOpen, setParentPickerOpen] = useState(false)
  const workspaceId = useWorkspaceId()
  const queryClient = useQueryClient()
  const { hasEntitlement } = useEntitlements()
  const caseAddonsEnabled = hasEntitlement("case_addons")
  const shouldLoadCatalogData = enabled && selectedCount > 0
  const { members, membersLoading } = useWorkspaceMembers(workspaceId, {
    enabled: shouldLoadCatalogData,
  })
  const { caseTags, caseTagsIsLoading } = useCaseTagCatalog(workspaceId, {
    enabled: shouldLoadCatalogData,
  })
  const { dropdownDefinitions, dropdownDefinitionsIsLoading } =
    useCaseDropdownDefinitions(
      workspaceId,
      shouldLoadCatalogData && caseAddonsEnabled
    )
  const { caseFields: caseFieldDefinitions } = useCaseFields(
    workspaceId,
    shouldLoadCatalogData && caseAddonsEnabled
  )
  const [closureDialog, setClosureDialog] = useState<{
    open: boolean
    targetStatus: CaseStatus
  } | null>(null)

  // All callbacks must be defined before any early returns to satisfy React's rules of hooks
  const handleToggleTagSelection = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }, [])

  const handleApplyTags = useCallback(async () => {
    if (selectedTagIds.size === 0 || selectedCaseIds.length === 0) {
      return
    }

    setIsApplyingTags(true)
    try {
      // Apply each selected tag to each selected case
      const promises = selectedCaseIds.flatMap((caseId) =>
        Array.from(selectedTagIds).map((tagId) =>
          casesAddTag({
            caseId,
            workspaceId,
            requestBody: { tag_id: tagId },
          })
        )
      )

      await Promise.all(promises)

      // Invalidate queries to refresh the data
      await queryClient.invalidateQueries({ queryKey: ["cases"] })

      const tagNames = caseTags
        ?.filter((t) => selectedTagIds.has(t.id))
        .map((t) => t.name)
        .join(", ")

      const caseCount = selectedCaseIds.length
      toast({
        title: "已应用标签",
        description: `已将 ${selectedTagIds.size} 个标签${selectedTagIds.size === 1 ? "" : ""}（${tagNames}）应用到 ${caseCount} 个事件${caseCount === 1 ? "" : ""}。`,
      })

      // Clear selection after applying
      setSelectedTagIds(new Set())
    } catch (error) {
      console.error("Failed to apply tags:", error)
      toast({
        title: "错误",
        description: "部分标签应用失败，请重试。",
        variant: "destructive",
      })
    } finally {
      setIsApplyingTags(false)
    }
  }, [selectedTagIds, selectedCaseIds, workspaceId, queryClient, caseTags])

  const handleBulkAddComment = useCallback(async () => {
    if (!commentText.trim() || selectedCaseIds.length === 0) return

    setIsAddingComments(true)
    try {
      await Promise.all(
        selectedCaseIds.map((caseId) =>
          casesCreateComment({
            caseId,
            workspaceId,
            requestBody: { content: commentText.trim() },
          })
        )
      )

      await queryClient.invalidateQueries({ queryKey: ["cases"] })

      const caseCount = selectedCaseIds.length
      toast({
        title: "已添加评论",
        description: `已向 ${caseCount} 个事件${caseCount === 1 ? "" : ""}添加评论。`,
      })

      setCommentText("")
      setCommentDialogOpen(false)
    } catch (error) {
      console.error("Failed to add comments:", error)
      toast({
        title: "错误",
        description: "部分事件添加评论失败，请重试。",
        variant: "destructive",
      })
    } finally {
      setIsAddingComments(false)
    }
  }, [commentText, selectedCaseIds, workspaceId, queryClient])

  const handleBulkAppendDescription = useCallback(async () => {
    if (!appendText.trim() || selectedCaseIds.length === 0) return

    setIsAppending(true)
    try {
      const cases = await Promise.all(
        selectedCaseIds.map((caseId) => casesGetCase({ caseId, workspaceId }))
      )

      await Promise.all(
        cases.map((c) =>
          casesUpdateCase({
            caseId: c.id,
            workspaceId,
            requestBody: {
              description:
                (c.description ? `${c.description}\n\n` : "") +
                appendText.trim(),
            },
          })
        )
      )

      await queryClient.invalidateQueries({ queryKey: ["cases"] })

      const caseCount = selectedCaseIds.length
      toast({
        title: "已更新描述",
        description: `已向 ${caseCount} 个事件${caseCount === 1 ? "" : ""}追加文本。`,
      })

      setAppendText("")
      setAppendDialogOpen(false)
    } catch (error) {
      console.error("Failed to append to descriptions:", error)
      toast({
        title: "错误",
        description: "部分事件描述更新失败，请重试。",
        variant: "destructive",
      })
    } finally {
      setIsAppending(false)
    }
  }, [appendText, selectedCaseIds, workspaceId, queryClient])

  const statusOptions = Object.values(STATUSES)
  const priorityOptions = Object.values(PRIORITIES)
  const severityOptions = Object.values(SEVERITIES)
  const assigneeOptions = [
    {
      value: UNASSIGNED,
      label: "未分配",
    },
    ...(members?.map((member) => ({
      value: member.user_id,
      label: member.email,
    })) ?? []),
  ]

  if (!selectedCount || selectedCount === 0) {
    return null
  }

  const isBusy =
    Boolean(isDeleting) ||
    Boolean(isUpdating) ||
    isApplyingTags ||
    isAddingComments ||
    isAppending ||
    Boolean(isChangingParent)
  const canUpdate = Boolean(bulkUpdateSelectedCases) && !isBusy
  const canChangeParent = Boolean(setParentForSelectedCases) && !isBusy
  const pluralisedCases = `${selectedCount} 个事件`
  const canApplyTags = !isBusy && caseTags && caseTags.length > 0

  const handleClearSelection = () => {
    if (isBusy) {
      return
    }
    clearSelection?.()
  }

  const handleDelete = async () => {
    if (!deleteSelected) {
      return
    }
    await deleteSelected()
    setConfirmDeleteOpen(false)
  }

  return (
    <>
      <ButtonGroup className="max-w-full">
        <ButtonGroupText className="h-7 px-4 text-xs">
          <span className="font-medium">{selectedCount}</span>
          <span>已选择 {selectedCount === 1 ? "事件" : "个事件"}</span>
          {clearSelection && (
            <button
              type="button"
              onClick={handleClearSelection}
              disabled={isBusy}
              className={cn(
                "ml-1 flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted",
                isBusy && "cursor-not-allowed opacity-60 hover:bg-transparent"
              )}
              aria-label={"清除事件选择"}
            >
              <X className="size-3.5" />
            </button>
          )}
        </ButtonGroupText>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs font-medium"
              disabled={isBusy || !bulkUpdateSelectedCases}
            >
              {isBusy && <Spinner className="mr-2 size-3" />}
              动作
              <ChevronDown className="ml-1 size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-44">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={!canUpdate}>
                <span className="flex items-center gap-2">
                  <Flag className="size-3 text-muted-foreground" aria-hidden />
                  <span>状态</span>
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {statusOptions.map((status) => (
                  <DropdownMenuItem
                    key={status.value}
                    disabled={!canUpdate}
                    className="flex items-center gap-2"
                    onSelect={async () => {
                      if (!bulkUpdateSelectedCases) {
                        return
                      }
                      // Intercept closed/resolved for closure requirements
                      if (
                        caseAddonsEnabled &&
                        (status.value === "closed" ||
                          status.value === "resolved")
                      ) {
                        const reqFields =
                          caseFieldDefinitions?.filter(
                            (f) => !f.reserved && f.required_on_closure
                          ) ?? []
                        const reqDropdowns =
                          dropdownDefinitions?.filter(
                            (d) => d.required_on_closure
                          ) ?? []
                        if (reqFields.length > 0 || reqDropdowns.length > 0) {
                          setClosureDialog({
                            open: true,
                            targetStatus: status.value,
                          })
                          return
                        }
                      }
                      await bulkUpdateSelectedCases(
                        { status: status.value },
                        {
                          successTitle: `状态已设置为${status.label}`,
                          successDescription: `已应用到${pluralisedCases}。`,
                        }
                      )
                    }}
                  >
                    {status.icon && (
                      <status.icon
                        className="size-3 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    <span>{status.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={!canUpdate}>
                <span className="flex items-center gap-2">
                  <AlertTriangle
                    className="size-3 text-muted-foreground"
                    aria-hidden
                  />
                  <span>优先级</span>
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {priorityOptions.map((priority) => (
                  <DropdownMenuItem
                    key={priority.value}
                    disabled={!canUpdate}
                    className="flex items-center gap-2"
                    onSelect={async () => {
                      if (!bulkUpdateSelectedCases) {
                        return
                      }
                      await bulkUpdateSelectedCases(
                        { priority: priority.value },
                        {
                          successTitle: `优先级已设置为${priority.label}`,
                          successDescription: `已应用到${pluralisedCases}。`,
                        }
                      )
                    }}
                  >
                    {priority.icon && (
                      <priority.icon
                        className="size-3 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    <span>{priority.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={!canUpdate}>
                <span className="flex items-center gap-2">
                  <Flame className="size-3 text-muted-foreground" aria-hidden />
                  <span>严重程度</span>
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {severityOptions.map((severity) => (
                  <DropdownMenuItem
                    key={severity.value}
                    disabled={!canUpdate}
                    className="flex items-center gap-2"
                    onSelect={async () => {
                      if (!bulkUpdateSelectedCases) {
                        return
                      }
                      await bulkUpdateSelectedCases(
                        { severity: severity.value },
                        {
                          successTitle: `严重程度已设置为${severity.label}`,
                          successDescription: `已应用到${pluralisedCases}。`,
                        }
                      )
                    }}
                  >
                    {severity.icon && (
                      <severity.icon
                        className="size-3 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    <span>{severity.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {caseAddonsEnabled && dropdownDefinitionsIsLoading && (
              <DropdownMenuItem disabled>
                <Spinner className="mr-2 size-3" /> 正在加载下拉字段…
              </DropdownMenuItem>
            )}
            {caseAddonsEnabled &&
              !dropdownDefinitionsIsLoading &&
              dropdownDefinitions?.map((definition) => (
                <DropdownMenuSub key={definition.id}>
                  <DropdownMenuSubTrigger disabled={!canUpdate}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0">
                        {definition.icon_name ? (
                          <DynamicLucideIcon
                            name={definition.icon_name}
                            className="size-3 text-muted-foreground"
                            fallback={
                              <ListIcon className="size-3 text-muted-foreground" />
                            }
                          />
                        ) : (
                          <ListIcon className="size-3 text-muted-foreground" />
                        )}
                      </span>
                      <span className="truncate" title={definition.name}>
                        {definition.name}
                      </span>
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48">
                    <DropdownMenuItem
                      disabled={!canUpdate}
                      className="flex items-center gap-2"
                      onSelect={async () => {
                        if (!bulkUpdateSelectedCases) return
                        await bulkUpdateSelectedCases(
                          {
                            dropdown_values: [
                              {
                                definition_id: definition.id,
                                option_id: null,
                              },
                            ],
                          },
                          {
                            successTitle: `${definition.name} cleared`,
                            successDescription: `已应用到${pluralisedCases}。`,
                          }
                        )
                      }}
                    >
                      <span className="text-muted-foreground">无</span>
                    </DropdownMenuItem>
                    {definition.options?.map((opt) => {
                      const optionStyle = opt.color
                        ? ({ color: opt.color } as React.CSSProperties)
                        : undefined
                      return (
                        <DropdownMenuItem
                          key={opt.id}
                          disabled={!canUpdate}
                          className="flex items-center gap-2"
                          onSelect={async () => {
                            if (!bulkUpdateSelectedCases) return
                            await bulkUpdateSelectedCases(
                              {
                                dropdown_values: [
                                  {
                                    definition_id: definition.id,
                                    option_id: opt.id,
                                  },
                                ],
                              },
                              {
                                successTitle: `${definition.name} 已设置为 ${opt.label}`,
                                successDescription: `已应用到${pluralisedCases}。`,
                              }
                            )
                          }}
                        >
                          {opt.icon_name ? (
                            <DynamicLucideIcon
                              name={opt.icon_name}
                              className="size-3"
                              style={optionStyle}
                              fallback={
                                <span
                                  className="size-3 shrink-0 rounded-full bg-muted-foreground/40"
                                  style={optionStyle}
                                />
                              }
                            />
                          ) : opt.color ? (
                            <span
                              className="size-3 shrink-0 rounded-full"
                              style={{ backgroundColor: opt.color }}
                            />
                          ) : null}
                          <span style={optionStyle}>{opt.label}</span>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={!canUpdate}>
                <span className="flex items-center gap-2">
                  <User className="size-3 text-muted-foreground" aria-hidden />
                  <span>分配给</span>
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {membersLoading && (
                  <DropdownMenuItem disabled>
                    <Spinner className="mr-2 size-3" /> 正在加载负责人…
                  </DropdownMenuItem>
                )}
                {!membersLoading && assigneeOptions.length <= 1 && (
                  <DropdownMenuItem disabled>未找到成员</DropdownMenuItem>
                )}
                {!membersLoading &&
                  assigneeOptions.map((assignee) => (
                    <DropdownMenuItem
                      key={assignee.value}
                      disabled={!canUpdate}
                      onSelect={async () => {
                        if (!bulkUpdateSelectedCases) {
                          return
                        }
                        const isUnassigned = assignee.value === UNASSIGNED
                        await bulkUpdateSelectedCases(
                          { assignee_id: isUnassigned ? null : assignee.value },
                          {
                            successTitle: isUnassigned
                              ? "事件已取消分配"
                              : `已分配给 ${assignee.label}`,
                            successDescription: `已应用到${pluralisedCases}。`,
                          }
                        )
                      }}
                    >
                      {assignee.label}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={!canApplyTags}>
                <span className="flex items-center gap-2">
                  <TagsIcon
                    className="size-3 text-muted-foreground"
                    aria-hidden
                  />
                  <span>应用标签</span>
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {caseTagsIsLoading && (
                  <DropdownMenuItem disabled>
                    <Spinner className="mr-2 size-3" /> 正在加载标签…
                  </DropdownMenuItem>
                )}
                {!caseTagsIsLoading && (!caseTags || caseTags.length === 0) && (
                  <DropdownMenuItem disabled>暂无可用标签</DropdownMenuItem>
                )}
                {!caseTagsIsLoading && caseTags && caseTags.length > 0 && (
                  <>
                    <div className="max-h-48 overflow-y-auto">
                      {caseTags.map((tag) => {
                        const isSelected = selectedTagIds.has(tag.id)
                        return (
                          <DropdownMenuItem
                            key={tag.id}
                            disabled={isBusy}
                            className="flex items-center gap-2"
                            onSelect={(e) => {
                              e.preventDefault()
                              handleToggleTagSelection(tag.id)
                            }}
                          >
                            <div
                              className={cn(
                                "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40"
                              )}
                            >
                              {isSelected && (
                                <Check className="size-3" aria-hidden />
                              )}
                            </div>
                            <div
                              className="size-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor: tag.color || undefined,
                              }}
                            />
                            <span className="truncate">{tag.name}</span>
                          </DropdownMenuItem>
                        )
                      })}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={selectedTagIds.size === 0 || isBusy}
                      className="justify-center font-medium"
                      onSelect={async (e) => {
                        e.preventDefault()
                        await handleApplyTags()
                      }}
                    >
                      {isApplyingTags ? (
                        <>
                          <Spinner className="mr-2 size-3" />
                          应用中…
                        </>
                      ) : (
                        <>
                          应用{" "}
                          {selectedTagIds.size > 0 &&
                            `(${selectedTagIds.size})`}
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {caseAddonsEnabled && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!canChangeParent}
                  onSelect={(event) => {
                    event.preventDefault()
                    setParentPickerOpen(true)
                  }}
                >
                  <span className="flex items-center gap-2">
                    <ListTreeIcon
                      className="size-3 text-muted-foreground"
                      aria-hidden
                    />
                    <span>归入父事件</span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canChangeParent}
                  onSelect={async () => {
                    await setParentForSelectedCases?.(null)
                  }}
                >
                  <span className="flex items-center gap-2">
                    <UngroupIcon
                      className="size-3 text-muted-foreground"
                      aria-hidden
                    />
                    <span>移出父事件</span>
                  </span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isBusy}
              onSelect={(event) => {
                event.preventDefault()
                setCommentDialogOpen(true)
              }}
            >
              <span className="flex items-center gap-2">
                <MessageSquare
                  className="size-3 text-muted-foreground"
                  aria-hidden
                />
                <span>添加评论</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isBusy}
              onSelect={(event) => {
                event.preventDefault()
                setAppendDialogOpen(true)
              }}
            >
              <span className="flex items-center gap-2">
                <FileText
                  className="size-3 text-muted-foreground"
                  aria-hidden
                />
                <span>追加到描述</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={!deleteSelected || isBusy}
              onSelect={(event) => {
                event.preventDefault()
                if (deleteSelected) {
                  setConfirmDeleteOpen(true)
                }
              }}
            >
              <span className="flex items-center gap-2">
                <Trash2 className="size-3" aria-hidden />
                <span>删除</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
      <CasePickerDialog
        open={Boolean(setParentForSelectedCases) && parentPickerOpen}
        onOpenChange={setParentPickerOpen}
        workspaceId={workspaceId}
        title={"归入父事件"}
        description={`将 ${pluralisedCases} 归入顶层事件作为子事件。子事件默认在事件列表中隐藏，并显示在父事件下方。`}
        // Parents must be top-level cases.
        hierarchy="top_level"
        isCandidate={(item) => !selectedCaseIds.includes(item.id)}
        confirmLabel={([parent]) =>
          parent ? `归入 ${parent.short_id}` : "Select a case"
        }
        onConfirm={async ([parent]) => {
          await setParentForSelectedCases?.(parent)
          return { close: true }
        }}
      />
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 {selectedCount} 已选择
              {selectedCount === 1 ? " 个事件" : " 个事件"}吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? (
                <span className="flex items-center">
                  <Spinner className="size-4" />
                  <span className="ml-2">删除中…</span>
                </span>
              ) : (
                "删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={commentDialogOpen}
        onOpenChange={(open) => {
          setCommentDialogOpen(open)
          if (!open) setCommentText("")
        }}
      >
        <DialogContent size="sm" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加评论</DialogTitle>
            <DialogDescription>
              添加评论，目标为 {selectedCount} 已选择
              {selectedCount === 1 ? " 个事件" : " 个事件"}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <SimpleEditor
              value={commentText}
              onChange={setCommentText}
              placeholder={"输入评论…"}
              className="min-h-[150px]"
            />
          </DialogBody>
          <DialogFooter>
            <Button
              size="sm"
              disabled={!commentText.trim() || isAddingComments}
              onClick={handleBulkAddComment}
            >
              {isAddingComments ? (
                <>
                  <Spinner className="mr-2 size-3" />
                  添加中…
                </>
              ) : (
                "添加评论"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={appendDialogOpen}
        onOpenChange={(open) => {
          setAppendDialogOpen(open)
          if (!open) setAppendText("")
        }}
      >
        <DialogContent size="sm" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>追加到描述</DialogTitle>
            <DialogDescription>
              追加文本到以下事件的描述： {selectedCount} 已选择
              {selectedCount === 1 ? " 个事件" : " 个事件"}.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <SimpleEditor
              value={appendText}
              onChange={setAppendText}
              placeholder={"输入要追加的文本…"}
              className="min-h-[150px]"
            />
          </DialogBody>
          <DialogFooter>
            <Button
              size="sm"
              disabled={!appendText.trim() || isAppending}
              onClick={handleBulkAppendDescription}
            >
              {isAppending ? (
                <>
                  <Spinner className="mr-2 size-3" />
                  追加中…
                </>
              ) : (
                "追加"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {closureDialog && (
        <CaseClosureDialog
          open={closureDialog.open}
          onOpenChange={(open) => {
            if (!open) setClosureDialog(null)
          }}
          targetStatus={closureDialog.targetStatus as "closed" | "resolved"}
          requiredFields={
            caseFieldDefinitions?.filter(
              (f) => !f.reserved && f.required_on_closure
            ) ?? []
          }
          requiredDropdowns={
            dropdownDefinitions?.filter((d) => d.required_on_closure) ?? []
          }
          isBulk
          selectedCount={selectedCount}
          onSubmit={async (data) => {
            if (!bulkUpdateSelectedCases) return
            const statusLabel =
              closureDialog.targetStatus === "closed" ? "已关闭" : "已解决"
            await bulkUpdateSelectedCases(
              {
                status: closureDialog.targetStatus,
                fields: data.fields,
                dropdown_values: data.dropdown_values.map((dv) => ({
                  definition_id: dv.definition_id,
                  option_id: dv.option_id,
                })),
              },
              {
                successTitle: `状态已设置为${statusLabel}`,
                successDescription: `已应用到${pluralisedCases}。`,
              }
            )
          }}
        />
      )}
    </>
  )
}

function MembersActions() {
  const { workspace } = useWorkspaceDetails()

  if (!workspace) {
    return null
  }

  return <AddWorkspaceMember workspace={workspace} />
}

function CredentialsActions() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const canCreateSecrets = useScopeCheck("secret:create")

  return (
    <>
      <WorkspaceResourceSyncActions
        label={"凭据元数据"}
        branchSlug="credentials"
        resources={["secret_metadata"]}
      />
      {canCreateSecrets === true && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-7 bg-background"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            创建凭据
          </Button>
          <CreateCredentialDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        </>
      )}
    </>
  )
}

function ServiceAccountsActions() {
  const canCreateServiceAccounts = useScopeCheck(
    "workspace:service_account:create"
  )
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  if (canCreateServiceAccounts !== true || !pathname) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 bg-background"
      onClick={() => {
        const params = new URLSearchParams(searchParams?.toString())
        params.set("createServiceAccount", Date.now().toString())
        router.replace(`${pathname}?${params.toString()}`, {
          scroll: false,
        })
      }}
    >
      <Plus className="mr-1 h-3.5 w-3.5" />
      创建服务账号
    </Button>
  )
}

function McpServersActions() {
  const canCreate = useScopeCheck("integration:create")
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  if (canCreate !== true || !pathname) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 bg-background"
      onClick={() => {
        const params = new URLSearchParams(searchParams?.toString())
        params.set("createMcpServer", Date.now().toString())
        router.replace(`${pathname}?${params.toString()}`, {
          scroll: false,
        })
      }}
    >
      <Plus className="mr-1 h-3.5 w-3.5" />
      添加 MCP 服务器
    </Button>
  )
}

function McpAccessActions() {
  const canReadWorkspace = useScopeCheck("workspace:read")
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  if (canReadWorkspace !== true || !pathname) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 bg-background"
      onClick={() => {
        const params = new URLSearchParams(searchParams?.toString())
        params.set("createMcpToken", Date.now().toString())
        router.replace(`${pathname}?${params.toString()}`, {
          scroll: false,
        })
      }}
    >
      <Plus className="mr-1 h-3.5 w-3.5" />
      创建令牌
    </Button>
  )
}

function VariablesActions() {
  return (
    <>
      <WorkspaceResourceSyncActions
        label={"个变量"}
        branchSlug="variables"
        resources={["variable"]}
      />
      <NewVariableDialog>
        <NewVariableDialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 bg-background">
            <Plus className="mr-1 h-3.5 w-3.5" />
            创建变量
          </Button>
        </NewVariableDialogTrigger>
      </NewVariableDialog>
    </>
  )
}

function CaseBreadcrumb({
  caseId,
  workspaceId,
}: {
  caseId: string
  workspaceId: string
}) {
  const { caseData } = useGetCase({ caseId, workspaceId })

  return (
    <Breadcrumb>
      <BreadcrumbList className="relative z-10 flex items-center gap-2 text-sm flex-nowrap overflow-hidden whitespace-nowrap min-w-0 bg-transparent pr-1">
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="font-semibold hover:no-underline">
            <Link href={`/workspaces/${workspaceId}/cases`}>事件</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="shrink-0">
          <span className="text-muted-foreground">/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbEntityPage
            label={caseData?.short_id}
            skeletonClassName="h-4 w-20"
          />
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function CaseTimestamp({
  caseId,
  workspaceId,
  className,
}: {
  caseId: string
  workspaceId: string
  className?: string
}) {
  const { caseData } = useGetCase({ caseId, workspaceId })

  if (!caseData) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground min-w-0",
        className
      )}
    >
      <span className="hidden sm:flex items-center gap-1 min-w-0">
        <ClockPlus className="h-3 w-3 flex-shrink-0" />
        <span className="truncate min-w-0">
          {capitalizeFirst(
            formatDistanceToNow(new Date(caseData.created_at), {
              locale: zhCN,
              addSuffix: true,
            })
          )}
        </span>
      </span>
      <span className="hidden sm:inline flex-shrink-0">•</span>
      <span className="flex items-center gap-1 min-w-0">
        <PenLine className="h-3 w-3 flex-shrink-0" />
        <span className="truncate min-w-0">
          {capitalizeFirst(
            formatDistanceToNow(new Date(caseData.updated_at), {
              locale: zhCN,
              addSuffix: true,
            })
          )}
        </span>
      </span>
    </div>
  )
}

function CaseStatusControl({
  caseId,
  workspaceId,
}: {
  caseId: string
  workspaceId: string
}) {
  const { hasEntitlement } = useEntitlements()
  const caseAddonsEnabled = hasEntitlement("case_addons")
  const { caseDurations, caseDurationsIsLoading } = useCaseDurations({
    caseId,
    workspaceId,
    enabled: caseAddonsEnabled,
  })
  const { caseDurationDefinitions, caseDurationDefinitionsIsLoading } =
    useCaseDurationDefinitions(workspaceId, caseAddonsEnabled)

  return (
    <div className="flex min-w-0 items-center">
      {caseAddonsEnabled ? (
        <div className="no-scrollbar max-w-[min(48vw,36rem)] overflow-x-auto">
          <CaseDurationMetrics
            durations={caseDurations}
            definitions={caseDurationDefinitions}
            isLoading={
              caseDurationsIsLoading || caseDurationDefinitionsIsLoading
            }
            variant="inline"
          />
        </div>
      ) : null}
    </div>
  )
}

function CaseDetailActions({
  caseId,
  workspaceId,
}: {
  caseId: string
  workspaceId: string
}) {
  const { caseData } = useGetCase({ caseId, workspaceId })

  return (
    <>
      <CaseStatusControl caseId={caseId} workspaceId={workspaceId} />
      <CaseAgentRunsAction caseId={caseId} workspaceId={workspaceId} />
      {caseData ? (
        <CaseVersionHistory
          workspaceId={workspaceId}
          caseId={caseId}
          caseLabel={caseData.short_id}
        />
      ) : null}
    </>
  )
}

/**
 * Forms list actions: push to Git (forms travel inside the workflow file)
 * and create a form.
 */
function FormsListActions() {
  const enabled = useFormsAccess() === "enabled"
  const canCreate = useScopeCheck("form:create") === true
  // The Create form dialog picks from the workflow list.
  const canReadWorkflows = useScopeCheck("workflow:read") === true
  const [createOpen, setCreateOpen] = useState(false)

  if (!enabled) {
    return null
  }
  return (
    <>
      <WorkspaceResourceSyncActions
        label={"工作流和表单"}
        branchSlug="forms"
        resources={["workflow"]}
      />
      {canCreate && canReadWorkflows && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-7 bg-background"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="mr-1 size-3.5" />
            创建表单
          </Button>
          <CreateFormDialog open={createOpen} onOpenChange={setCreateOpen} />
        </>
      )}
    </>
  )
}

/** "Forms / <title>" and the switch that puts the form online or offline. */
function FormBreadcrumb({
  formId,
  workspaceId,
}: {
  formId: string
  workspaceId: string
}) {
  const enabled = useFormsAccess() === "enabled"
  const canEdit = useScopeCheck("form:update") === true
  const { data: form, isLoading: formIsLoading } = useFormDetail(
    { workspaceId, formId },
    { enabled }
  )
  const { mutateAsync: updateForm, isPending: updateFormIsPending } =
    useUpdateForm({
      workspaceId,
      formId,
    })

  if (!enabled) {
    return <h1 className="text-sm font-semibold text-muted-foreground">表单</h1>
  }

  async function setOnline(next: boolean) {
    try {
      await updateForm({ status: next ? "online" : "offline" })
    } catch (error) {
      toast({
        title: next ? "无法上线表单" : "无法下线表单",
        description: getFormErrorDetail(error)?.message ?? "出现了问题。",
        variant: "destructive",
      })
    }
  }

  const online = form?.status === "online"
  const label = form
    ? form.config.title || form.workflow_title
    : (!formIsLoading && "未找到表单") || null
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden whitespace-nowrap text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className="font-semibold hover:no-underline"
            >
              <Link href={`/workspaces/${workspaceId}/forms`}>表单</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="shrink-0">
            <span className="text-muted-foreground">/</span>
          </BreadcrumbSeparator>
          <BreadcrumbItem className="min-w-0 [&>span]:truncate">
            <BreadcrumbEntityPage label={label} skeletonClassName="h-4 w-28" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {form && (
        <div className="flex flex-none items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={online}
            disabled={!canEdit || updateFormIsPending}
            aria-label={"表单已上线"}
            onCheckedChange={setOnline}
          />
          <span>{online ? "已上线" : "已下线"}</span>
        </div>
      )}
    </div>
  )
}

/** Form detail actions: Config / Activity tabs, and open as a requester. */
function FormDetailActions({
  formId,
  workspaceId,
}: {
  formId: string
  workspaceId: string
}) {
  const enabled = useFormsAccess() === "enabled"
  const { data: form } = useFormDetail({ workspaceId, formId }, { enabled })

  if (!enabled || !form) {
    return null
  }
  return (
    <>
      <FormViewToggle workspaceId={workspaceId} formId={form.id} />
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 bg-background"
      >
        <a href={`/forms/${form.id}`} target="_blank" rel="noopener noreferrer">
          <ExternalLinkIcon className="size-3.5" />
          打开
        </a>
      </Button>
    </>
  )
}

function TableBreadcrumb({
  tableId,
  workspaceId,
}: {
  tableId: string
  workspaceId: string
}) {
  const { table } = useGetTable({ tableId, workspaceId })

  return (
    <Breadcrumb>
      <BreadcrumbList className="relative z-10 flex items-center gap-2 text-sm flex-nowrap overflow-hidden whitespace-nowrap min-w-0 bg-transparent pr-1">
        <BreadcrumbItem>
          <BreadcrumbLink asChild className="font-semibold hover:no-underline">
            <Link href={`/workspaces/${workspaceId}/tables`}>数据表</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="shrink-0">
          <span className="text-muted-foreground">/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem className="gap-2">
          <BreadcrumbEntityPage
            label={table?.name}
            skeletonClassName="h-4 w-28"
          />
          {table && (
            <ManagedResourceStatus
              resourceType="table"
              id={table.id}
              name={table.name}
              showDetach
            />
          )}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function TableDetailsActions({ tableId }: { tableId: string }) {
  return (
    <>
      <TableSearchProvider key={tableId} tableId={tableId}>
        <TableSearchBadge />
      </TableSearchProvider>
      <WorkspaceResourceSyncActions
        label={"个数据表"}
        branchSlug="tables"
        resources={["table"]}
      />
      <TableSelectionActionsBar />
      <TableInsertButton />
    </>
  )
}

function AgentPresetBreadcrumb({
  presetId,
  workspaceId,
}: {
  presetId: string
  workspaceId: string
}) {
  const { workspace } = useWorkspaceDetails()
  const { preset } = useAgentPreset(workspaceId, presetId)
  const { hasEntitlement } = useEntitlements()
  const organizationEnabled = hasEntitlement("agent_addons")
  const { folders } = useAgentFolders(workspaceId, {
    enabled: organizationEnabled && Boolean(preset?.folder_id),
  })
  const folderPath =
    organizationEnabled && preset?.folder_id
      ? folders?.find((folder) => folder.id === preset.folder_id)?.path
      : null

  return (
    <FolderPathBreadcrumb
      rootLabel={workspace?.name ?? <Skeleton className="h-4 w-20" />}
      rootHref={`/workspaces/${workspaceId}/agents`}
      folderPath={folderPath}
      currentPage={
        preset ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{preset.name}</span>
            <ManagedResourceStatus
              resourceType="agent_preset"
              id={preset.id}
              name={preset.slug}
              showDetach
            />
          </span>
        ) : undefined
      }
      currentPageFallback={<Skeleton className="h-4 w-32" />}
    />
  )
}

function getPageConfig(
  pathname: string,
  workspaceId: string,
  searchParams: ReturnType<typeof useSearchParams> | null
): PageConfig | null {
  const basePath = `/workspaces/${workspaceId}`

  // Remove base path to get the page route
  const pagePath = pathname.replace(basePath, "") || "/"

  // Match routes and return appropriate config
  if (pagePath === "/" || pagePath.startsWith("/workflows")) {
    const workflowView =
      searchParams?.get("view") === "list" ? "list" : "folders"
    return {
      title: (
        <WorkflowsBreadcrumb
          workspaceId={workspaceId}
          path={
            workflowView === "folders"
              ? (searchParams?.get("path") ?? "/")
              : "/"
          }
        />
      ),
      actions: <WorkflowsActions />,
    }
  }

  if (pagePath.startsWith("/approvals")) {
    return {
      title: "审批",
    }
  }

  if (pagePath.startsWith("/runs")) {
    return {
      title: "运行记录",
    }
  }

  if (pagePath.startsWith("/agents")) {
    // Tags page
    if (pagePath === "/agents/tags") {
      return {
        title: "智能体",
        actions: <AgentsActions />,
      }
    }

    // Agent preset detail page
    const agentPresetMatch = pagePath.match(/^\/agents\/([^/]+)$/)
    if (agentPresetMatch) {
      const presetId = agentPresetMatch[1]
      return {
        title: (
          <AgentPresetBreadcrumb
            presetId={presetId}
            workspaceId={workspaceId}
          />
        ),
        actions: (
          <AgentPresetDetailHeaderActions
            syncActions={
              <WorkspaceResourceSyncActions
                label={"个智能体"}
                branchSlug="agents"
                resources={["agent_preset"]}
              />
            }
          />
        ),
      }
    }

    const agentsView = searchParams?.get("view") === "list" ? "list" : "folders"
    return {
      title: (
        <AgentFoldersBreadcrumb
          workspaceId={workspaceId}
          path={
            agentsView === "folders" ? (searchParams?.get("path") ?? "/") : "/"
          }
        />
      ),
      actions: <AgentsActions />,
    }
  }

  if (pagePath.startsWith("/cases")) {
    if (
      pagePath === "/cases/custom-fields" ||
      pagePath === "/cases/dropdowns" ||
      pagePath === "/cases/closure-requirements" ||
      pagePath === "/cases/durations" ||
      pagePath === "/cases/tags"
    ) {
      return {
        title: "事件",
        actions: <CasesActions />,
      }
    }

    // Check if this is a case detail page
    const caseMatch = pagePath.match(/^\/cases\/([^/]+)$/)
    if (caseMatch) {
      const caseId = caseMatch[1]
      return {
        title: <CaseBreadcrumb caseId={caseId} workspaceId={workspaceId} />,
        // No actions for case detail pages
      }
    }

    return {
      title: "事件",
      actions: <CasesActions />,
    }
  }

  if (pagePath.startsWith("/forms")) {
    const formMatch = pagePath.match(/^\/forms\/([^/]+)$/)
    if (formMatch) {
      const formId = formMatch[1]
      return {
        title: <FormBreadcrumb formId={formId} workspaceId={workspaceId} />,
        actions: (
          <FormDetailActions formId={formId} workspaceId={workspaceId} />
        ),
      }
    }

    return {
      title: "表单",
      actions: <FormsListActions />,
    }
  }

  if (pagePath.startsWith("/tables")) {
    // Check if this is a table detail page
    const tableMatch = pagePath.match(/^\/tables\/([^/]+)$/)
    if (tableMatch) {
      const tableId = tableMatch[1]
      return {
        title: <TableBreadcrumb tableId={tableId} workspaceId={workspaceId} />,
        actions: <TableDetailsActions tableId={tableId} />,
      }
    }

    return {
      title: "数据表",
      actions: <TablesActions />,
    }
  }

  if (pagePath.startsWith("/integrations")) {
    return {
      title: "集成",
      actions: <IntegrationsActions />,
    }
  }

  if (pagePath.startsWith("/actions")) {
    return {
      title: "动作",
    }
  }

  if (pagePath.startsWith("/skills")) {
    if (pagePath === "/skills/library") {
      return {
        title: <SkillLibraryProviderBreadcrumb workspaceId={workspaceId} />,
        actions: <SkillsActions />,
      }
    }

    if (pagePath === "/skills/tags") {
      return {
        title: "技能",
        actions: <SkillsActions />,
      }
    }

    const librarySkillMatch = pagePath.match(
      /^\/skills\/library\/([^/]+)\/([^/]+)$/
    )
    if (librarySkillMatch) {
      return {
        title: (
          <SkillLibraryProviderBreadcrumb
            workspaceId={workspaceId}
            providerSlug={librarySkillMatch[1]}
            skillSlug={librarySkillMatch[2]}
          />
        ),
        actions: <SkillLibrarySkillActions slug={librarySkillMatch[2]} />,
      }
    }

    const providerMatch = pagePath.match(/^\/skills\/library\/([^/]+)$/)
    if (providerMatch) {
      return {
        title: (
          <SkillLibraryProviderBreadcrumb
            workspaceId={workspaceId}
            providerSlug={providerMatch[1]}
          />
        ),
      }
    }

    const skillMatch = pagePath.match(/^\/skills\/([^/]+)$/)
    if (skillMatch) {
      return {
        title: (
          <SkillsBreadcrumb workspaceId={workspaceId} skillId={skillMatch[1]} />
        ),
        actions: (
          <>
            <WorkspaceResourceSyncActions
              label={"个技能"}
              branchSlug="skills"
              resources={["skill"]}
            />
            <SkillsDetailActions />
          </>
        ),
      }
    }
    const skillsView = searchParams?.get("view") === "list" ? "list" : "folders"
    return {
      title: (
        <SkillsFoldersBreadcrumb
          workspaceId={workspaceId}
          path={
            skillsView === "folders" ? (searchParams?.get("path") ?? "/") : "/"
          }
        />
      ),
      actions: <SkillsActions />,
    }
  }

  if (pagePath.startsWith("/credentials")) {
    return {
      title: "凭据",
      actions: <CredentialsActions />,
    }
  }

  if (pagePath.startsWith("/mcp-servers")) {
    return {
      title: "MCP 服务器",
      actions: <McpServersActions />,
    }
  }

  if (pagePath.startsWith("/service-accounts")) {
    return {
      title: "服务账号",
      actions: <ServiceAccountsActions />,
    }
  }

  if (pagePath.startsWith("/mcp")) {
    return {
      title: "MCP 访问",
      actions: <McpAccessActions />,
    }
  }

  if (pagePath === "/tunnels") {
    return {
      title: "隧道",
      actions: <CreateTunnelButton />,
    }
  }

  if (pagePath.startsWith("/variables")) {
    return {
      title: "变量",
      actions: <VariablesActions />,
    }
  }

  if (pagePath === "/members") {
    return {
      title: "成员",
      actions: <MembersActions />,
    }
  }

  if (pagePath.startsWith("/inbox")) {
    return {
      title: "收件箱",
    }
  }

  return null
}

export function ControlsHeader({ onToggleChat }: ControlsHeaderProps = {}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const workspaceId = useWorkspaceId()
  const pagePath = pathname
    ? pathname.replace(`/workspaces/${workspaceId}`, "") || "/"
    : "/"
  const isCasesListPage = pagePath === "/cases"
  const isCaseDetail = pagePath.match(
    /^\/cases\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
  )
  const caseId = isCaseDetail ? isCaseDetail[1] : null

  const pageConfig = pathname
    ? getPageConfig(pathname, workspaceId, searchParams ?? null)
    : null

  useEffect(() => {
    if (!onToggleChat) {
      return
    }
    const DOUBLE_TAP_WINDOW_MS = 1200
    let pendingAt: number | null = null

    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false
      }
      const tagName = target.tagName
      return (
        target.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target.getAttribute("role") === "textbox"
      )
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      ) {
        pendingAt = null
        return
      }
      if (event.key.toLowerCase() !== CHAT_TOGGLE_KEY) {
        pendingAt = null
        return
      }
      if (isEditableTarget(event.target)) {
        pendingAt = null
        return
      }

      const now = Date.now()
      if (pendingAt === null || now - pendingAt > DOUBLE_TAP_WINDOW_MS) {
        pendingAt = now
        return
      }

      pendingAt = null
      event.preventDefault()
      onToggleChat()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onToggleChat])

  if (!pageConfig) {
    return null
  }

  const titleContent =
    typeof pageConfig.title === "string" ? (
      <h1 className="text-sm font-semibold text-muted-foreground">
        {pageConfig.title}
      </h1>
    ) : (
      pageConfig.title
    )

  return (
    // Transparent at every route, cases included: a status-tinted band read as
    // a colour wash across the top of the app and fought the duration pills
    // sitting in it. The status already has three homes — the pill in this
    // header, the Properties rail, and the case list.
    <header className="flex h-10 items-center overflow-hidden border-b px-3">
      {/* Left section: sidebar toggle + title */}
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="h-7 w-7 flex-shrink-0" />
        {caseId ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">{titleContent}</div>
            <CaseTimestamp
              caseId={caseId}
              workspaceId={workspaceId}
              className="ml-3 pl-3"
            />
          </div>
        ) : (
          titleContent
        )}
      </div>

      {/* Middle section: bulk selection actions */}
      <div className="flex flex-1 justify-center min-w-[1rem]">
        {isCasesListPage && <CasesSelectionActionsBar enabled />}
      </div>

      {/* Right section: actions / timestamp / chat toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {pageConfig.actions
          ? pageConfig.actions
          : caseId && (
              <CaseDetailActions caseId={caseId} workspaceId={workspaceId} />
            )}

        {onToggleChat && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onToggleChat}
              >
                <PanelRight className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">切换对话</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              alignOffset={-10}
              collisionPadding={16}
              className="border-0 bg-transparent p-0 shadow-none"
              sideOffset={8}
            >
              <span className="inline-flex items-center gap-1">
                <Kbd>C</Kbd>
                <span className="inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  然后
                </span>
                <Kbd>C</Kbd>
              </span>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
  )
}
