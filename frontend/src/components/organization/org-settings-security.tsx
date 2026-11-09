"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  CheckCircle2Icon,
  PencilIcon,
  PlusIcon,
  ShieldAlertIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type {
  IPAllowlist,
  IPAllowlistCheckRequest,
  IPAllowlistCheckResult,
  SecuritySettingsRead,
  SecuritySettingsUpdate,
} from "@/client"
import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useOrgSecuritySettings } from "@/hooks/use-org-security-settings"
import type { TracecatApiError } from "@/lib/errors"

const IPV4_CIDR_PATTERN =
  /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}(\/(3[0-2]|[12]?\d))?$/
const IPV6_CIDR_PATTERN = /^[0-9a-fA-F:]+(\/(12[0-8]|1[01]\d|[1-9]?\d))?$/
const MAX_ALLOWLISTS = 100
const MAX_CIDRS_PER_ALLOWLIST = 50

function isValidCidr(value: string): boolean {
  if (IPV4_CIDR_PATTERN.test(value)) {
    return true
  }
  return value.includes(":") && IPV6_CIDR_PATTERN.test(value)
}

function parseCidrLines(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
}

const allowlistFormSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(100),
  description: z.string().trim().max(500).optional(),
  cidrs: z
    .string()
    .refine((text) => parseCidrLines(text).length > 0, {
      message: "至少添加一个 IP 地址或 CIDR 网段",
    })
    .refine((text) => parseCidrLines(text).length <= MAX_CIDRS_PER_ALLOWLIST, {
      message: `每个白名单最多包含 ${MAX_CIDRS_PER_ALLOWLIST} 个网段`,
    })
    .refine((text) => parseCidrLines(text).every(isValidCidr), {
      message: "每行必须是有效的 IPv4/IPv6 地址或 CIDR 网段",
    }),
})

type AllowlistFormValues = z.infer<typeof allowlistFormSchema>

export interface IPAllowlistSettingsFormProps {
  securitySettings?: SecuritySettingsRead
  securitySettingsIsLoading: boolean
  securitySettingsError: TracecatApiError | null
  updateSecuritySettings: (params: SecuritySettingsUpdate) => Promise<unknown>
  updateSecuritySettingsIsPending: boolean
  checkIpAllowlist: (
    params: IPAllowlistCheckRequest
  ) => Promise<IPAllowlistCheckResult>
  checkIpAllowlistIsPending: boolean
  /** Explains what the enforcement toggle restricts. */
  enforcementDescription: string
}

/**
 * Organization IP allowlist settings: enforcement toggle, named allowlists
 * managed through a create/edit dialog, and a saved-policy IP checker.
 */
export function OrgSettingsSecurityForm() {
  return (
    <IPAllowlistSettingsForm
      {...useOrgSecuritySettings()}
      enforcementDescription="仅允许从下方允许列表中的 IP 范围登录和通过 API 访问此组织。启用限制前，列表必须涵盖你当前的 IP。平台超级管理员不受限制。"
    />
  )
}

/**
 * IP allowlist editor shared by organization and platform admin settings.
 */
export function IPAllowlistSettingsForm({
  securitySettings,
  securitySettingsIsLoading,
  securitySettingsError,
  updateSecuritySettings,
  updateSecuritySettingsIsPending,
  checkIpAllowlist,
  checkIpAllowlistIsPending,
  enforcementDescription,
}: IPAllowlistSettingsFormProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const [checkIp, setCheckIp] = useState("")
  const [checkResult, setCheckResult] = useState<IPAllowlistCheckResult | null>(
    null
  )

  if (securitySettingsIsLoading) {
    return <CenteredSpinner />
  }
  if (securitySettingsError || !securitySettings) {
    return (
      <AlertNotification
        level="error"
        message={`加载安全设置出错：${securitySettingsError?.message ?? "未知错误"}`}
      />
    )
  }

  const enabled = securitySettings.ip_allowlist_enabled
  const allowlists = securitySettings.ip_allowlists

  /** Persist the full policy; returns false when the API rejected it (toast already shown). */
  async function saveAllowlists(
    next: IPAllowlist[],
    nextEnabled = enabled
  ): Promise<boolean> {
    try {
      await updateSecuritySettings({
        ip_allowlist_enabled: nextEnabled,
        ip_allowlists: next,
      })
    } catch {
      return false
    }
    setCheckResult(null)
    return true
  }

  async function onToggleEnabled(checked: boolean) {
    await saveAllowlists(allowlists, checked)
  }

  async function onSaveAllowlist(values: AllowlistFormValues) {
    const entry: IPAllowlist = {
      name: values.name,
      description: values.description || null,
      cidrs: parseCidrLines(values.cidrs),
    }
    const next =
      editingIndex === null
        ? [...allowlists, entry]
        : allowlists.map((item, i) => (i === editingIndex ? entry : item))
    if (await saveAllowlists(next)) {
      setDialogOpen(false)
      setEditingIndex(null)
    }
  }

  async function onConfirmDelete() {
    if (deletingIndex === null) {
      return
    }
    await saveAllowlists(allowlists.filter((_, i) => i !== deletingIndex))
    setDeletingIndex(null)
  }

  function openCreate() {
    setEditingIndex(null)
    setDialogOpen(true)
  }

  function openEdit(index: number) {
    setEditingIndex(index)
    setDialogOpen(true)
  }

  async function onCheckIp() {
    if (!checkIp.trim()) {
      return
    }
    try {
      setCheckResult(await checkIpAllowlist({ ip_address: checkIp.trim() }))
    } catch {
      setCheckResult(null)
    }
  }

  const editing = editingIndex === null ? null : allowlists[editingIndex]
  const deleting = deletingIndex === null ? null : allowlists[deletingIndex]

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="ip-allowlist-enabled">强制执行 IP 白名单</Label>
          <p className="text-sm text-muted-foreground">
            {enforcementDescription}
          </p>
        </div>
        <Switch
          id="ip-allowlist-enabled"
          checked={enabled}
          disabled={updateSecuritySettingsIsPending}
          onCheckedChange={onToggleEnabled}
        />
      </div>

      {enabled && allowlists.length === 0 && (
        <Alert>
          <ShieldAlertIcon className="size-4" />
          <AlertTitle>尚未配置 IP 白名单</AlertTitle>
          <AlertDescription>
            至少创建一个白名单后，访问限制才会生效。
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight">IP 白名单</h3>
            <p className="text-sm text-muted-foreground">
              按用途对 IP 地址或 CIDR 网段分组，例如 VPN
              出口或办公网络。最多支持 {MAX_ALLOWLISTS} 个白名单，每个包含{" "}
              {MAX_CIDRS_PER_ALLOWLIST} 个网段。
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={openCreate}
            disabled={allowlists.length >= MAX_ALLOWLISTS}
          >
            <PlusIcon className="mr-2 size-4" />
            创建 IP 白名单
          </Button>
        </div>

        {allowlists.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium">暂无 IP 白名单</p>
            <p className="text-sm text-muted-foreground">
              请先创建白名单，再启用 IP 访问限制。
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>IP 网段</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {allowlists.map((item, index) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="max-w-xs text-muted-foreground">
                      {item.description || (
                        <span className="italic">暂无描述</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 font-mono text-xs">
                        {item.cidrs.map((cidr) => (
                          <span key={cidr}>{cidr}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`编辑 ${item.name}`}
                          onClick={() => openEdit(index)}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`删除 ${item.name}`}
                          onClick={() => setDeletingIndex(index)}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">验证 IP 地址</h3>
          <p className="text-sm text-muted-foreground">
            检查已保存的白名单是否允许某个 IP 地址。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={checkIp}
            onChange={(e) => {
              setCheckIp(e.target.value)
              setCheckResult(null)
            }}
            placeholder={"8.8.8.8 或 2001:db8::1"}
            className="max-w-sm font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            type="button"
            variant="outline"
            onClick={onCheckIp}
            disabled={checkIpAllowlistIsPending || !checkIp.trim()}
          >
            检查
          </Button>
        </div>
        {checkResult && <IpCheckResult result={checkResult} />}
      </div>

      {dialogOpen && (
        <AllowlistDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingIndex(null)
            }
          }}
          initial={editing}
          existingNames={allowlists
            .filter((_, i) => i !== editingIndex)
            .map((item) => item.name.toLowerCase())}
          isPending={updateSecuritySettingsIsPending}
          onSubmit={onSaveAllowlist}
        />
      )}

      <AlertDialog
        open={deletingIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingIndex(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 IP 白名单</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} 及其 {deleting?.cidrs.length ?? 0} IP{" "}
              {deleting?.cidrs.length === 1 ? "个网段" : "个网段"} 将被移除。
              {enabled && allowlists.length === 1
                ? " 这是最后一个白名单，删除后将不再限制访问。"
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={updateSecuritySettingsIsPending}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface AllowlistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: IPAllowlist | null
  existingNames: string[]
  isPending: boolean
  onSubmit: (values: AllowlistFormValues) => Promise<void>
}

function AllowlistDialog({
  open,
  onOpenChange,
  initial,
  existingNames,
  isPending,
  onSubmit,
}: AllowlistDialogProps) {
  const form = useForm<AllowlistFormValues>({
    resolver: zodResolver(
      allowlistFormSchema.refine(
        (values) => !existingNames.includes(values.name.toLowerCase()),
        {
          message: "已存在同名白名单",
          path: ["name"],
        }
      )
    ),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      cidrs: initial?.cidrs.join("\n") ?? "",
    },
  })

  const rangeCount = parseCidrLines(form.watch("cidrs")).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? "编辑 IP 白名单" : "创建 IP 白名单"}
          </DialogTitle>
          <DialogDescription>
            为白名单命名，并添加其覆盖的 IP 地址或 CIDR
            网段。描述可记录每个网段的用途。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
            noValidate
          >
            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={"企业 VPN"}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述（可选）</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={"由 IT 管理的办公 VPN 出口网段"}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cidrs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>允许的 IP 网段</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={5}
                        placeholder={"203.0.113.0/24\n2001:db8::/32"}
                        className="font-mono"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </FormControl>
                    <FormDescription>
                      每行填写一个 IPv4、IPv6 地址或 CIDR 网段。
                      {rangeCount > 0 &&
                        ` ${rangeCount} ${rangeCount === 1 ? "range" : "ranges"}.`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button size="sm" type="submit" disabled={isPending}>
                {initial ? "保存" : "创建 IP 白名单"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function IpCheckResult({ result }: { result: IPAllowlistCheckResult }) {
  if (!result.enforced) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2Icon className="size-4" />
        允许访问，当前未强制执行白名单。
      </p>
    )
  }
  if (result.allowed) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-700">
        <CheckCircle2Icon className="size-4" />
        被以下白名单允许： {result.matched_cidr}
        {result.matched_allowlist ? ` (${result.matched_allowlist})` : ""}
      </p>
    )
  }
  return (
    <p className="flex items-center gap-2 text-sm text-destructive">
      <XCircleIcon className="size-4" />
      当前白名单不允许访问
    </p>
  )
}
