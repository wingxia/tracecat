"use client"

import {
  ArrowUpRight,
  KeyRoundIcon,
  MoreHorizontal,
  NetworkIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import type {
  ManagedTunnelCreated,
  TunnelGatewayKeyRead,
  TunnelRead,
  TunnelReference,
  TunnelTarget,
} from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { CopyButton } from "@/components/copy-button"
import { EntitlementRequiredEmptyState } from "@/components/entitlement-required-empty-state"
import { CenteredSpinner } from "@/components/loading/spinner"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { useEntitlements } from "@/hooks/use-entitlements"
import {
  useTunnelAvailability,
  useTunnelDetail,
  useTunnelStatus,
  useTunnels,
} from "@/hooks/use-tunnels"
import { getApiErrorDetail } from "@/lib/errors"
import { cn } from "@/lib/utils"
import { useWorkspaceId } from "@/providers/workspace-id"

const CREATE_TUNNEL_FORM_ID = "create-tunnel-form"
const KUBERNETES_ONLY_MESSAGE =
  "此部署没有隧道网关后端，无法创建或使用隧道。请使用 Helm Chart 部署 Tracecat 并启用隧道。"
const TUNNEL_NAME_PATTERN = /^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$/

/**
 * Parses one target per line, written as `host:port[,port...]`.
 * Throws with a user-facing message on the first invalid line.
 */
export function parseTunnelTargets(text: string): TunnelTarget[] {
  const targets: TunnelTarget[] = []
  for (const [index, raw] of text.split("\n").entries()) {
    const line = raw.trim()
    if (!line) continue
    const separator = line.lastIndexOf(":")
    if (separator <= 0) {
      throw new Error(
        `Line ${index + 1}: use host:port, for example splunk.internal:8089`
      )
    }
    const host = line.slice(0, separator).trim()
    const ports = line
      .slice(separator + 1)
      .split(",")
      .map((port) => Number(port.trim()))
    if (
      ports.some((port) => !Number.isInteger(port) || port < 1 || port > 65535)
    ) {
      throw new Error(`Line ${index + 1}: ports must be between 1 and 65535`)
    }
    targets.push({ host, ports })
  }
  if (targets.length === 0) {
    throw new Error("请至少添加一个目标")
  }
  return targets
}

function formatTargets(targets: TunnelTarget[]): string {
  return targets
    .map((target) => `${target.host}:${target.ports.join(",")}`)
    .join(", ")
}

/** Header shared by every state of the tunnels page. */
export function CreateTunnelButton() {
  const workspaceId = useWorkspaceId()
  const canCreate = useScopeCheck("tunnel:create")
  const { hasEntitlement } = useEntitlements()
  const tunnelsEnabled = hasEntitlement("tunnels")
  const { createManagedTunnel, createPending } = useTunnels(workspaceId, {
    enabled: tunnelsEnabled,
  })
  const tunnelsAvailable = useTunnelAvailability(workspaceId, {
    enabled: tunnelsEnabled,
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [created, setCreated] = useState<ManagedTunnelCreated | null>(null)

  if (!tunnelsEnabled || canCreate !== true || tunnelsAvailable !== true) {
    return null
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 bg-background"
        onClick={() => setCreateOpen(true)}
      >
        <PlusIcon className="mr-1 h-3.5 w-3.5" />
        创建隧道
      </Button>
      <CreateTunnelDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pending={createPending}
        onCreate={async (values) => {
          try {
            const result = await createManagedTunnel(values)
            setCreateOpen(false)
            setCreated(result)
          } catch (err) {
            toast({
              title: "创建隧道失败",
              description: getApiErrorDetail(err),
              variant: "destructive",
            })
          }
        }}
      />
      <Dialog
        open={created !== null}
        onOpenChange={(open) => !open && setCreated(null)}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>安装站点连接器</DialogTitle>
            <DialogDescription>
              在可访问目标的主机上运行此命令，其中包含密钥，仅显示一次。
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {created ? (
              <SecretValue
                value={created.site_install_command}
                toastMessage="已复制安装命令"
              />
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function WorkspaceTunnels() {
  const workspaceId = useWorkspaceId()
  const canUpdate = useScopeCheck("tunnel:update")
  const canDelete = useScopeCheck("tunnel:delete")
  const {
    hasEntitlement,
    hasEntitlementData,
    isLoading: entitlementsLoading,
  } = useEntitlements()
  const tunnelsEnabled = hasEntitlement("tunnels")
  const {
    tunnels,
    isLoading,
    error,
    updateTunnel,
    deleteTunnel,
    deletePending,
    issueGatewayKey,
    issueGatewayKeyPending,
  } = useTunnels(workspaceId, { enabled: tunnelsEnabled })
  const tunnelsAvailable = useTunnelAvailability(workspaceId, {
    enabled: tunnelsEnabled,
  })

  const [rotateTarget, setRotateTarget] = useState<TunnelRead | null>(null)
  const [issuedKey, setIssuedKey] = useState<TunnelGatewayKeyRead | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TunnelRead | null>(null)
  const { data: deleteTargetDetail, isLoading: referencesLoading } =
    useTunnelDetail(workspaceId, deleteTarget?.id)
  const referencedBy = deleteTargetDetail?.referenced_by ?? []

  if (entitlementsLoading) {
    return <CenteredSpinner />
  }

  let body: React.ReactNode
  if (!hasEntitlementData) {
    body = (
      <div className="flex h-full p-6">
        <EntitlementRequiredEmptyState
          title={"无法检查套餐权限"}
          description={"请重新加载页面后重试。"}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            重新加载
          </Button>
        </EntitlementRequiredEmptyState>
      </div>
    )
  } else if (!tunnelsEnabled) {
    body = (
      <div className="flex h-full p-6">
        <EntitlementRequiredEmptyState
          title={"需要升级"}
          description={"当前套餐不支持隧道。"}
        >
          <Button
            variant="link"
            asChild
            className="text-muted-foreground"
            size="sm"
          >
            <a
              href="https://tracecat.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              了解更多 <ArrowUpRight className="size-4" />
            </a>
          </Button>
        </EntitlementRequiredEmptyState>
      </div>
    )
  } else if (error) {
    body = (
      <div className="p-6">
        <AlertNotification
          level="error"
          message={`加载隧道出错：${error.message}`}
        />
      </div>
    )
  } else if (isLoading) {
    body = (
      <div className="flex h-full items-center justify-center">
        <CenteredSpinner />
      </div>
    )
  } else if (tunnels.length === 0 && tunnelsAvailable === false) {
    body = (
      <div className="flex h-full p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NetworkIcon className="size-5 text-muted-foreground/60" />
            </EmptyMedia>
            <EmptyTitle>隧道需要 Kubernetes</EmptyTitle>
            <EmptyDescription>{KUBERNETES_ONLY_MESSAGE}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  } else if (tunnels.length === 0) {
    body = (
      <div className="flex h-full p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NetworkIcon className="size-5 text-muted-foreground/60" />
            </EmptyMedia>
            <EmptyTitle>暂无隧道</EmptyTitle>
            <EmptyDescription>
              创建隧道，让动作访问私有网络中的主机。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  } else {
    body = (
      <div className="divide-y">
        {tunnels.map((tunnel) => (
          <div
            key={tunnel.id}
            className="group/item flex items-center gap-2 px-4 py-2 transition-colors hover:bg-muted/50"
          >
            <NetworkIcon className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex w-[340px] min-w-0 shrink-0 items-baseline gap-2 text-xs">
                <span className="truncate">{tunnel.name}</span>
                {tunnel.description ? (
                  <span className="min-w-0 truncate text-muted-foreground">
                    {tunnel.description}
                  </span>
                ) : null}
              </div>
              <span
                className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground"
                title={formatTargets(tunnel.allowed_targets)}
              >
                {formatTargets(tunnel.allowed_targets)}
              </span>
            </div>
            <div className="shrink-0">
              <TunnelStatusCell workspaceId={workspaceId} tunnel={tunnel} />
            </div>
            <Switch
              aria-label={`启用 ${tunnel.name}`}
              checked={tunnel.enabled}
              disabled={canUpdate !== true}
              onCheckedChange={async (enabled) => {
                try {
                  await updateTunnel({
                    tunnelId: tunnel.id,
                    requestBody: { enabled },
                  })
                } catch (err) {
                  toast({
                    title: "更新隧道失败",
                    description: getApiErrorDetail(err),
                    variant: "destructive",
                  })
                }
              }}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`${tunnel.name} 的操作`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={canUpdate !== true}
                  onSelect={() => setRotateTarget(tunnel)}
                >
                  <KeyRoundIcon className="mr-2 size-4" />
                  轮换网关密钥
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={canDelete !== true}
                  className="text-destructive"
                  onSelect={() => setDeleteTarget(tunnel)}
                >
                  <Trash2Icon className="mr-2 size-4" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    )
  }

  if (tunnelsAvailable === false && tunnels.length > 0) {
    body = (
      <>
        <div className="p-4">
          <AlertNotification
            level="warning"
            message={`隧道需要 Kubernetes。${KUBERNETES_ONLY_MESSAGE}`}
          />
        </div>
        {body}
      </>
    )
  }

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">{body}</div>

      <AlertDialog
        open={rotateTarget !== null}
        onOpenChange={(open) => !open && setRotateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>轮换网关密钥</AlertDialogTitle>
            <AlertDialogDescription>
              当前密钥将立即失效。由 Tracecat
              运行的网关会使用新密钥重启，自行运行的网关需要手动更新。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={issueGatewayKeyPending}
              onClick={async () => {
                if (!rotateTarget) return
                try {
                  setIssuedKey(await issueGatewayKey(rotateTarget.id))
                } catch (err) {
                  toast({
                    title: "轮换网关密钥失败",
                    description: getApiErrorDetail(err),
                    variant: "destructive",
                  })
                } finally {
                  setRotateTarget(null)
                }
              }}
            >
              轮换
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={issuedKey !== null}
        onOpenChange={(open) => !open && setIssuedKey(null)}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>网关密钥</DialogTitle>
            <DialogDescription>
              仅自行运行的网关需要此密钥，密钥只显示一次。
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {issuedKey ? (
              <SecretValue
                value={issuedKey.gateway_key}
                toastMessage="已复制网关密钥"
              />
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {referencesLoading
                ? "正在检查隧道的使用位置…"
                : referencedBy.length > 0
                  ? "此隧道仍在使用中。请先从这些资源中移除，再删除隧道。"
                  : "没有资源使用此隧道。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {referencedBy.length > 0 ? (
            <TunnelReferencesList
              workspaceId={workspaceId}
              references={referencedBy}
            />
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={
                deletePending || referencesLoading || referencedBy.length > 0
              }
              onClick={async () => {
                if (!deleteTarget) return
                try {
                  await deleteTunnel(deleteTarget.id)
                } catch (err) {
                  toast({
                    title: "删除隧道失败",
                    description: getApiErrorDetail(err),
                    variant: "destructive",
                  })
                } finally {
                  setDeleteTarget(null)
                }
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const REFERENCE_KIND_LABELS: Record<TunnelReference["kind"], string> = {
  mcp_integration: "MCP 服务器",
  agent_preset: "智能体",
  workflow: "工作流",
}

function tunnelReferenceHref(
  workspaceId: string,
  reference: TunnelReference
): string {
  switch (reference.kind) {
    case "mcp_integration":
      return `/workspaces/${workspaceId}/mcp-servers`
    case "agent_preset":
      return `/workspaces/${workspaceId}/agents/${reference.id}`
    case "workflow":
      return `/workspaces/${workspaceId}/workflows/${reference.id}`
  }
}

function TunnelReferencesList({
  workspaceId,
  references,
}: {
  workspaceId: string
  references: TunnelReference[]
}) {
  return (
    <ul className="max-h-64 divide-y overflow-y-auto rounded-md border text-sm">
      {references.map((reference) => (
        <li
          key={`${reference.kind}:${reference.id}`}
          className="flex items-center gap-3 px-3 py-2"
        >
          <span className="w-20 shrink-0 text-xs text-muted-foreground">
            {REFERENCE_KIND_LABELS[reference.kind]}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={tunnelReferenceHref(workspaceId, reference)}
              target="_blank"
              className="block truncate font-medium hover:underline"
            >
              {reference.name}
            </Link>
            {reference.detail ? (
              <p className="truncate text-xs text-muted-foreground">
                {reference.detail}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

function SecretValue({
  value,
  toastMessage,
}: {
  value: string
  toastMessage: string
}) {
  return (
    <div className="flex min-w-0 max-w-full items-start gap-3 rounded-lg bg-muted/60 px-4 py-3.5">
      <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-xs text-foreground/90 select-all">
        {value}
      </code>
      <CopyButton
        value={value}
        toastMessage={toastMessage}
        tooltipMessage={"复制"}
        className="size-6 shrink-0"
        iconClassName="size-4 text-foreground/70"
      />
    </div>
  )
}

function StatusDot({ label, ok }: { label: string; ok: boolean | null }) {
  let color = "bg-muted-foreground/40"
  if (ok === true) color = "bg-emerald-500"
  if (ok === false) color = "bg-red-500"
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", color)} />
      {label}
    </span>
  )
}

function TunnelStatusCell({
  workspaceId,
  tunnel,
}: {
  workspaceId: string
  tunnel: TunnelRead
}) {
  const { data, isLoading, error } = useTunnelStatus(workspaceId, tunnel.id, {
    enabled: tunnel.enabled,
  })
  if (!tunnel.enabled) {
    return <span className="text-xs text-muted-foreground">已禁用</span>
  }
  if (isLoading) {
    return <span className="text-xs text-muted-foreground">检查中…</span>
  }
  if (error || !data) {
    return <StatusDot label={"未知"} ok={null} />
  }
  return (
    <div className="flex items-center gap-3">
      {data.site_online !== null ? (
        <StatusDot
          label={data.site_online ? "站点在线" : "站点离线"}
          ok={data.site_online}
        />
      ) : null}
      {data.gateway_ready !== null && data.gateway_ready !== undefined ? (
        <StatusDot
          label={data.gateway_ready ? "网关就绪" : "网关启动中"}
          ok={data.gateway_ready}
        />
      ) : null}
    </div>
  )
}

function CreateTunnelDialog({
  open,
  onOpenChange,
  pending,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onCreate: (values: {
    name: string
    description: string | null
    allowed_targets: TunnelTarget[]
  }) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [targets, setTargets] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  function reset() {
    setName("")
    setDescription("")
    setTargets("")
    setFormError(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>创建隧道</DialogTitle>
          <DialogDescription>
            Tracecat 会为每个目标配置 Pangolin 站点、客户端和资源。
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form
            id={CREATE_TUNNEL_FORM_ID}
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              const trimmed = name.trim()
              if (!TUNNEL_NAME_PATTERN.test(trimmed) || trimmed.length > 63) {
                setFormError(
                  "名称只能包含小写字母、数字、- 或 _，最多 63 个字符。"
                )
                return
              }
              let allowedTargets: TunnelTarget[]
              try {
                allowedTargets = parseTunnelTargets(targets)
              } catch (err) {
                setFormError(err instanceof Error ? err.message : String(err))
                return
              }
              setFormError(null)
              await onCreate({
                name: trimmed,
                description: description.trim() || null,
                allowed_targets: allowedTargets,
              })
              reset()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="tunnel-name" className="text-xs">
                名称
              </Label>
              <Input
                id="tunnel-name"
                className="text-xs"
                placeholder="datacenter-1"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tunnel-description" className="text-xs">
                描述
              </Label>
              <Input
                id="tunnel-description"
                className="text-xs"
                placeholder={"可选"}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tunnel-targets" className="text-xs">
                目标
              </Label>
              <Textarea
                id="tunnel-targets"
                className="min-h-[120px] font-mono text-xs"
                placeholder={"splunk.internal:8089\n10.0.0.5:443,5986"}
                value={targets}
                onChange={(event) => setTargets(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                每行以 host:port
                格式填写一个主机，多个端口用逗号分隔。动作只能访问这些主机和端口。
              </p>
            </div>
            {formError ? (
              <p className="text-xs text-destructive">{formError}</p>
            ) : null}
          </form>
        </DialogBody>
        <DialogFooter>
          <Button
            size="sm"
            type="submit"
            form={CREATE_TUNNEL_FORM_ID}
            disabled={pending}
          >
            创建隧道
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
