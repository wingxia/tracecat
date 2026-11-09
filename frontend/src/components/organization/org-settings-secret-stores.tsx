"use client"

import {
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"
import type { SecretStoreProvider, SecretStoreRead } from "@/client"
import { ScopeGuard, useScopeCheck } from "@/components/auth/scope-guard"
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { useOrgSecretStores } from "@/hooks/use-secret-stores"
import { useWorkspaceManager } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import {
  type CreateConfigState,
  SECRET_STORE_PROVIDERS,
} from "./secret-store-providers"

const ROW_GRID =
  "grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,1.2fr)_132px] items-center gap-3 px-4"
const USAGE_INLINE_LIMIT = 3

function pluralize(count: number, noun: string): string {
  const labels: Record<string, string> = {
    store: "个存储",
    secret: "个密钥",
    workspace: "个工作空间",
  }
  return `${count} ${labels[noun] ?? noun}`
}

/** Organization settings for external secret stores, grouped by provider. */
export function OrgSettingsSecretStores() {
  const { stores, isLoading, error } = useOrgSecretStores()
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [createProvider, setCreateProvider] =
    React.useState<SecretStoreProvider | null>(null)

  if (isLoading) {
    return <CenteredSpinner />
  }
  if (error) {
    return (
      <AlertNotification
        level="error"
        message={`加载密钥存储出错：${error.message}`}
      />
    )
  }

  const providerKeys = Object.keys(
    SECRET_STORE_PROVIDERS
  ) as SecretStoreProvider[]
  const groups = providerKeys
    .map((key) => ({
      key,
      stores: (stores ?? []).filter((store) => store.provider === key),
    }))
    .filter((group) => group.stores.length > 0)

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Tracecat 按需从密钥管理器读取密钥值，不会在 Tracecat 中存储这些值。
        </p>
        <ScopeGuard scope="org:secret:create">
          <AddStoreMenu
            providerKeys={providerKeys}
            onChoose={setCreateProvider}
          />
        </ScopeGuard>
      </div>
      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center text-sm">
          <p className="font-medium">暂无密钥存储</p>
          <p className="max-w-md text-muted-foreground">
            连接密钥管理器，让工作空间引用其中的密钥。点击“添加存储”选择提供商。
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <ProviderSection
            key={group.key}
            providerKey={group.key}
            stores={group.stores}
            expandedId={expandedId}
            onExpandedChange={setExpandedId}
          />
        ))
      )}
      {createProvider && (
        <CreateSecretStoreDialog
          providerKey={createProvider}
          onClose={() => setCreateProvider(null)}
        />
      )}
    </div>
  )
}

function AddStoreMenu({
  providerKeys,
  onChoose,
}: {
  providerKeys: SecretStoreProvider[]
  onChoose: (provider: SecretStoreProvider) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="shrink-0 shadow-none">
          <PlusIcon className="mr-2 size-4" />
          添加存储
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 shadow-none">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          选择提供商
        </DropdownMenuLabel>
        {providerKeys.map((key) => {
          const provider = SECRET_STORE_PROVIDERS[key]
          return (
            <DropdownMenuItem
              key={key}
              onSelect={() => onChoose(key)}
              className="gap-2.5"
            >
              <provider.Icon className="size-6 shrink-0 rounded" />
              <span className="flex flex-col">
                <span className="font-medium">{provider.label}</span>
                <span className="text-xs text-muted-foreground">
                  {provider.method}
                </span>
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Create a store, then continue straight into its setup. */
function CreateSecretStoreDialog({
  providerKey,
  onClose,
}: {
  providerKey: SecretStoreProvider
  onClose: () => void
}) {
  const { createStore, createStorePending } = useOrgSecretStores()
  const [name, setName] = React.useState("")
  const [config, setConfig] = React.useState<CreateConfigState>({})
  const [allWorkspaces, setAllWorkspaces] = React.useState(false)
  const [showErrors, setShowErrors] = React.useState(false)
  const [createdStore, setCreatedStore] =
    React.useState<SecretStoreRead | null>(null)
  const provider = SECRET_STORE_PROVIDERS[providerKey]
  const configErrors = provider.validateCreate(config)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (Object.keys(configErrors).length > 0) {
      setShowErrors(true)
      return
    }
    try {
      // Saved disabled: the store is enabled once setup supplies the role.
      setCreatedStore(
        await createStore({
          name: name.trim(),
          config: provider.toCreateConfig(config),
          enabled: false,
          all_workspaces: allWorkspaces,
        })
      )
    } catch {
      // The mutation hook shows the error; keep the draft available to retry.
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {createdStore ? (
        <StoreSetupDialogContent
          store={createdStore}
          cancelLabel="稍后完成"
          onClose={onClose}
        />
      ) : (
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{provider.createTitle}</DialogTitle>
            <DialogDescription>{provider.createDescription}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <div className="space-y-2">
                <Label htmlFor="store-name">名称</Label>
                <Input
                  id="store-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="production-secrets"
                  required
                />
              </div>
              <provider.CreateFields
                config={config}
                onChange={setConfig}
                errors={showErrors ? configErrors : {}}
              />
              <div className="flex items-center justify-between gap-4 border-t pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="store-all-workspaces">所有工作空间</Label>
                  <p className="text-xs text-muted-foreground">
                    允许所有现有和未来的工作空间。
                  </p>
                </div>
                <Switch
                  id="store-all-workspaces"
                  checked={allWorkspaces}
                  onCheckedChange={setAllWorkspaces}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                size="sm"
                type="submit"
                disabled={createStorePending}
                className="shadow-none"
              >
                {createStorePending ? "保存中…" : "继续"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  )
}

function ProviderSection({
  providerKey,
  stores,
  expandedId,
  onExpandedChange,
}: {
  providerKey: SecretStoreProvider
  stores: SecretStoreRead[]
  expandedId: string | null
  onExpandedChange: (storeId: string | null) => void
}) {
  const provider = SECRET_STORE_PROVIDERS[providerKey]
  return (
    <section
      aria-label={`${provider.label} 个存储`}
      className="flex flex-col rounded-lg border"
    >
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <provider.Icon className="size-7 shrink-0 rounded-md" />
        <h3 className="text-sm font-semibold">{provider.label}</h3>
        <span className="text-xs text-muted-foreground">
          {pluralize(stores.length, "store")}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-w-[760px] flex-col">
          <div
            className={cn(
              ROW_GRID,
              "bg-muted/40 py-2 text-xs text-muted-foreground"
            )}
          >
            <span>名称</span>
            <span>{provider.locationLabel}</span>
            <span>工作空间</span>
            <span>密钥</span>
            <span>状态</span>
            <span />
          </div>
          {stores.map((store) => (
            <StoreRow
              key={store.id}
              store={store}
              expanded={expandedId === store.id}
              onExpandedChange={(open) =>
                onExpandedChange(open ? store.id : null)
              }
            />
          ))}
        </div>
      </div>
    </section>
  )
}

type StoreConfirm = "disable" | "delete" | null

function StoreRow({
  store,
  expanded,
  onExpandedChange,
}: {
  store: SecretStoreRead
  expanded: boolean
  onExpandedChange: (open: boolean) => void
}) {
  const { updateStore, deleteStore } = useOrgSecretStores()
  const canUpdate = useScopeCheck("org:secret:update")
  const canDelete = useScopeCheck("org:secret:delete")
  const [editing, setEditing] = React.useState(false)
  const [settingUp, setSettingUp] = React.useState(false)
  const [confirm, setConfirm] = React.useState<StoreConfirm>(null)
  const [pending, setPending] = React.useState(false)
  const provider = SECRET_STORE_PROVIDERS[store.provider]
  const setupComplete = provider.isSetupComplete(store)
  const isOpen = expanded && setupComplete
  const referenceCount = store.reference_count ?? 0
  async function changeStore(action: () => Promise<unknown>) {
    setPending(true)
    try {
      await action()
    } catch {
      // Mutation hooks show errors; keep the server's current state.
    } finally {
      setPending(false)
    }
  }

  let status = "已禁用"
  if (!setupComplete) status = "设置未完成"
  else if (store.enabled) status = "已启用"

  const toggleLabel = store.enabled ? "禁用存储" : "启用存储"

  let confirmBody = "在此存储重新启用之前，引用它的密钥将无法解析。"
  if (confirm === "delete") {
    confirmBody =
      "Tracecat 将移除此存储及其外部 ID，AWS 中的密钥保持不变。也请从角色信任策略中移除此外部 ID。"
  } else if (referenceCount > 0) {
    confirmBody = `在此存储重新启用之前，所有工作流和智能体中的 ${pluralize(referenceCount, "secret")} 将无法解析。`
  }

  function handleToggle() {
    if (store.enabled) {
      setConfirm("disable")
    } else {
      changeStore(() =>
        updateStore({ storeId: store.id, params: { enabled: true } })
      )
    }
  }

  return (
    <div className={cn("border-t", isOpen && "bg-muted/30")}>
      <div className={cn(ROW_GRID, "min-h-[52px] py-2 text-sm")}>
        <button
          type="button"
          // A store in setup has nothing to inspect yet; open its setup flow.
          aria-expanded={setupComplete ? isOpen : undefined}
          aria-haspopup={setupComplete ? undefined : "dialog"}
          onClick={() =>
            setupComplete ? onExpandedChange(!isOpen) : setSettingUp(true)
          }
          className="flex min-w-0 items-center gap-2 text-left font-medium"
        >
          <ChevronRightIcon
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
              isOpen && "rotate-90"
            )}
          />
          <span className="break-all">{store.name}</span>
        </button>
        <span className="text-muted-foreground">{provider.summary(store)}</span>
        <WorkspaceAccessMenu store={store} />
        <span className="tabular-nums text-muted-foreground">
          {referenceCount}
        </span>
        <span>
          <Badge
            variant="outline"
            className={cn(
              "whitespace-nowrap font-normal",
              status === "已禁用" && "text-muted-foreground"
            )}
          >
            {status}
          </Badge>
        </span>
        <div className="flex items-center justify-end gap-1.5">
          {(canUpdate || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground"
                  aria-label={`${store.name} 的操作`}
                  disabled={pending}
                >
                  <EllipsisIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56 shadow-none">
                {canUpdate && !setupComplete && (
                  <DropdownMenuItem
                    className="text-xs"
                    onSelect={() => setSettingUp(true)}
                  >
                    完成设置
                  </DropdownMenuItem>
                )}
                {canUpdate && (
                  // A store in setup may need its region fixed before the role saves.
                  <DropdownMenuItem
                    className="text-xs"
                    onSelect={() => setEditing(true)}
                  >
                    编辑存储
                  </DropdownMenuItem>
                )}
                {canUpdate && setupComplete && (
                  <DropdownMenuItem className="text-xs" onSelect={handleToggle}>
                    {toggleLabel}
                  </DropdownMenuItem>
                )}
                {canUpdate && canDelete && <DropdownMenuSeparator />}
                {canDelete && (
                  <>
                    <DropdownMenuItem
                      disabled={referenceCount > 0}
                      onSelect={() => setConfirm("delete")}
                      className="text-xs text-destructive focus:text-destructive"
                    >
                      删除
                    </DropdownMenuItem>
                    {referenceCount > 0 && (
                      <p className="whitespace-nowrap px-2 pb-1.5 text-xs text-muted-foreground">
                        正在使用此存储的资源：{" "}
                        {pluralize(referenceCount, "secret")}
                        。请先移除这些资源。
                      </p>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="mx-4 mb-4 flex flex-col gap-4 rounded-lg border bg-background p-4">
          {!store.enabled && (
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              此存储已禁用，所有引用它的密钥都无法解析，直到重新启用。
            </p>
          )}
          <provider.Details
            store={store}
            usage={<StoreUsage store={store} />}
          />
        </div>
      )}

      <Dialog open={settingUp} onOpenChange={setSettingUp}>
        {settingUp && (
          <StoreSetupDialogContent
            store={store}
            cancelLabel={"取消"}
            onClose={() => setSettingUp(false)}
          />
        )}
      </Dialog>
      {editing && (
        <EditSecretStoreDialog
          store={store}
          onClose={() => setEditing(false)}
        />
      )}
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete" ? "删除" : "禁用"} {store.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                changeStore(() =>
                  confirm === "delete"
                    ? deleteStore(store.id)
                    : updateStore({
                        storeId: store.id,
                        params: { enabled: false },
                      })
                )
              }
            >
              {confirm === "delete" ? "删除" : "禁用"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Second setup phase: show the generated policies, collect the role, enable. */
function StoreSetupDialogContent({
  store,
  cancelLabel,
  onClose,
}: {
  store: SecretStoreRead
  cancelLabel: string
  onClose: () => void
}) {
  const { updateStore } = useOrgSecretStores()
  // Finishing setup is a store update; creators may lack that scope.
  const canUpdate = useScopeCheck("org:secret:update")
  const [config, setConfig] = React.useState<CreateConfigState>({})
  const [pending, setPending] = React.useState(false)
  const [showErrors, setShowErrors] = React.useState(false)
  const provider = SECRET_STORE_PROVIDERS[store.provider]
  const configErrors = provider.validateSetup(config)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (Object.keys(configErrors).length > 0) {
      setShowErrors(true)
      return
    }
    setPending(true)
    try {
      await updateStore({
        storeId: store.id,
        params: { config: provider.toSetupConfig(config), enabled: true },
      })
      onClose()
    } catch {
      // The mutation hook shows the error; keep the draft available to retry.
    } finally {
      setPending(false)
    }
  }

  return (
    <DialogContent size="lg" className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{provider.setupTitle}</DialogTitle>
        <DialogDescription>{provider.setupDescription}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <DialogBody>
          <provider.SetupFields
            store={store}
            config={config}
            onChange={setConfig}
            errors={showErrors ? configErrors : {}}
            canEdit={canUpdate}
          />
        </DialogBody>
        <DialogFooter>
          <Button
            size="sm"
            type="button"
            variant="outline"
            className="shadow-none"
            onClick={onClose}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          {canUpdate && (
            <Button
              size="sm"
              type="submit"
              className="shadow-none"
              disabled={pending}
            >
              {pending ? "保存中…" : "保存并启用"}
            </Button>
          )}
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

/** Secret counts per workspace: top few inline, the rest in a searchable list. */
function StoreUsage({ store }: { store: SecretStoreRead }) {
  const { workspaces } = useWorkspaceManager()
  // Org-wide secret:read covers every workspace; otherwise let the workspace
  // landing page pick a section the user can read.
  const canReadCredentials = useScopeCheck("secret:read") === true
  const workspaceHref = (id: string) =>
    canReadCredentials ? `/workspaces/${id}/credentials` : `/workspaces/${id}`
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const usage = store.workspace_usage ?? []

  if (usage.length === 0) {
    return <span className="text-xs text-muted-foreground">暂无密钥</span>
  }

  const names = new Map(workspaces?.map((ws) => [ws.id, ws.name]))
  // GET /workspaces lists only workspaces the user can open; link just those.
  const rows = usage.map((entry) => ({
    id: entry.workspace_id,
    name: names.get(entry.workspace_id) ?? "未知工作空间",
    count: entry.secret_count,
    canOpen: names.has(entry.workspace_id),
  }))
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const needle = query.trim().toLowerCase()
  const matching = rows.filter((row) => row.name.toLowerCase().includes(needle))

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <span>
        {pluralize(total, "secret")} 位于 {pluralize(rows.length, "workspace")}
      </span>
      {rows.slice(0, USAGE_INLINE_LIMIT).map((row) => (
        <span key={row.id} className="flex justify-between gap-3">
          <span className="truncate text-muted-foreground">{row.name}</span>
          {row.canOpen ? (
            <Link
              href={workspaceHref(row.id)}
              className="shrink-0 text-primary hover:underline"
            >
              {pluralize(row.count, "secret")}
            </Link>
          ) : (
            <span className="shrink-0">{pluralize(row.count, "secret")}</span>
          )}
        </span>
      ))}
      {rows.length > USAGE_INLINE_LIMIT && (
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setQuery("")
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="self-start text-primary hover:underline"
            >
              查看全部 {rows.length} 个工作空间
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 shadow-none">
            <div className="flex items-center gap-2 border-b px-3">
              <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={"搜索工作空间"}
                aria-label={"搜索使用此存储的工作空间"}
                className="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
            </div>
            <div className="flex max-h-64 flex-col overflow-y-auto p-1">
              {matching.map((row) => {
                const content = (
                  <>
                    <span className="truncate">{row.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {pluralize(row.count, "secret")}
                    </span>
                  </>
                )
                const className =
                  "flex justify-between gap-3 rounded-sm px-2 py-1.5 text-xs"
                return row.canOpen ? (
                  <Link
                    key={row.id}
                    href={workspaceHref(row.id)}
                    className={cn(className, "hover:bg-muted")}
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={row.id} className={className}>
                    {content}
                  </div>
                )
              })}
              {matching.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  没有匹配的工作空间。
                </p>
              )}
            </div>
            <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              按密钥数量排序
            </p>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

function WorkspaceAccessMenu({ store }: { store: SecretStoreRead }) {
  const { updateStore, authorizeWorkspace, revokeWorkspace } =
    useOrgSecretStores()
  const { workspaces, workspacesLoading, workspacesError } =
    useWorkspaceManager()
  const canUpdate = useScopeCheck("org:secret:update")
  // Mirrors the scopes GET /workspaces accepts.
  const canListWorkspaces = useScopeCheck(undefined, [
    "org:read",
    "org:workspace:read",
    "workspace:read",
  ])
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const authorizedIds = new Set(store.authorized_workspace_ids ?? [])

  async function changeAccess(action: () => Promise<unknown>) {
    setPending(true)
    try {
      await action()
    } catch {
      // Mutation hooks show errors; retain the server's current access state.
    } finally {
      setPending(false)
    }
  }

  const needle = query.trim().toLowerCase()
  const matchingWorkspaces = workspaces?.filter((workspace) =>
    workspace.name.toLowerCase().includes(needle)
  )
  let summary = "选择工作空间"
  if (store.all_workspaces) {
    summary = "所有工作空间"
  } else if (authorizedIds.size === 1) {
    summary =
      workspaces?.find((workspace) => authorizedIds.has(workspace.id))?.name ??
      "1 workspace"
  } else if (authorizedIds.size > 1) {
    summary = `${authorizedIds.size} 个工作空间`
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 max-w-full justify-self-start gap-1.5 px-2 text-xs font-normal shadow-none"
          aria-label={`工作空间：${summary}`}
        >
          <span className="truncate">{summary}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 max-w-[calc(100vw-2rem)] shadow-none"
      >
        <DropdownMenuRadioGroup
          value={store.all_workspaces ? "all" : "selected"}
          onValueChange={(value) =>
            changeAccess(() =>
              updateStore({
                storeId: store.id,
                params: { all_workspaces: value === "all" },
              })
            )
          }
        >
          <DropdownMenuRadioItem
            value="all"
            disabled={!canUpdate || pending}
            onSelect={(event) => event.preventDefault()}
            className="py-2 text-xs"
          >
            所有工作空间
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="selected"
            disabled={!canUpdate || pending}
            onSelect={(event) => event.preventDefault()}
            className="py-2 text-xs"
          >
            所选工作空间
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {!store.all_workspaces && (
          <>
            <DropdownMenuSeparator />
            {workspacesLoading && (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                正在加载工作空间…
              </p>
            )}
            {workspacesError && (
              <p className="px-2 py-2 text-xs text-destructive">
                {canListWorkspaces === false
                  ? "需要查看工作空间的权限才能选择。"
                  : "无法加载工作空间，请刷新后重试。"}
              </p>
            )}
            {workspaces && workspaces.length > 0 && (
              <div className="p-1">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  // Keep menu typeahead from stealing keystrokes.
                  onKeyDown={(event) => event.stopPropagation()}
                  placeholder={"搜索工作空间"}
                  aria-label={"搜索工作空间"}
                  className="h-8 text-xs shadow-none"
                />
              </div>
            )}
            {matchingWorkspaces?.length === 0 &&
              workspaces &&
              workspaces.length > 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  没有匹配的工作空间。
                </p>
              )}
            <div className="max-h-64 overflow-y-auto">
              {matchingWorkspaces?.map((workspace) => (
                <DropdownMenuCheckboxItem
                  key={workspace.id}
                  checked={authorizedIds.has(workspace.id)}
                  disabled={!canUpdate || pending}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) =>
                    changeAccess(() => {
                      const mutate = checked
                        ? authorizeWorkspace
                        : revokeWorkspace
                      return mutate({
                        storeId: store.id,
                        workspaceId: workspace.id,
                      })
                    })
                  }
                  className="break-words py-2 text-xs"
                >
                  {workspace.name}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center py-2 text-xs">
          完成
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EditSecretStoreDialog({
  store,
  onClose,
}: {
  store: SecretStoreRead
  onClose: () => void
}) {
  const { updateStore } = useOrgSecretStores()
  const [name, setName] = React.useState(store.name)
  const [config, setConfig] = React.useState<CreateConfigState>({
    role_arn: store.config.role_arn ?? "",
    region: store.config.region,
  })
  const [pending, setPending] = React.useState(false)
  const [showErrors, setShowErrors] = React.useState(false)
  const provider = SECRET_STORE_PROVIDERS[store.provider]
  const configErrors = provider.validateEdit(config, store)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (Object.keys(configErrors).length > 0) {
      setShowErrors(true)
      return
    }
    setPending(true)
    try {
      await updateStore({
        storeId: store.id,
        params: { name: name.trim(), config: provider.toUpdateConfig(config) },
      })
      onClose()
    } catch {
      // The mutation hook shows the error; keep the draft available to retry.
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>编辑 {store.name}</DialogTitle>
          <DialogDescription>
            更新存储连接。外部 ID 保持不变，现有信任策略仍可使用。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody>
            <div className="space-y-2">
              <Label htmlFor="edit-store-name">名称</Label>
              <Input
                id="edit-store-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <provider.EditFields
              config={config}
              onChange={setConfig}
              errors={showErrors ? configErrors : {}}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              size="sm"
              type="submit"
              className="shadow-none"
              disabled={pending}
            >
              {pending ? "保存中…" : "保存更改"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
