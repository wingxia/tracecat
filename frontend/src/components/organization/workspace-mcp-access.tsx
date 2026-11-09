"use client"

import { format, formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  KeyRoundIcon,
  SearchIcon,
  TerminalIcon,
  Trash2Icon,
} from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import type {
  MCPPersonalAccessTokenCreate,
  MCPPersonalAccessTokenIssueResponse,
  MCPPersonalAccessTokenRead,
} from "@/client"
import { CopyButton } from "@/components/copy-button"
import { ListHeaderSearch } from "@/components/list-header-search"
import { AlertNotification } from "@/components/notifications"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { useWorkspaceMcpPersonalAccessTokens } from "@/hooks/use-mcp-personal-access-tokens"
import { getApiErrorDetail } from "@/lib/errors"
import { cn } from "@/lib/utils"
import { useWorkspaceId } from "@/providers/workspace-id"

type ExpirationPreset = "never" | "7d" | "30d" | "90d" | "custom"
type TokenStatus = "active" | "expired" | "revoked"
type TokenStatusFilter = "all" | TokenStatus

const CREATE_MCP_TOKEN_PARAM = "createMcpToken"

const STATUS_FILTERS: { value: TokenStatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "active", label: "已启用" },
  { value: "expired", label: "已过期" },
  { value: "revoked", label: "已撤销" },
]

const EXPIRATION_PRESETS: { value: ExpirationPreset; label: string }[] = [
  { value: "never", label: "从未" },
  { value: "7d", label: "7 天" },
  { value: "30d", label: "30 天" },
  { value: "90d", label: "90 天" },
  { value: "custom", label: "自定义" },
]

function addDaysIso(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function getPresetExpiresAt(preset: ExpirationPreset): string | null {
  switch (preset) {
    case "never":
      return null
    case "7d":
      return addDaysIso(7)
    case "30d":
      return addDaysIso(30)
    case "90d":
      return addDaysIso(90)
    case "custom":
      return null
  }
}

function getDefaultCustomExpiration(): string {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  const offsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function formatRelativeTimestamp(value?: string | null): string {
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

function getTokenStatus(token: MCPPersonalAccessTokenRead): TokenStatus {
  if (token.revoked_at) {
    return "revoked"
  }
  if (token.expires_at && new Date(token.expires_at).getTime() <= Date.now()) {
    return "expired"
  }
  return "active"
}

function getStatusConfig(status: TokenStatus): {
  label: string
  dotClassName: string
  textClassName: string
} {
  switch (status) {
    case "active":
      return {
        label: "已启用",
        dotClassName: "bg-green-500",
        textClassName: "text-green-700 dark:text-green-400",
      }
    case "expired":
      return {
        label: "已过期",
        dotClassName: "bg-muted-foreground",
        textClassName: "text-muted-foreground",
      }
    case "revoked":
      return {
        label: "已撤销",
        dotClassName: "bg-muted-foreground",
        textClassName: "text-muted-foreground",
      }
  }
}

function tokenMatchesSearch(
  token: MCPPersonalAccessTokenRead,
  query: string
): boolean {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return true
  }
  return [token.name, token.preview, token.key_id]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(normalizedQuery))
}

function CreateTokenDialog({
  open,
  pending,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (requestBody: MCPPersonalAccessTokenCreate) => Promise<void>
}) {
  const [name, setName] = useState("Claude Code")
  const [expirationPreset, setExpirationPreset] =
    useState<ExpirationPreset>("30d")
  const [customExpiration, setCustomExpiration] = useState(
    getDefaultCustomExpiration()
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast({
        title: "名称不能为空",
        description: "MCP 令牌必须有名称。",
        variant: "destructive",
      })
      return
    }

    let expiresAt = getPresetExpiresAt(expirationPreset)
    if (expirationPreset === "custom") {
      if (!customExpiration) {
        toast({
          title: "到期时间不能为空",
          description: "选择自定义到期时间或使用其他预设。",
          variant: "destructive",
        })
        return
      }
      expiresAt = new Date(customExpiration).toISOString()
    }

    await onCreate({
      name: trimmedName,
      expires_at: expiresAt,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>创建 MCP 令牌</DialogTitle>
            <DialogDescription>
              为无法使用 OIDC 的 MCP 客户端创建工作空间范围的 Bearer 凭据。
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mcp-token-name">名称</Label>
                <Input
                  id="mcp-token-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Claude Code"
                />
              </div>

              <div className="space-y-2">
                <Label>到期时间</Label>
                <Select
                  value={expirationPreset}
                  onValueChange={(value) =>
                    setExpirationPreset(value as ExpirationPreset)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRATION_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {expirationPreset === "custom" ? (
                <div className="space-y-2">
                  <Label htmlFor="mcp-token-custom-expiration">
                    自定义到期时间
                  </Label>
                  <Input
                    id="mcp-token-custom-expiration"
                    type="datetime-local"
                    value={customExpiration}
                    onChange={(event) =>
                      setCustomExpiration(event.target.value)
                    }
                  />
                </div>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button size="sm" type="submit" disabled={pending}>
              {pending ? "创建中…" : "创建令牌"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function IssuedTokenDialog({
  issuedCredential,
  onClose,
}: {
  issuedCredential: MCPPersonalAccessTokenIssueResponse | null
  onClose: () => void
}) {
  const rawToken = issuedCredential?.issued_token.raw_token ?? ""

  return (
    <Dialog
      open={issuedCredential !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent size="sm" className="w-[calc(100vw-2rem)] max-w-2xl">
        <DialogHeader>
          <DialogTitle>MCP 个人访问令牌</DialogTitle>
          <DialogDescription>
            请立即复制令牌，之后不会再次显示。客户端连接方式请参阅{" "}
            <a
              href="https://docs.tracecat.com/automations/tracecat-mcp"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              MCP 文档
            </a>{" "}
            。
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex min-w-0 max-w-full items-center gap-3 rounded-lg bg-muted/60 px-4 py-3.5">
            <code className="min-w-0 flex-1 truncate font-mono text-sm text-foreground/90 select-all">
              {rawToken}
            </code>
            <CopyButton
              value={rawToken}
              toastMessage="已复制 MCP 令牌。"
              tooltipMessage={"复制令牌"}
              className="size-6 shrink-0"
              iconClassName="size-4 text-foreground/70"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button size="sm" type="button" onClick={onClose}>
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TokenStatusBadge({ token }: { token: MCPPersonalAccessTokenRead }) {
  const status = getTokenStatus(token)
  const config = getStatusConfig(status)

  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-5 shrink-0 gap-1.5 bg-secondary px-1.5 py-0 text-[10px] font-normal",
        config.textClassName
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)}
      />
      <span>{config.label}</span>
    </Badge>
  )
}

function TokenRow({
  token,
  canManage,
  onRevoke,
}: {
  token: MCPPersonalAccessTokenRead
  canManage: boolean
  onRevoke: (token: MCPPersonalAccessTokenRead) => void
}) {
  const status = getTokenStatus(token)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 py-3">
      <div className="flex min-w-0 gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30">
          <KeyRoundIcon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-medium">{token.name}</div>
            <TokenStatusBadge token={token} />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span>
              预览{" "}
              <code className="font-mono text-foreground/80">
                {token.preview}
              </code>
            </span>
            <span title={formatFullTimestamp(token.created_at)}>
              创建时间 {formatRelativeTimestamp(token.created_at)}
            </span>
            <span title={formatFullTimestamp(token.expires_at)}>
              到期时间 {formatRelativeTimestamp(token.expires_at)}
            </span>
            <span title={formatFullTimestamp(token.last_used_at)}>
              上次使用 {formatRelativeTimestamp(token.last_used_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-start">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!canManage || status === "revoked"}
          onClick={() => onRevoke(token)}
          className="gap-2 text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon className="size-3.5" />
          撤销
        </Button>
      </div>
    </div>
  )
}

/**
 * Workspace MCP token management screen.
 */
export function WorkspaceMcpAccess() {
  const workspaceId = useWorkspaceId()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)
  const [issuedCredential, setIssuedCredential] =
    useState<MCPPersonalAccessTokenIssueResponse | null>(null)
  const [revokeTarget, setRevokeTarget] =
    useState<MCPPersonalAccessTokenRead | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<TokenStatusFilter>("all")

  const {
    tokens,
    nextCursor,
    isLoading,
    error,
    createToken,
    createPending,
    revokeToken,
    revokePending,
  } = useWorkspaceMcpPersonalAccessTokens(workspaceId)

  const filteredTokens = useMemo(
    () =>
      tokens.filter((token) => {
        const status = getTokenStatus(token)
        return (
          (statusFilter === "all" || status === statusFilter) &&
          tokenMatchesSearch(token, searchQuery)
        )
      }),
    [searchQuery, statusFilter, tokens]
  )

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== "all"

  const handleCreateSignalConsumed = useCallback(() => {
    if (!pathname || !searchParams?.get(CREATE_MCP_TOKEN_PARAM)) {
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.delete(CREATE_MCP_TOKEN_PARAM)
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (!searchParams?.get(CREATE_MCP_TOKEN_PARAM)) {
      return
    }
    setCreateOpen(true)
    handleCreateSignalConsumed()
  }, [handleCreateSignalConsumed, searchParams])

  async function handleCreate(requestBody: MCPPersonalAccessTokenCreate) {
    try {
      const response = await createToken(requestBody)
      setIssuedCredential(response)
      setCreateOpen(false)
      toast({
        title: "已创建 MCP 令牌",
        description: "请立即复制令牌，之后不会再次显示。",
      })
    } catch (createError) {
      toast({
        title: "创建 MCP 令牌失败",
        description: getApiErrorDetail(createError) ?? "请重试。",
        variant: "destructive",
      })
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) {
      return
    }
    try {
      await revokeToken(revokeTarget.id)
      toast({
        title: "已撤销 MCP 令牌",
        description: `${revokeTarget.name} 将无法再验证身份。`,
      })
      setRevokeTarget(null)
    } catch (revokeError) {
      toast({
        title: "撤销 MCP 令牌失败",
        description: getApiErrorDetail(revokeError) ?? "请重试。",
        variant: "destructive",
      })
    }
  }

  if (error) {
    return (
      <AlertNotification
        level="error"
        message={`加载 MCP 令牌出错：${error.message}`}
      />
    )
  }

  return (
    <div className="flex size-full flex-col">
      <div className="shrink-0">
        <header className="flex h-10 items-center gap-3 border-b pl-3 pr-4">
          <ListHeaderSearch
            placeholder={"搜索 MCP 令牌…"}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {filteredTokens.length} 令牌
            </span>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
          {STATUS_FILTERS.map((filterOption) => (
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

          {hasActiveFilters ? (
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
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            正在加载 MCP 令牌…
          </div>
        ) : tokens.length === 0 ? (
          <Empty className="rounded-none border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TerminalIcon />
              </EmptyMedia>
              <EmptyTitle>暂无 MCP 令牌</EmptyTitle>
              <EmptyDescription>
                为无法使用 OIDC 的 MCP 客户端创建工作空间范围的令牌。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : filteredTokens.length === 0 ? (
          <Empty className="rounded-none border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>没有匹配的 MCP 令牌</EmptyTitle>
              <EmptyDescription>
                调整搜索词或筛选条件以查找令牌。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredTokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                canManage
                onRevoke={setRevokeTarget}
              />
            ))}
          </div>
        )}

        {nextCursor ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            此视图仅显示第一页 MCP 令牌。
          </p>
        ) : null}
      </div>

      <CreateTokenDialog
        open={createOpen}
        pending={createPending}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />
      <IssuedTokenDialog
        issuedCredential={issuedCredential}
        onClose={() => setIssuedCredential(null)}
      />
      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撤销 MCP 令牌？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作会立即阻止 {revokeTarget?.name ?? "此令牌"} 向 MCP
              服务器进行身份验证。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokePending}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={revokePending}
              onClick={(event) => {
                event.preventDefault()
                void handleRevoke()
              }}
            >
              {revokePending ? "撤销中…" : "撤销令牌"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
