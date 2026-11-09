"use client"

import { format, formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  BotIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldIcon,
  SquarePenIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import type {
  ScopeRead,
  ServiceAccountApiKeyCreate,
  ServiceAccountApiKeyIssueResponse,
  ServiceAccountApiKeyRead,
  ServiceAccountCreate,
  ServiceAccountRead,
  ServiceAccountScopeRead,
  ServiceAccountUpdate,
} from "@/client"
import { CopyButton } from "@/components/copy-button"
import { ListHeaderSearch } from "@/components/list-header-search"
import { AlertNotification } from "@/components/notifications"
import {
  getScopesForLevel,
  ScopeCategoryRow,
} from "@/components/rbac/scope-category-row"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { getDisplayName } from "@/lib/auth"
import type { TracecatApiError } from "@/lib/errors"
import { useQuery } from "@/lib/query"
import {
  getCategoryScopes,
  type PermissionLevel,
  RESOURCE_CATEGORIES,
} from "@/lib/rbac"
import { cn } from "@/lib/utils"

interface ServiceAccountApiKeysPage {
  items?: ServiceAccountApiKeyRead[]
  next_cursor?: string | null
}

interface ServiceAccountsManagerProps {
  kindLabel: string
  serviceAccounts: ServiceAccountRead[]
  nextCursor: string | null
  isLoading: boolean
  error: Error | null
  availableScopes: ServiceAccountScopeRead[]
  createPending: boolean
  updatePending: boolean
  disablePending: boolean
  enablePending: boolean
  issueApiKeyPending: boolean
  revokeApiKeyPending: boolean
  apiKeysQueryKeyPrefix: readonly unknown[]
  canCreate?: boolean
  canUpdate?: boolean
  canDisable?: boolean
  openCreateSignal?: string | null
  onCreateSignalConsumed?: () => void
  onCreate: (
    requestBody: ServiceAccountCreate
  ) => Promise<ServiceAccountApiKeyIssueResponse>
  onUpdate: (params: {
    serviceAccountId: string
    requestBody: ServiceAccountUpdate
  }) => Promise<ServiceAccountRead>
  onDisable: (serviceAccountId: string) => Promise<void>
  onEnable: (serviceAccountId: string) => Promise<void>
  onIssueApiKey: (params: {
    serviceAccountId: string
    requestBody: ServiceAccountApiKeyCreate
  }) => Promise<ServiceAccountApiKeyIssueResponse>
  onRevokeApiKey: (params: {
    serviceAccountId: string
    apiKeyId: string
  }) => Promise<void>
  listApiKeys: (serviceAccountId: string) => Promise<ServiceAccountApiKeysPage>
}

interface ServiceAccountDraft {
  name: string
  description: string
  scopeIds: string[]
  initialKeyName: string
}

type ServiceAccountStatusFilter =
  | "all"
  | "active"
  | "disabled"
  | "no-active-key"

type ActionDialogState =
  | {
      type: "disable"
      serviceAccount: ServiceAccountRead
    }
  | {
      type: "enable"
      serviceAccount: ServiceAccountRead
    }
  | {
      type: "revoke-api-key"
      serviceAccount: ServiceAccountRead
      apiKey: ServiceAccountApiKeyRead
    }

const EMPTY_DRAFT: ServiceAccountDraft = {
  name: "",
  description: "",
  scopeIds: [],
  initialKeyName: "Primary",
}

type ServiceAccountStatusGroup = "active" | "disabled" | "no_active_key"

interface StatusGroupConfig {
  label: string
  dotClassName: string
  textClassName: string
}

const STATUS_GROUPS: Record<ServiceAccountStatusGroup, StatusGroupConfig> = {
  active: {
    label: "已启用",
    dotClassName: "bg-green-500",
    textClassName: "text-green-700 dark:text-green-400",
  },
  disabled: {
    label: "已禁用",
    dotClassName: "bg-muted-foreground",
    textClassName: "text-muted-foreground",
  },
  no_active_key: {
    label: "没有生效的密钥",
    dotClassName: "bg-rose-500",
    textClassName: "text-rose-700 dark:text-rose-400",
  },
}

function getServiceAccountGroup(
  serviceAccount: ServiceAccountRead
): ServiceAccountStatusGroup {
  if (serviceAccount.disabled_at) return "disabled"
  if (!serviceAccount.active_api_key) return "no_active_key"
  return "active"
}

const SERVICE_ACCOUNT_STATUS_FILTERS: Array<{
  value: ServiceAccountStatusFilter
  label: string
}> = [
  { value: "all", label: "全部" },
  { value: "active", label: "已启用" },
  { value: "disabled", label: "已禁用" },
  { value: "no-active-key", label: "没有生效的密钥" },
]

const SERVICE_ACCOUNT_NAME_COLUMN_CLASS =
  "min-w-0 w-[280px] shrink-0 truncate text-xs font-medium"
const SERVICE_ACCOUNT_STATUS_COLUMN_CLASS = "w-[120px] shrink-0"
const SERVICE_ACCOUNT_DESCRIPTION_COLUMN_CLASS =
  "min-w-0 flex-1 truncate text-xs text-muted-foreground"
const SERVICE_ACCOUNT_CREATOR_COLUMN_CLASS =
  "w-[180px] shrink-0 truncate text-xs text-muted-foreground"
const INLINE_NAME_HIGHLIGHT_CLASS =
  "mx-1 inline-flex rounded bg-secondary px-1.5 py-0.5 align-middle font-mono text-xs font-normal text-foreground"

function formatUserIdLabel(userId: string): string {
  if (userId.length <= 12) {
    return userId
  }
  return `${userId.slice(0, 8)}...${userId.slice(-4)}`
}

function getUserDisplayName(
  user:
    | {
        email: string
        first_name?: string | null
        last_name?: string | null
      }
    | null
    | undefined,
  userId: string | null | undefined
): string | null {
  if (user) {
    return getDisplayName(user)
  }
  if (!userId) {
    return null
  }
  return formatUserIdLabel(userId)
}

function getApiErrorDetail(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const apiError = error as TracecatApiError
    if (typeof apiError.body?.detail === "string") {
      return apiError.body.detail
    }
  }
  return fallback
}

function formatTimestamp(value?: string | null): string {
  if (!value) {
    return "从未"
  }

  return formatDistanceToNow(new Date(value), { locale: zhCN, addSuffix: true })
}

function formatFullTimestamp(value?: string | null): string {
  if (!value) {
    return "从未"
  }

  return format(new Date(value), "PPpp", { locale: zhCN })
}

function getApiKeyStatusLabel(apiKey: ServiceAccountApiKeyRead): string {
  return apiKey.revoked_at ? "已撤销" : "已启用"
}

function getApiKeyStatusTone(apiKey: ServiceAccountApiKeyRead): {
  dotClassName: string
  textClassName: string
} {
  return apiKey.revoked_at
    ? {
        dotClassName: "bg-rose-500",
        textClassName: "text-rose-700 dark:text-rose-400",
      }
    : {
        dotClassName: "bg-green-500",
        textClassName: "text-green-700 dark:text-green-400",
      }
}

function matchesServiceAccountStatusFilter(
  serviceAccount: ServiceAccountRead,
  statusFilter: ServiceAccountStatusFilter
): boolean {
  switch (statusFilter) {
    case "all":
      return true
    case "active":
      return (
        serviceAccount.disabled_at === null &&
        serviceAccount.active_api_key !== null &&
        serviceAccount.active_api_key !== undefined
      )
    case "disabled":
      return serviceAccount.disabled_at !== null
    case "no-active-key":
      return (
        serviceAccount.disabled_at === null && !serviceAccount.active_api_key
      )
  }
}

function matchesServiceAccountSearchQuery(
  serviceAccount: ServiceAccountRead,
  searchQuery: string
): boolean {
  const normalizedQuery = searchQuery.trim().toLowerCase()
  if (!normalizedQuery) {
    return true
  }

  const searchableParts = [
    serviceAccount.name,
    serviceAccount.description,
    serviceAccount.active_api_key?.name,
    serviceAccount.active_api_key?.preview,
    ...(serviceAccount.scopes?.map((scope) => scope.name) ?? []),
  ]

  return searchableParts.some((part) =>
    part?.toLowerCase().includes(normalizedQuery)
  )
}

function RowActionButton({
  label,
  disabled = false,
  onClick,
  danger = false,
  className,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  danger?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            danger
              ? "size-8 text-rose-600 hover:text-rose-700"
              : "size-8 text-muted-foreground hover:text-foreground",
            className
          )}
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
        >
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function LastUsedIndicator({ value }: { value?: string | null }) {
  const relativeTimestamp = formatTimestamp(value)
  const fullTimestamp = formatFullTimestamp(value)
  const label = !value ? "上次使用：从未使用" : `上次使用 ${relativeTimestamp}`
  const accessibleLabel = value ? `${label}; ${fullTimestamp}` : label

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
          )}
          tabIndex={0}
          aria-label={accessibleLabel}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <ClockIcon className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        <div className="flex flex-col gap-1">
          <span>{label}</span>
          {value ? (
            <span className="text-muted-foreground">{fullTimestamp}</span>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function sortServiceAccountScopes(
  scopes: ServiceAccountScopeRead[]
): ServiceAccountScopeRead[] {
  return [...scopes].sort((left, right) => left.name.localeCompare(right.name))
}

function ServiceAccountDetailPanel({
  serviceAccount,
  expanded,
  listApiKeys,
  apiKeysQueryKeyPrefix,
  canUpdate,
  revokeApiKeyPending,
  onOpenActionDialog,
}: {
  serviceAccount: ServiceAccountRead
  expanded: boolean
  listApiKeys: (serviceAccountId: string) => Promise<ServiceAccountApiKeysPage>
  apiKeysQueryKeyPrefix: readonly unknown[]
  canUpdate: boolean
  revokeApiKeyPending: boolean
  onOpenActionDialog: (state: ActionDialogState) => void
}) {
  const {
    data: apiKeysPage,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...apiKeysQueryKeyPrefix, serviceAccount.id, "api-keys"],
    queryFn: async () => await listApiKeys(serviceAccount.id),
    enabled: expanded,
  })

  if (!expanded) {
    return null
  }

  return (
    <div className="border-t bg-background px-4 py-4">
      <div className="flex flex-col gap-6">
        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <ShieldIcon className="size-3.5 text-muted-foreground" />
            <span>权限范围</span>
          </div>
          {(serviceAccount.scopes?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sortServiceAccountScopes(serviceAccount.scopes ?? []).map(
                (scope) => (
                  <Badge
                    key={scope.id}
                    variant="secondary"
                    className="px-2 py-0.5 font-mono text-[10px] font-normal text-muted-foreground"
                  >
                    {scope.name}
                  </Badge>
                )
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">尚未分配权限范围。</p>
          )}
        </section>

        <section className="space-y-3">
          <div className="inline-flex items-center gap-2 text-sm font-medium">
            <KeyRoundIcon className="size-3.5 text-muted-foreground" />
            <span>API 密钥</span>
          </div>
          {error ? (
            <AlertNotification
              level="error"
              message={`加载 API 密钥出错：${error.message}`}
            />
          ) : isLoading ? (
            <div className="text-xs text-muted-foreground">
              正在加载 API 密钥…
            </div>
          ) : (apiKeysPage?.items?.length ?? 0) === 0 ? (
            <Empty className="border-0 px-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <KeyRoundIcon />
                </EmptyMedia>
                <EmptyTitle>暂无 API 密钥</EmptyTitle>
                <EmptyDescription>
                  此服务账号尚未签发任何密钥。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">名称</TableHead>
                    <TableHead className="text-xs">状态</TableHead>
                    <TableHead className="text-xs">私密密钥</TableHead>
                    <TableHead className="text-xs">创建者</TableHead>
                    <TableHead className="text-xs">创建时间</TableHead>
                    <TableHead className="text-xs">上次使用</TableHead>
                    <TableHead className="h-8 w-[40px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeysPage?.items?.map((apiKey) => {
                    const statusTone = getApiKeyStatusTone(apiKey)

                    return (
                      <TableRow
                        key={apiKey.id}
                        className="hover:bg-transparent"
                      >
                        <TableCell>
                          <span className="truncate text-xs font-medium">
                            {apiKey.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "h-5 gap-1.5 bg-secondary px-2 text-[10px] font-normal",
                              statusTone.textClassName
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                statusTone.dotClassName
                              )}
                            />
                            {getApiKeyStatusLabel(apiKey)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {apiKey.preview}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {getUserDisplayName(
                            apiKey.created_by_user,
                            apiKey.created_by
                          ) ?? "未知"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTimestamp(apiKey.created_at)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTimestamp(apiKey.last_used_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <RowActionButton
                              label={"撤销 API 密钥"}
                              danger={true}
                              className="size-7"
                              disabled={
                                revokeApiKeyPending ||
                                Boolean(apiKey.revoked_at) ||
                                !canUpdate
                              }
                              onClick={() =>
                                onOpenActionDialog({
                                  type: "revoke-api-key",
                                  serviceAccount,
                                  apiKey,
                                })
                              }
                            >
                              <CircleXIcon className="size-3.5 text-destructive" />
                            </RowActionButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {apiKeysPage?.next_cursor ? (
            <p className="mt-4 text-xs text-muted-foreground">
              此视图仅显示第一页 API 密钥。
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export function ServiceAccountsManager({
  kindLabel,
  serviceAccounts,
  nextCursor,
  isLoading,
  error,
  availableScopes,
  createPending,
  updatePending,
  disablePending,
  enablePending,
  issueApiKeyPending,
  revokeApiKeyPending,
  apiKeysQueryKeyPrefix,
  canCreate = true,
  canUpdate = true,
  canDisable = true,
  openCreateSignal,
  onCreateSignalConsumed,
  onCreate,
  onUpdate,
  onDisable,
  onEnable,
  onIssueApiKey,
  onRevokeApiKey,
  listApiKeys,
}: ServiceAccountsManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingServiceAccount, setEditingServiceAccount] =
    useState<ServiceAccountRead | null>(null)
  const [actionDialogState, setActionDialogState] =
    useState<ActionDialogState | null>(null)
  const [issueTarget, setIssueTarget] = useState<ServiceAccountRead | null>(
    null
  )
  const [issueKeyName, setIssueKeyName] = useState("Primary")
  const [draft, setDraft] = useState<ServiceAccountDraft>(EMPTY_DRAFT)
  const [issuedCredential, setIssuedCredential] =
    useState<ServiceAccountApiKeyIssueResponse | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<ServiceAccountStatusFilter>("all")
  const [expandedServiceAccountId, setExpandedServiceAccountId] = useState<
    string | null
  >(null)

  useEffect(() => {
    if (!dialogOpen) {
      setEditingServiceAccount(null)
      setDraft(EMPTY_DRAFT)
    }
  }, [dialogOpen])

  useEffect(() => {
    if (!openCreateSignal || !canCreate) {
      return
    }
    openCreateDialog()
    onCreateSignalConsumed?.()
  }, [canCreate, onCreateSignalConsumed, openCreateSignal])

  const permissionScopes = useMemo<ScopeRead[]>(
    () =>
      availableScopes.map((scope) => ({
        ...scope,
        source: "platform",
        source_ref: null,
        organization_id: null,
        created_at: "",
        updated_at: "",
      })),
    [availableScopes]
  )

  const selectedScopeIds = useMemo(
    () => new Set(draft.scopeIds),
    [draft.scopeIds]
  )

  const scopeCounts = useMemo(() => {
    let total = 0
    for (const category of Object.values(RESOURCE_CATEGORIES)) {
      const categoryScopes = getCategoryScopes(
        category.resources,
        permissionScopes
      )
      total += categoryScopes.filter((scope) =>
        selectedScopeIds.has(scope.id)
      ).length
    }
    return total
  }, [permissionScopes, selectedScopeIds])

  const isSaving = createPending || updatePending
  const isActionPending =
    disablePending || enablePending || revokeApiKeyPending || issueApiKeyPending
  const filteredServiceAccounts = useMemo(
    () =>
      serviceAccounts.filter(
        (serviceAccount) =>
          matchesServiceAccountStatusFilter(serviceAccount, statusFilter) &&
          matchesServiceAccountSearchQuery(serviceAccount, searchQuery)
      ),
    [searchQuery, serviceAccounts, statusFilter]
  )

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== "all"

  const openCreateDialog = () => {
    setEditingServiceAccount(null)
    setDraft(EMPTY_DRAFT)
    setDialogOpen(true)
  }

  const openEditDialog = (serviceAccount: ServiceAccountRead) => {
    setEditingServiceAccount(serviceAccount)
    setDraft({
      name: serviceAccount.name,
      description: serviceAccount.description ?? "",
      scopeIds: serviceAccount.scopes?.map((scope) => scope.id) ?? [],
      initialKeyName: serviceAccount.active_api_key?.name ?? "Primary",
    })
    setDialogOpen(true)
  }

  const toggleScope = useCallback((scopeId: string, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      scopeIds: checked
        ? [...current.scopeIds, scopeId]
        : current.scopeIds.filter((id) => id !== scopeId),
    }))
  }, [])

  const handleLevelChange = useCallback(
    (categoryResources: string[], level: PermissionLevel) => {
      setDraft((current) => {
        const nextScopeIds = new Set(current.scopeIds)
        const categoryScopes = getCategoryScopes(
          categoryResources,
          permissionScopes
        )

        for (const scope of categoryScopes) {
          nextScopeIds.delete(scope.id)
        }

        if (level !== "none" && level !== "mixed") {
          const scopesToAdd = getScopesForLevel(
            categoryResources,
            permissionScopes,
            level
          )
          for (const scopeId of scopesToAdd) {
            nextScopeIds.add(scopeId)
          }
        }

        return {
          ...current,
          scopeIds: Array.from(nextScopeIds),
        }
      })
    },
    [permissionScopes]
  )

  async function handleSave() {
    const trimmedName = draft.name.trim()
    if (!trimmedName) {
      toast({
        title: "名称不能为空",
        description: "服务账号必须有名称。",
        variant: "destructive",
      })
      return
    }

    try {
      if (editingServiceAccount) {
        await onUpdate({
          serviceAccountId: editingServiceAccount.id,
          requestBody: {
            name: trimmedName,
            description: draft.description.trim() || null,
            scope_ids: draft.scopeIds,
          },
        })
        toast({
          title: `已更新 ${kindLabel} 服务账号`,
          description: `已更新 ${trimmedName}。`,
        })
      } else {
        const response = await onCreate({
          name: trimmedName,
          description: draft.description.trim() || null,
          scope_ids: draft.scopeIds,
          initial_key_name: draft.initialKeyName.trim() || "Primary",
        })
        setIssuedCredential(response)
        toast({
          title: `已创建 ${kindLabel} 服务账号`,
          description: "请立即复制初始 API 密钥，之后不会再次显示。",
        })
      }
      setDialogOpen(false)
    } catch (saveError) {
      toast({
        title: `保存 ${kindLabel.toLowerCase()} 服务账号失败`,
        description: getApiErrorDetail(saveError, "请重试。"),
        variant: "destructive",
      })
    }
  }

  async function handleConfirmAction() {
    if (!actionDialogState) {
      return
    }

    try {
      if (actionDialogState.type === "disable") {
        await onDisable(actionDialogState.serviceAccount.id)
        toast({
          title: "服务账号已禁用",
          description: `${actionDialogState.serviceAccount.name} 将无法再验证身份。`,
        })
      } else if (actionDialogState.type === "enable") {
        await onEnable(actionDialogState.serviceAccount.id)
        toast({
          title: "服务账号已启用",
          description: `${actionDialogState.serviceAccount.name} 现可重新验证身份。`,
        })
      } else {
        await onRevokeApiKey({
          serviceAccountId: actionDialogState.serviceAccount.id,
          apiKeyId: actionDialogState.apiKey.id,
        })
        toast({
          title: "API 密钥已撤销",
          description: `已撤销 ${actionDialogState.apiKey.name}。`,
        })
      }
      setActionDialogState(null)
    } catch (actionError) {
      toast({
        title: "操作失败",
        description: getApiErrorDetail(actionError, "请重试。"),
        variant: "destructive",
      })
    }
  }

  async function handleIssueApiKey() {
    if (!issueTarget) {
      return
    }

    try {
      const response = await onIssueApiKey({
        serviceAccountId: issueTarget.id,
        requestBody: {
          name: issueKeyName.trim() || "Primary",
        },
      })
      setIssuedCredential(response)
      setIssueTarget(null)
      setIssueKeyName("Primary")
      toast({
        title: "已签发 API 密钥",
        description: "请立即复制替换用的 API 密钥，之后不会再次显示。",
      })
    } catch (issueError) {
      toast({
        title: "签发 API 密钥失败",
        description: getApiErrorDetail(issueError, "请重试。"),
        variant: "destructive",
      })
    }
  }

  if (error) {
    return (
      <AlertNotification
        level="error"
        message={`加载 ${kindLabel.toLowerCase()} 服务账号出错：${error.message}`}
      />
    )
  }

  return (
    <div className="flex size-full flex-col">
      <div className="shrink-0">
        <header className="flex h-10 items-center gap-3 border-b pl-3 pr-4">
          <ListHeaderSearch
            placeholder={`搜索 ${kindLabel.toLowerCase()} 服务账号…`}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {filteredServiceAccounts.length} 个服务账号
            </span>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
          {SERVICE_ACCOUNT_STATUS_FILTERS.map((filterOption) => (
            <button
              key={filterOption.value}
              type="button"
              onClick={() => setStatusFilter(filterOption.value)}
              className={cn(
                "flex h-6 items-center rounded-md border border-input bg-transparent px-2 text-xs font-medium transition-colors",
                "hover:bg-muted/50",
                statusFilter === filterOption.value
                  ? "border-primary/50 bg-primary/5 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filterOption.label}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("all")
              }}
              className="flex h-6 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              重置
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            正在加载服务账号…
          </div>
        ) : serviceAccounts.length === 0 ? (
          <Empty className="rounded-none border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <KeyRoundIcon />
              </EmptyMedia>
              <EmptyTitle>暂无服务账号</EmptyTitle>
              <EmptyDescription>
                创建服务账号以管理此范围的机器访问： {kindLabel.toLowerCase()}.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : filteredServiceAccounts.length === 0 ? (
          <Empty className="rounded-none border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>没有匹配的服务账号</EmptyTitle>
              <EmptyDescription>
                调整搜索词或筛选条件以查找服务账号。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredServiceAccounts.map((serviceAccount) => {
              const isExpanded = expandedServiceAccountId === serviceAccount.id
              const statusGroup = getServiceAccountGroup(serviceAccount)
              const statusConfig = STATUS_GROUPS[statusGroup]
              const ownerLabel = getUserDisplayName(
                serviceAccount.owner_user,
                serviceAccount.owner_user_id
              )

              return (
                <div key={serviceAccount.id}>
                  <div
                    className={cn(
                      "group/item flex cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors",
                      "hover:bg-muted/50",
                      isExpanded && "bg-muted/30"
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setExpandedServiceAccountId(
                        isExpanded ? null : serviceAccount.id
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setExpandedServiceAccountId(
                          isExpanded ? null : serviceAccount.id
                        )
                      }
                    }}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                      <ChevronRightIcon
                        className={cn(
                          "size-4 text-muted-foreground transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                      <div className="flex min-w-0 shrink-0 items-center gap-2">
                        <BotIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className={SERVICE_ACCOUNT_NAME_COLUMN_CLASS}>
                          {serviceAccount.name}
                        </span>
                      </div>

                      <div className={SERVICE_ACCOUNT_STATUS_COLUMN_CLASS}>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-5 shrink-0 gap-1.5 bg-secondary px-1.5 py-0 text-[10px] font-normal",
                            statusConfig.textClassName
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              statusConfig.dotClassName
                            )}
                          />
                          <span>{statusConfig.label}</span>
                        </Badge>
                      </div>

                      <span
                        className={SERVICE_ACCOUNT_DESCRIPTION_COLUMN_CLASS}
                      >
                        {serviceAccount.description ?? ""}
                      </span>

                      <span className={SERVICE_ACCOUNT_CREATOR_COLUMN_CLASS}>
                        {ownerLabel ? `创建者：${ownerLabel}` : ""}
                      </span>

                      <div className="flex min-w-0 items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="h-5 shrink-0 gap-1 px-1.5 py-0 text-[10px] font-normal"
                        >
                          <ShieldIcon className="size-3 shrink-0 text-muted-foreground" />
                          {(serviceAccount.scopes?.length ?? 0).toString()}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="h-5 shrink-0 gap-1 px-1.5 py-0 text-[10px] font-normal"
                        >
                          <KeyRoundIcon className="size-3 shrink-0 text-muted-foreground" />
                          {(
                            serviceAccount.api_key_counts?.total ?? 0
                          ).toString()}
                        </Badge>
                        <LastUsedIndicator
                          value={serviceAccount.last_used_at}
                        />
                      </div>
                    </div>

                    <div
                      className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/item:opacity-100"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <RowActionButton
                        label={"编辑服务账号"}
                        className="size-7"
                        disabled={!canUpdate}
                        onClick={() => openEditDialog(serviceAccount)}
                      >
                        <SquarePenIcon className="size-3.5" />
                      </RowActionButton>
                      <RowActionButton
                        label={"创建 API 密钥"}
                        className="size-7"
                        disabled={
                          Boolean(serviceAccount.disabled_at) || !canUpdate
                        }
                        onClick={() => {
                          setIssueTarget(serviceAccount)
                          setIssueKeyName(
                            serviceAccount.active_api_key?.name ?? "Primary"
                          )
                        }}
                      >
                        <RefreshCwIcon className="size-3.5" />
                      </RowActionButton>
                      <RowActionButton
                        label={
                          serviceAccount.disabled_at
                            ? "启用服务账号"
                            : "禁用服务账号"
                        }
                        className="size-7"
                        disabled={!canDisable}
                        onClick={() =>
                          setActionDialogState({
                            type: serviceAccount.disabled_at
                              ? "enable"
                              : "disable",
                            serviceAccount,
                          })
                        }
                      >
                        {serviceAccount.disabled_at ? (
                          <CircleCheckIcon className="size-3.5 text-green-600" />
                        ) : (
                          <CircleXIcon className="size-3.5 text-destructive" />
                        )}
                      </RowActionButton>
                    </div>
                  </div>

                  {isExpanded && (
                    <ServiceAccountDetailPanel
                      serviceAccount={serviceAccount}
                      expanded={isExpanded}
                      listApiKeys={listApiKeys}
                      apiKeysQueryKeyPrefix={apiKeysQueryKeyPrefix}
                      canUpdate={canUpdate}
                      revokeApiKeyPending={revokeApiKeyPending}
                      onOpenActionDialog={setActionDialogState}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {nextCursor ? (
          <div className="flex h-10 items-center justify-center text-xs text-muted-foreground">
            仅显示第一页服务账号。
          </div>
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg" className="max-w-3xl">
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              await handleSave()
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogHeader>
              <DialogTitle>
                {editingServiceAccount ? "编辑服务账号" : "创建服务账号"}
              </DialogTitle>
              <DialogDescription>
                {editingServiceAccount
                  ? "更新服务账号的名称、描述和权限。"
                  : `创建具有指定权限的 ${kindLabel.toLowerCase()} 服务账号。`}
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="service-account-name">服务账号名称</Label>
                    <Input
                      id="service-account-name"
                      name="service-account-name"
                      value={draft.name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder={"例如：CI 部署账号"}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-account-description">描述</Label>
                    <Input
                      id="service-account-description"
                      name="service-account-description"
                      value={draft.description}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder={"可选描述"}
                    />
                  </div>
                </div>

                {!editingServiceAccount ? (
                  <div className="space-y-2">
                    <Label htmlFor="service-account-initial-key-name">
                      初始密钥标签
                    </Label>
                    <Input
                      id="service-account-initial-key-name"
                      name="service-account-initial-key-name"
                      value={draft.initialKeyName}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          initialKeyName: event.target.value,
                        }))
                      }
                      placeholder={"主要"}
                    />
                  </div>
                ) : null}

                <div className="flex min-h-0 flex-1 flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label>权限（{scopeCounts} 项权限范围已选择）</Label>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    按类别设置权限级别，或展开后选择各项权限范围。
                  </div>
                  <div className="h-[400px] overflow-y-auto rounded-md border">
                    <div className="divide-y divide-border/50">
                      {Object.entries(RESOURCE_CATEGORIES).map(
                        ([key, category]) => (
                          <ScopeCategoryRow
                            key={key}
                            categoryKey={key}
                            category={category}
                            scopes={permissionScopes}
                            selectedScopeIds={selectedScopeIds}
                            onScopeToggle={toggleScope}
                            onLevelChange={handleLevelChange}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                size="sm"
                type="submit"
                disabled={
                  isSaving ||
                  (!editingServiceAccount && !canCreate) ||
                  (editingServiceAccount !== null && !canUpdate)
                }
              >
                {isSaving
                  ? "保存中…"
                  : editingServiceAccount
                    ? "保存更改"
                    : "创建服务账号"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(issuedCredential)}
        onOpenChange={(open) => {
          if (!open) {
            setIssuedCredential(null)
          }
        }}
      >
        <DialogContent size="sm" className="max-w-md">
          <DialogHeader>
            <DialogTitle>复制 API 密钥</DialogTitle>
            <DialogDescription>
              此密钥只显示一次，请在关闭对话框前复制。
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {issuedCredential ? (
              <div className="flex min-w-0 max-w-full items-center gap-3 rounded-lg bg-muted/60 px-4 py-3.5">
                <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground/90 select-all">
                  {issuedCredential.issued_api_key.raw_key}
                </code>
                <CopyButton
                  value={issuedCredential.issued_api_key.raw_key}
                  toastMessage="已复制 API 密钥"
                  tooltipMessage="复制原始密钥"
                  className="size-6 shrink-0"
                  iconClassName="size-4 text-foreground/70"
                />
              </div>
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(issueTarget)}
        onOpenChange={(open) => !open && setIssueTarget(null)}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>创建 API 密钥</DialogTitle>
            <DialogDescription>
              {issueTarget?.active_api_key?.name ? (
                <>
                  当前生效的密钥{" "}
                  <span className={INLINE_NAME_HIGHLIGHT_CLASS}>
                    {issueTarget.active_api_key.name}
                  </span>
                  将被撤销并由新密钥替代。
                </>
              ) : (
                "当前生效的密钥将被撤销并由新密钥替代。"
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-2">
              <Label htmlFor="issued-key-name">新密钥标签</Label>
              <Input
                id="issued-key-name"
                name="issued-key-name"
                value={issueKeyName}
                onChange={(event) => setIssueKeyName(event.target.value)}
                placeholder={"主要"}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              size="sm"
              onClick={handleIssueApiKey}
              disabled={issueApiKeyPending}
            >
              {issueApiKeyPending ? "签发中…" : "签发密钥"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(actionDialogState)}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialogState(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialogState?.type === "disable"
                ? "禁用服务账号"
                : actionDialogState?.type === "enable"
                  ? "启用服务账号"
                  : "撤销 API 密钥"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialogState?.type === "disable" ? (
                <>
                  <span className={INLINE_NAME_HIGHLIGHT_CLASS}>
                    {actionDialogState.serviceAccount.name}
                  </span>
                  将立即停止身份验证。
                </>
              ) : actionDialogState?.type === "enable" ? (
                <>
                  <span className={INLINE_NAME_HIGHLIGHT_CLASS}>
                    {actionDialogState.serviceAccount.name}
                  </span>
                  将可重新验证身份。
                </>
              ) : (
                <>
                  <span className={INLINE_NAME_HIGHLIGHT_CLASS}>
                    {actionDialogState?.apiKey.name}
                  </span>
                  将无法再验证身份。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionPending}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              variant={
                actionDialogState?.type === "enable" ? "default" : "destructive"
              }
              disabled={isActionPending}
              onClick={async (event) => {
                event.preventDefault()
                await handleConfirmAction()
              }}
            >
              {isActionPending ? "处理中…" : "确认"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
