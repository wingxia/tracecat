"use client"

import "react18-json-view/src/style.css"

import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon, DotsHorizontalIcon } from "@radix-ui/react-icons"
import * as ipaddr from "ipaddr.js"
import {
  BanIcon,
  CalendarClockIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  KeyRoundIcon,
  MoreHorizontalIcon,
  PlusCircleIcon,
  RotateCcwIcon,
  SquarePlay,
  Trash2Icon,
  WebhookIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  $WebhookMethod,
  $WebhookStatus,
  ApiError,
  type CaseEventType,
  type SchedulesCreateScheduleData,
  type WebhookMethod,
  type WebhookRead,
  type WorkflowRead,
} from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { TriggerTypename } from "@/components/builder/canvas/trigger-node"
import { CASE_EVENT_SUGGESTIONS } from "@/components/builder/panel/case-event-suggestions"
import {
  type TriggerPanelTab,
  TriggerPanelTabs,
} from "@/components/builder/panel/trigger-panel-tabs"
import { CopyButton } from "@/components/copy-button"
import { FormTriggerControls } from "@/components/forms/form-trigger-controls"
import { getIcon } from "@/components/icons"
import { CenteredSpinner } from "@/components/loading/spinner"
import { ReadOnlyFieldset } from "@/components/managed/read-only-fieldset"
import { AlertNotification } from "@/components/notifications"
import {
  CustomTagInput,
  MultiTagCommandInput,
  type Tag,
} from "@/components/tags-input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { useEntitlements } from "@/hooks/use-entitlements"
import { useFormsAccess } from "@/hooks/use-forms-access"
import {
  useCaseTagCatalog,
  useCaseTrigger,
  useDeleteWebhookApiKey,
  useGenerateWebhookApiKey,
  useRevokeWebhookApiKey,
  useSchedules,
  useUpdateWebhook,
  useUpsertCaseTrigger,
} from "@/lib/hooks"
import {
  durationSchema,
  durationToHumanReadable,
  durationToISOString,
} from "@/lib/time"
import { cn } from "@/lib/utils"
import { useWorkflowBuilder } from "@/providers/builder"
import { useWorkflow } from "@/providers/workflow"
import { useWorkspaceId } from "@/providers/workspace-id"

const HTTP_METHODS: readonly WebhookMethod[] = $WebhookMethod.enum

const toCanonicalString = (address: ipaddr.IPv4 | ipaddr.IPv6): string => {
  const maybeNormalized =
    (address as ipaddr.IPv6).toNormalizedString?.() ?? address.toString()
  return maybeNormalized
}

const validateAndNormalizeCidr = (
  value: string
): { normalized: string } | { error: string } => {
  try {
    const [address, prefixLength] = ipaddr.parseCIDR(value)
    if (address.kind() !== "ipv4") {
      throw new Error("仅支持 IPv4 CIDR 范围")
    }
    const normalized = `${toCanonicalString(address)}/${prefixLength}`
    return { normalized }
  } catch {
    try {
      const address = ipaddr.parse(value)
      if (address.kind() !== "ipv4") {
        throw new Error("仅支持 IPv4 地址")
      }
      const prefixLength = 32
      const normalized = `${toCanonicalString(address)}/${prefixLength}`
      return { normalized }
    } catch {
      return {
        error: `IPv4 地址或 CIDR 无效：“${value}”`,
      }
    }
  }
}

const webhookFormSchema = z.object({
  status: z.enum($WebhookStatus.enum),
  methods: z.array(z.enum($WebhookMethod.enum)).min(1, "至少选择一种方法"),
  allowlisted_cidrs: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().trim().min(1, "IP 地址或 CIDR 无效"),
      })
    )
    .superRefine((cidrs, ctx) => {
      for (const cidr of cidrs) {
        const result = validateAndNormalizeCidr(cidr.text)
        if ("error" in result) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: result.error,
          })
          return
        }
      }
    })
    .transform((cidrs) => {
      const normalized = new Map<string, Tag>()
      for (const cidr of cidrs) {
        const result = validateAndNormalizeCidr(cidr.text)
        if ("error" in result) {
          continue
        }
        const value = result.normalized
        if (!normalized.has(value)) {
          normalized.set(value, { id: value, text: value })
        }
      }
      return Array.from(normalized.values())
    })
    .default([]),
  include_headers: z.boolean().default(false),
})

type WebhookForm = z.infer<typeof webhookFormSchema>

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiError) {
    const body = error.body as Record<string, unknown> | undefined
    if (body) {
      const detail = body.detail
      if (typeof detail === "string") {
        return detail
      }
      const message = body.message
      if (typeof message === "string") {
        return message
      }
      const title = body.title
      if (typeof title === "string") {
        return title
      }
      const errors = body.errors
      if (Array.isArray(errors) && errors.length > 0) {
        const first = errors[0] as Record<string, unknown>
        const msg = first?.msg ?? first?.message ?? first?.detail
        if (typeof msg === "string") {
          return msg
        }
      }
    }
  }
  return fallback
}

const formatScheduleDate = (value?: string | null) => {
  if (!value) {
    return "无"
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return "日期无效"
  }
  return parsed.toLocaleString("zh-CN")
}

export function TriggerPanel({ workflow }: { workflow: WorkflowRead }) {
  const { triggerPanelTab, setTriggerPanelTab } = useWorkflowBuilder()
  // Managed workflows keep the webhook switch, schedules and form switch.
  const { isReadOnly } = useWorkflow()
  const { hasEntitlement } = useEntitlements()
  const caseAddonsEnabled = hasEntitlement("case_addons")
  // The Form tab needs Forms on (flag and entitlement) and `form:read`.
  const formsAccess = useFormsAccess()
  const canReadForms = useScopeCheck("form:read")
  const formTabVisible = formsAccess === "enabled" && canReadForms === true

  return (
    <div className="overflow-auto size-full">
      <div className="grid grid-cols-3">
        <div className="overflow-hidden col-span-2">
          <h3 className="p-4">
            <div className="flex items-center space-x-4 w-full">
              {getIcon(TriggerTypename, {
                className: "size-10 p-2",
                flairsize: "md",
              })}
              <div className="flex flex-1 justify-between space-x-12 w-full">
                <div className="flex flex-col">
                  <div className="flex justify-between items-center w-full text-xs font-medium leading-none">
                    <div className="flex w-full">触发器</div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    工作流触发器
                  </p>
                </div>
              </div>
            </div>
          </h3>
        </div>
      </div>
      <Tabs
        value={triggerPanelTab}
        onValueChange={(value) => {
          setTriggerPanelTab(value as TriggerPanelTab)
        }}
        className="mt-1 flex h-full w-full flex-col"
      >
        <div className="w-full">
          {/* Four tabs can be wider than the panel. Scroll the strip itself so
              focusing the last tab does not shift the whole panel sideways. */}
          <div className="no-scrollbar flex items-center justify-start overflow-x-auto">
            <TabsList className="h-8 justify-start rounded-none bg-transparent p-0">
              <TabsTrigger
                className="flex h-full min-w-24 items-center justify-center rounded-none py-0 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                value={TriggerPanelTabs.webhook}
              >
                <WebhookIcon className="mr-2 size-4" />
                <span>Webhook</span>
              </TabsTrigger>
              <TabsTrigger
                className="flex h-full min-w-24 items-center justify-center rounded-none py-0 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                value={TriggerPanelTabs.schedules}
              >
                <CalendarClockIcon className="mr-2 size-4" />
                <span>定时计划</span>
              </TabsTrigger>
              {caseAddonsEnabled && (
                <TabsTrigger
                  className="flex h-full min-w-24 items-center justify-center rounded-none py-0 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  value={TriggerPanelTabs.caseTriggers}
                >
                  <SquarePlay className="mr-2 size-4" />
                  <span>事件触发器</span>
                </TabsTrigger>
              )}
              {formTabVisible && (
                <TabsTrigger
                  className="flex h-full min-w-24 items-center justify-center rounded-none py-0 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  value={TriggerPanelTabs.form}
                >
                  <ClipboardListIcon className="mr-2 size-4" />
                  <span>表单</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          <Separator />
        </div>
        <div className="flex-1 overflow-auto">
          <TabsContent value={TriggerPanelTabs.webhook} className="pb-8">
            <div className="px-4 my-4 space-y-2">
              <WebhookControls
                webhook={workflow.webhook}
                workflowId={workflow.id}
                readOnly={isReadOnly}
              />
            </div>
          </TabsContent>
          <TabsContent value={TriggerPanelTabs.schedules} className="pb-8">
            <div className="px-4 my-4 space-y-2">
              <ScheduleControls workflowId={workflow.id} />
            </div>
          </TabsContent>
          {caseAddonsEnabled && (
            <TabsContent value={TriggerPanelTabs.caseTriggers} className="pb-8">
              <div className="px-4 my-4 space-y-2">
                <CaseTriggerControls
                  workflowId={workflow.id}
                  readOnly={isReadOnly}
                />
              </div>
            </TabsContent>
          )}
          {formTabVisible && (
            <TabsContent value={TriggerPanelTabs.form} className="pb-8">
              <div className="px-4 my-4 space-y-2">
                <FormTriggerControls workflow={workflow} />
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}

export function WebhookControls({
  webhook,
  workflowId,
  readOnly = false,
}: {
  webhook: WebhookRead
  workflowId: string
  /** Lock every webhook setting except the on/off switch. */
  readOnly?: boolean
}) {
  const hasActiveApiKey = webhook.api_key?.is_active ?? false
  const hasRevokedApiKey = Boolean(webhook.api_key && !hasActiveApiKey)
  const apiKeyPreview = webhook.api_key?.preview ?? null
  const apiKeyCreatedAt = webhook.api_key?.created_at ?? null
  const apiKeyLastUsedAt = webhook.api_key?.last_used_at ?? null
  const apiKeyRevokedAt = webhook.api_key?.revoked_at ?? null

  const workspaceId = useWorkspaceId()
  const { mutateAsync, isPending: isUpdatingWebhook } = useUpdateWebhook(
    workspaceId,
    workflowId
  )
  const { mutateAsync: generateWebhookApiKey, isPending: isGeneratingApiKey } =
    useGenerateWebhookApiKey(workspaceId, workflowId)
  const { mutateAsync: revokeWebhookApiKey, isPending: isRevokingApiKey } =
    useRevokeWebhookApiKey(workspaceId, workflowId)
  const { mutateAsync: deleteWebhookApiKey, isPending: isDeletingApiKey } =
    useDeleteWebhookApiKey(workspaceId, workflowId)
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [confirmRegenerateDialogOpen, setConfirmRegenerateDialogOpen] =
    useState(false)
  const [confirmRevokeDialogOpen, setConfirmRevokeDialogOpen] = useState(false)
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false)

  const form = useForm<WebhookForm>({
    resolver: zodResolver(webhookFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    values: {
      status: webhook.status,
      methods: webhook.methods ?? ["POST"],
      allowlisted_cidrs:
        webhook.allowlisted_cidrs?.map((cidr) => ({
          id: cidr,
          text: cidr,
        })) ?? [],
      include_headers: webhook.include_headers ?? false,
    },
  })

  const handleAllowlistedCidrsChange = useCallback(
    async (newTags: Tag[] | undefined) => {
      if (!Array.isArray(newTags)) {
        form.setValue("allowlisted_cidrs", [], {
          shouldDirty: true,
          shouldValidate: true,
          shouldTouch: true,
        })
        return
      }

      const normalized = new Map<string, Tag>()
      let firstError: string | null = null

      for (const tag of newTags) {
        const trimmed = tag.text.trim()
        if (!trimmed) {
          firstError ??= "IP 地址或 CIDR 无效"
          continue
        }
        const result = validateAndNormalizeCidr(trimmed)
        if ("error" in result) {
          firstError ??= result.error
          continue
        }
        const canonical = result.normalized
        if (!normalized.has(canonical)) {
          normalized.set(canonical, { id: canonical, text: canonical })
        }
      }

      if (firstError) {
        form.setError("allowlisted_cidrs", {
          type: "manual",
          message: firstError,
        })
        toast({
          title: "IP 白名单条目无效",
          description: firstError,
          variant: "destructive",
        })
        return
      }

      form.clearErrors("allowlisted_cidrs")
      const normalizedValues = Array.from(normalized.values())
      form.setValue("allowlisted_cidrs", normalizedValues, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      })

      // Auto-save the allowlist
      const payload = normalizedValues.map((tag) => tag.text)
      try {
        await mutateAsync({ allowlisted_cidrs: payload })
        form.reset({ ...form.getValues(), allowlisted_cidrs: normalizedValues })
        toast({
          title: "已更新白名单",
          description: "已成功保存 Webhook 白名单。",
        })
      } catch (error) {
        const description = extractApiErrorMessage(
          error,
          "更新 IP 允许列表失败。"
        )
        toast({
          title: "保存白名单失败",
          description,
          variant: "destructive",
        })
      }
    },
    [form, mutateAsync]
  )

  const formatTimestamp = (value: string | null) =>
    value ? new Date(value).toLocaleString("zh-CN") : "—"

  const handleStatusChange = async (checked: boolean) => {
    const newStatus = checked ? "online" : "offline"
    form.setValue("status", newStatus)

    try {
      await mutateAsync({ status: newStatus })
      toast({
        title: "已更新 Webhook 状态",
        description: `Webhook 现已${newStatus}`,
      })
    } catch (error) {
      console.error("Failed to update webhook status", error)
      form.setValue("status", webhook.status)
      toast({
        title: "更新状态失败",
        description: extractApiErrorMessage(
          error,
          "更新 Webhook 状态时发生错误。"
        ),
      })
    }
  }

  const handleIncludeHeadersChange = async (checked: boolean) => {
    form.setValue("include_headers", checked)

    try {
      await mutateAsync({ include_headers: checked })
      toast({
        title: "已更新 Webhook 触发数据",
        description: checked
          ? "TRIGGER 将包含请求头和元数据"
          : "TRIGGER 将仅接收请求正文",
      })
    } catch (error) {
      console.error("Failed to update webhook include_headers", error)
      // Restore the value from before this toggle, not the (possibly stale) prop
      form.setValue("include_headers", !checked)
      toast({
        title: "更新触发数据失败",
        description: extractApiErrorMessage(
          error,
          "更新 Webhook 触发载荷时发生错误。"
        ),
        variant: "destructive",
      })
    }
  }

  const handleMethodsChange = async (newMethods: WebhookMethod[]) => {
    if (newMethods.length === 0) {
      console.log("No methods selected")
      return
    }

    form.setValue("methods", newMethods)

    try {
      await mutateAsync({ methods: newMethods })
      toast({
        title: "已更新 Webhook 请求方法",
        description: `Webhook 将接受以下请求方法：${newMethods.sort().join(", ")}`,
      })
    } catch (error) {
      console.error("Failed to update webhook methods", error)
      form.setValue("methods", webhook.methods ?? ["POST"])
      toast({
        title: "更新请求方法失败",
        description: extractApiErrorMessage(
          error,
          "更新 Webhook 方法时发生错误。"
        ),
        variant: "destructive",
      })
    }
  }

  const handleGenerateApiKey = async (): Promise<boolean> => {
    try {
      const response = await generateWebhookApiKey()
      setGeneratedApiKey(response.api_key)
      setGeneratedAt(response.created_at ?? null)
      setApiKeyDialogOpen(true)
      toast({
        title: "已生成 API 密钥",
        description: "请立即复制 API 密钥，之后不会再次显示。",
      })
      return true
    } catch (error) {
      console.error("Failed to generate webhook API key", error)
      toast({
        title: "生成 API 密钥失败",
        description: extractApiErrorMessage(error, "生成密钥时发生错误。"),
        variant: "destructive",
      })
      return false
    }
  }

  const handleDialogChange = (open: boolean) => {
    setApiKeyDialogOpen(open)
    if (!open) {
      setGeneratedApiKey(null)
      setGeneratedAt(null)
    }
  }

  const handleConfirmRegenerate = async () => {
    const didGenerate = await handleGenerateApiKey()
    if (didGenerate) {
      setConfirmRegenerateDialogOpen(false)
    }
  }

  const handleConfirmRevoke = async () => {
    try {
      await revokeWebhookApiKey()
      setConfirmRevokeDialogOpen(false)
    } catch (error) {
      console.error("Failed to revoke webhook API key", error)
    }
  }

  const handleConfirmDelete = async () => {
    try {
      await deleteWebhookApiKey()
      setConfirmDeleteDialogOpen(false)
    } catch (error) {
      console.error("Failed to delete webhook API key", error)
    }
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">启用 Webhook</Label>
                  <p className="text-xs text-muted-foreground">
                    {field.value === "online"
                      ? "Webhook 已启用，正在接收请求"
                      : "Webhook 已禁用"}
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value === "online"}
                    onCheckedChange={handleStatusChange}
                    className="data-[state=checked]:bg-emerald-500"
                    disabled={isUpdatingWebhook}
                  />
                </FormControl>
              </div>
            </FormItem>
          )}
        />

        <ReadOnlyFieldset readOnly={readOnly} className="space-y-4">
          <FormField
            control={form.control}
            name="include_headers"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">包含请求头</Label>
                    <p className="text-xs text-muted-foreground">
                      将请求头和元数据传入 TRIGGER，格式为{" "}
                      <code>{"{ status_code, headers, data }"}</code>{" "}
                      ，而非仅传入请求正文
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={handleIncludeHeadersChange}
                      className="data-[state=checked]:bg-emerald-500"
                      disabled={isUpdatingWebhook}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="methods"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex gap-2 items-center text-xs font-medium">
                  <span>允许的 HTTP 方法</span>
                </FormLabel>
                <FormControl>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-between w-full text-xs"
                        disabled={isUpdatingWebhook}
                      >
                        {field.value.length > 0
                          ? field.value.sort().join(", ")
                          : "选择 HTTP 方法"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      style={{
                        width: "var(--radix-dropdown-menu-trigger-width)",
                      }}
                      align="start"
                      sideOffset={4}
                    >
                      {HTTP_METHODS.map((method) => (
                        <DropdownMenuItem
                          key={method}
                          onClick={() => {
                            const newMethods = field.value.includes(method)
                              ? field.value.filter((m) => m !== method)
                              : [...field.value, method]

                            handleMethodsChange(newMethods)
                          }}
                          className="w-full text-xs"
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 size-4",
                              field.value.includes(method)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span>{method}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="allowlisted_cidrs"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium">
                  <span>IP 白名单</span>
                </FormLabel>
                <FormControl>
                  <CustomTagInput
                    {...field}
                    placeholder={"输入 IP 地址或 CIDR，默认允许所有 IP。"}
                    tags={field.value}
                    setTags={(newTags) =>
                      handleAllowlistedCidrsChange(
                        Array.isArray(newTags) ? newTags : []
                      )
                    }
                  />
                </FormControl>
                <FormMessage className="text-xs" />
                <FormDescription className="text-xs">
                  按{" "}
                  <kbd className="px-1 py-0.5 text-[10px] font-semibold bg-muted border rounded tracking-tighter">
                    回车 ↵
                  </kbd>{" "}
                  添加新条目。
                </FormDescription>
              </FormItem>
            )}
          />
        </ReadOnlyFieldset>
      </Form>

      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-xs font-medium">
          <span>API 密钥</span>
        </Label>
        {hasActiveApiKey ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-xs shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  生效的密钥
                </span>
                <span className="font-mono text-xs tracking-wide">
                  {apiKeyPreview ?? "—"}
                </span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                          disabled={
                            isGeneratingApiKey ||
                            isRevokingApiKey ||
                            isDeletingApiKey
                          }
                        >
                          <MoreHorizontalIcon className="size-4" />
                          <span className="sr-only">管理 API 密钥</span>
                        </Button>
                      </TooltipTrigger>
                    </DropdownMenuTrigger>
                    <TooltipContent side="bottom" sideOffset={4}>
                      管理 API 密钥
                    </TooltipContent>
                    <DropdownMenuContent align="end" sideOffset={4}>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          setConfirmRegenerateDialogOpen(true)
                        }}
                        disabled={
                          isGeneratingApiKey ||
                          isRevokingApiKey ||
                          isDeletingApiKey
                        }
                        className="flex items-center gap-2"
                      >
                        <RotateCcwIcon className="size-4" />
                        <span>重新生成</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          setConfirmRevokeDialogOpen(true)
                        }}
                        disabled={
                          isGeneratingApiKey ||
                          isRevokingApiKey ||
                          isDeletingApiKey
                        }
                        className="flex items-center gap-2"
                      >
                        <BanIcon className="size-4" />
                        <span>撤销</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault()
                          setConfirmDeleteDialogOpen(true)
                        }}
                        disabled={
                          isGeneratingApiKey ||
                          isRevokingApiKey ||
                          isDeletingApiKey
                        }
                        className="flex items-center gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2Icon className="size-4" />
                        <span>删除</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Separator className="my-3" />
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  创建时间
                </dt>
                <dd className="font-medium text-accent-foreground">
                  {formatTimestamp(apiKeyCreatedAt)}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  上次使用
                </dt>
                <dd className="font-medium text-accent-foreground">
                  {formatTimestamp(apiKeyLastUsedAt)}
                </dd>
              </div>
            </dl>
          </div>
        ) : hasRevokedApiKey ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-4 text-xs shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wide text-amber-700">
                    API 密钥已撤销
                  </span>
                  <span className="font-mono text-xs tracking-wide text-amber-900">
                    {apiKeyPreview ?? "—"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  已撤销 {formatTimestamp(apiKeyRevokedAt)}
                </p>
                <p className="text-[11px] text-amber-800">
                  生成新 API 密钥前，Webhook
                  请求会被阻止。重新生成可恢复访问，删除则取消保护。
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setConfirmRegenerateDialogOpen(true)}
                  disabled={
                    isGeneratingApiKey || isRevokingApiKey || isDeletingApiKey
                  }
                >
                  {isGeneratingApiKey ? "生成中…" : "重新生成"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmDeleteDialogOpen(true)}
                  disabled={
                    isGeneratingApiKey || isRevokingApiKey || isDeletingApiKey
                  }
                >
                  删除
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-xs shadow-sm">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Webhook 未受保护
              </p>
              <p className="text-xs text-muted-foreground">
                尚未配置 API 密钥。生成密钥后，客户端必须验证身份才能发送
                Webhook 请求。
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 w-full justify-center"
              onClick={handleGenerateApiKey}
              disabled={
                isGeneratingApiKey || isRevokingApiKey || isDeletingApiKey
              }
            >
              <>
                <KeyRoundIcon
                  className={cn(
                    "mr-2 h-4 w-4",
                    isGeneratingApiKey
                      ? "animate-spin text-muted-foreground"
                      : ""
                  )}
                />
                {isGeneratingApiKey ? "生成中…" : "生成 API 密钥"}
              </>
            </Button>
          </div>
        )}
        <AlertDialog
          open={confirmRegenerateDialogOpen}
          onOpenChange={setConfirmRegenerateDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>重新生成 API 密钥？</AlertDialogTitle>
              <AlertDialogDescription>
                轮换 API 密钥会立即撤销现有密钥，客户端必须更新为新密钥。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={
                  isGeneratingApiKey || isRevokingApiKey || isDeletingApiKey
                }
              >
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmRegenerate}
                disabled={
                  isGeneratingApiKey || isRevokingApiKey || isDeletingApiKey
                }
              >
                {isGeneratingApiKey ? "生成中…" : "重新生成"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={confirmRevokeDialogOpen}
          onOpenChange={setConfirmRevokeDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>撤销 API 密钥？</AlertDialogTitle>
              <AlertDialogDescription>
                撤销会立即停用现有密钥并保留审计记录，客户端必须使用新生成的密钥验证身份。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={
                  isGeneratingApiKey || isRevokingApiKey || isDeletingApiKey
                }
              >
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmRevoke}
                disabled={
                  isGeneratingApiKey || isRevokingApiKey || isDeletingApiKey
                }
              >
                {isRevokingApiKey ? "撤销中…" : "撤销"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={confirmDeleteDialogOpen}
          onOpenChange={setConfirmDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除 API 密钥？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作将永久删除 API 密钥。在生成新密钥之前，Webhook
                将不再要求请求进行身份验证。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={
                  isGeneratingApiKey || isRevokingApiKey || isDeletingApiKey
                }
              >
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={
                  isGeneratingApiKey || isRevokingApiKey || isDeletingApiKey
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingApiKey ? "删除中…" : "删除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="text-xs text-muted-foreground">
          Webhook 发送方必须通过 x-tracecat-api-key 请求头传递密钥。
        </p>
      </div>

      <Dialog open={apiKeyDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Webhook API 密钥</DialogTitle>
            <DialogDescription>
              请立即复制密钥，之后不会再次显示。
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>生成时间</span>
                <span>{formatTimestamp(generatedAt)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                <code className="break-all text-xs">
                  {generatedApiKey ?? "—"}
                </code>
                {generatedApiKey ? (
                  <CopyButton
                    value={generatedApiKey}
                    toastMessage="已将 API 密钥复制到剪贴板"
                  />
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                如果 API 密钥泄露，请立即轮换。
              </p>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        <Label className="flex gap-2 items-center text-xs font-medium">
          <span>URL</span>
          <CopyButton
            value={webhook.url}
            toastMessage="已将 URL 复制到剪贴板"
          />
        </Label>
        <div className="rounded-md border shadow-sm">
          <Input
            name="url"
            defaultValue={webhook.url}
            className="text-xs rounded-md border-none shadow-none"
            readOnly
            disabled
          />
        </div>
      </div>
    </div>
  )
}

export function CaseTriggerControls({
  workflowId,
  readOnly = false,
}: {
  workflowId: string
  /** Lock case trigger settings on managed workflows. */
  readOnly?: boolean
}) {
  const workspaceId = useWorkspaceId()
  const {
    data: caseTrigger,
    isLoading: isLoadingCaseTrigger,
    error: caseTriggerError,
  } = useCaseTrigger(workspaceId, workflowId)
  const { mutateAsync: upsertCaseTrigger, isPending: isUpdatingCaseTrigger } =
    useUpsertCaseTrigger(workspaceId, workflowId)
  const { caseTags, caseTagsIsLoading } = useCaseTagCatalog(workspaceId)

  const [status, setStatus] = useState<"online" | "offline">("offline")
  const [eventTypes, setEventTypes] = useState<CaseEventType[]>([])
  const [tagFilters, setTagFilters] = useState<string[]>([])

  useEffect(() => {
    if (!caseTrigger) {
      return
    }
    setStatus(caseTrigger.status)
    setEventTypes(caseTrigger.event_types ?? [])
    setTagFilters(caseTrigger.tag_filters ?? [])
  }, [caseTrigger])

  const persist = useCallback(
    async (
      nextStatus: "online" | "offline",
      nextEvents: CaseEventType[],
      nextTags: string[]
    ) => {
      await upsertCaseTrigger({
        status: nextStatus,
        event_types: nextEvents,
        tag_filters: nextTags,
      })
    },
    [upsertCaseTrigger]
  )

  const handleStatusToggle = useCallback(
    async (checked: boolean) => {
      const nextStatus = checked ? "online" : "offline"
      if (nextStatus === "online" && eventTypes.length === 0) {
        toast({
          title: "选择事件变更类型",
          description: "启用前至少选择一种事件变更类型。",
          variant: "destructive",
        })
        return
      }
      const previousStatus = status
      setStatus(nextStatus)
      try {
        await persist(nextStatus, eventTypes, tagFilters)
        toast({
          title: "已更新事件触发器",
          description: `事件触发器现已${nextStatus}。`,
        })
      } catch {
        setStatus(previousStatus)
      }
    },
    [eventTypes, persist, status, tagFilters]
  )

  const handleEventTypesChange = useCallback(
    async (values: string[]) => {
      const nextEvents = values as CaseEventType[]
      const wasOnline = status === "online"
      const nextStatus =
        wasOnline && nextEvents.length === 0 ? "offline" : status

      const previousEvents = eventTypes
      const previousStatus = status
      setEventTypes(nextEvents)
      if (nextStatus !== status) {
        setStatus(nextStatus)
      }

      try {
        await persist(nextStatus, nextEvents, tagFilters)
        if (wasOnline && nextEvents.length === 0) {
          toast({
            title: "事件触发器已禁用",
            description: "选择一种事件变更类型以重新启用触发器。",
          })
        } else {
          toast({
            title: "已更新事件变更类型",
            description: "已成功保存事件触发类型。",
          })
        }
      } catch {
        setEventTypes(previousEvents)
        setStatus(previousStatus)
      }
    },
    [eventTypes, persist, status, tagFilters]
  )

  const handleTagFiltersChange = useCallback(
    async (values: string[]) => {
      const previousFilters = tagFilters
      setTagFilters(values)
      try {
        await persist(status, eventTypes, values)
        toast({
          title: "已更新标签白名单",
          description: "已成功保存事件触发器的标签筛选条件。",
        })
      } catch {
        setTagFilters(previousFilters)
      }
    },
    [eventTypes, persist, status, tagFilters]
  )

  const tagSuggestions = useMemo(() => {
    return (caseTags ?? []).map((tag) => ({
      id: tag.id,
      label: tag.name,
      value: tag.ref,
      description: tag.ref,
    }))
  }, [caseTags])

  if (isLoadingCaseTrigger) {
    return <CenteredSpinner />
  }

  if (caseTriggerError) {
    return (
      <AlertNotification level="error" message={"加载事件触发器配置失败。"} />
    )
  }

  return (
    <ReadOnlyFieldset readOnly={readOnly} className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-md border p-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold">启用事件触发器</Label>
          <p className="text-xs text-muted-foreground">
            发生所选事件变更时触发工作流。
          </p>
        </div>
        <Switch
          checked={status === "online"}
          onCheckedChange={handleStatusToggle}
          disabled={isUpdatingCaseTrigger}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">事件变更类型</Label>
        <MultiTagCommandInput
          value={eventTypes}
          onChange={handleEventTypesChange}
          suggestions={CASE_EVENT_SUGGESTIONS}
          searchKeys={["label", "value", "group"]}
          placeholder={"选择事件变更类型…"}
          disabled={isUpdatingCaseTrigger}
          allowCustomTags={false}
        />
        <p className="text-xs text-muted-foreground">
          选择哪些事件变更会触发此工作流。
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">标签白名单</Label>
        <MultiTagCommandInput
          value={tagFilters}
          onChange={handleTagFiltersChange}
          suggestions={tagSuggestions}
          searchKeys={["label", "value", "description"]}
          placeholder={caseTagsIsLoading ? "正在加载标签…" : "选择事件标签…"}
          disabled={isUpdatingCaseTrigger || caseTagsIsLoading}
          allowCustomTags={false}
        />
        <p className="text-xs text-muted-foreground">留空时不按标签筛选。</p>
        <p className="text-xs text-muted-foreground">
          标签变更匹配添加或移除的标签，其他变更匹配事件当前的标签。忽略工作流自身产生的变更。
        </p>
      </div>
    </ReadOnlyFieldset>
  )
}

export function ScheduleControls({ workflowId }: { workflowId: string }) {
  const {
    schedules,
    schedulesIsLoading,
    schedulesError,
    updateSchedule,
    deleteSchedule,
  } = useSchedules(workflowId)
  const workspaceId = useWorkspaceId()

  if (schedulesIsLoading) {
    return <CenteredSpinner />
  }
  if (schedulesError || !schedules) {
    return <AlertNotification level="error" message={"加载定时计划失败。"} />
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-3 text-xs font-semibold">ID</TableHead>
            <TableHead className="text-xs font-semibold">输入</TableHead>
            <TableHead className="text-xs font-semibold">定时计划</TableHead>
            <TableHead className="text-xs font-semibold">状态</TableHead>
            <TableHead className="text-xs font-semibold">超时时间</TableHead>
            <TableHead className="text-xs font-semibold">偏移量</TableHead>
            <TableHead className="text-xs font-semibold">开始</TableHead>
            <TableHead className="text-xs font-semibold">结束</TableHead>
            <TableHead className="text-right text-xs font-semibold">
              动作
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.length > 0 ? (
            schedules.map(
              ({
                id,
                status,
                every,
                cron,
                timeout,
                offset,
                start_at,
                end_at,
              }) => {
                const isCron = Boolean(cron)
                const scheduleLabel = isCron
                  ? cron
                  : every
                    ? durationToHumanReadable(every)
                    : "—"
                const offsetLabel =
                  !isCron && offset
                    ? (() => {
                        try {
                          return durationToHumanReadable(offset)
                        } catch {
                          return offset
                        }
                      })()
                    : "无"
                const startLabel = formatScheduleDate(start_at)
                const endLabel = formatScheduleDate(end_at)

                return (
                  <TableRow key={id} className="ext-xs text-muted-foreground">
                    <TableCell className="items-center pl-3 text-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="font-mono text-xs hover:text-foreground transition-colors cursor-pointer"
                              onClick={async () => {
                                await navigator.clipboard.writeText(id!)
                                toast({
                                  title: "已复制到剪贴板",
                                  description: "已成功复制定时计划 ID",
                                })
                              }}
                            >
                              {id?.slice(0, 8)}...
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono text-xs">{id}</p>
                            <p className="text-xs text-muted-foreground">
                              点击复制
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="items-center text-xs">
                      {isCron ? "Cron" : "间隔"}
                    </TableCell>
                    <TableCell className="items-center text-xs">
                      {isCron ? (
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                          {scheduleLabel}
                        </code>
                      ) : (
                        scheduleLabel
                      )}
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      <div className="flex">
                        <p>{status}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      <div className="flex">
                        <p>{timeout ? `${timeout}秒` : "无"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex">
                        <p>{offsetLabel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex">
                        <p>{startLabel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex">
                        <p>{endLabel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="items-center pr-3 text-xs">
                      <div className="flex justify-end">
                        <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button className="p-0 size-6" variant="ghost">
                                <DotsHorizontalIcon className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuLabel className="text-xs">
                                动作
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  id && navigator.clipboard.writeText(id)
                                }
                                className="text-xs"
                              >
                                复制 ID
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={cn("text-xs", status === "online")}
                                onClick={async () => {
                                  if (!id) return
                                  await updateSchedule({
                                    workspaceId,
                                    scheduleId: id,
                                    requestBody: {
                                      status:
                                        status === "online"
                                          ? "offline"
                                          : "online",
                                    },
                                  })
                                }}
                              >
                                {status === "online" ? "暂停" : "恢复"}
                              </DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-xs text-rose-500 focus:text-rose-600">
                                  删除
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>删除定时计划</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除此定时计划吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={async () => {
                                  if (!id) return
                                  await deleteSchedule({
                                    workspaceId,
                                    scheduleId: id,
                                  })
                                }}
                              >
                                确认
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              }
            )
          ) : (
            <TableRow className="justify-center text-xs text-muted-foreground">
              <TableCell
                className="h-8 text-center bg-muted-foreground/5"
                colSpan={9}
              >
                暂无定时计划
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <Separator />
      <CreateScheduleDialog workflowId={workflowId} />
    </div>
  )
}

const ISO_8601_DURATION_REGEX =
  /^P(?!$)(\d+(?:\.\d+)?Y)?(\d+(?:\.\d+)?M)?(\d+(?:\.\d+)?W)?(\d+(?:\.\d+)?D)?(T(\d+(?:\.\d+)?H)?(\d+(?:\.\d+)?M)?(\d+(?:\.\d+)?S)?)?$/

const BASIC_CRON_REGEX = /^(\S+\s+){4,5}\S+$/

const durationNumber = z.coerce.number().int().nonnegative().catch(0)

const rawDurationSchema = z.object({
  years: durationNumber,
  months: durationNumber,
  weeks: durationNumber,
  days: durationNumber,
  hours: durationNumber,
  minutes: durationNumber,
  seconds: durationNumber,
})

const scheduleInputsSchema = z
  .object({
    mode: z.enum(["interval", "cron"]).default("interval"),
    duration: rawDurationSchema,
    cronExpression: z.string().optional(),
    timeout: z.number().optional(),
    offset: z.string().optional(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.mode === "interval") {
      try {
        // Validates at least one component and positive numbers
        durationSchema.parse(values.duration)
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["duration.seconds"],
          message:
            error instanceof Error ? error.message : "请提供有效的间隔时长。",
        })
      }

      if (values.offset && values.offset.trim() !== "") {
        if (!ISO_8601_DURATION_REGEX.test(values.offset)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["offset"],
            message: "必须是有效的 ISO 8601 时长字符串（如 PT1H、P1D、PT30M）",
          })
        }
      }
    } else {
      const cron = values.cronExpression?.trim()
      if (!cron) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cronExpression"],
          message: "Cron 定时计划必须提供 Cron 表达式。",
        })
      } else if (!BASIC_CRON_REGEX.test(cron)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cronExpression"],
          message: "请输入包含 5 或 6 个字段的有效 Cron 表达式。",
        })
      }

      if (values.offset) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["offset"],
          message: "仅间隔型定时计划支持偏移量。",
        })
      }
    }

    const startAt = values.startAt?.trim()
    const endAt = values.endAt?.trim()

    const parseDate = (value: string) => {
      const parsed = Date.parse(value)
      return Number.isNaN(parsed) ? null : parsed
    }

    if (startAt) {
      if (parseDate(startAt) === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startAt"],
          message: "请输入有效的开始日期和时间。",
        })
      }
    }

    if (endAt) {
      if (parseDate(endAt) === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endAt"],
          message: "请输入有效的结束日期和时间。",
        })
      }
    }

    if (startAt && endAt) {
      const start = parseDate(startAt)
      const end = parseDate(endAt)
      if (start !== null && end !== null && start > end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endAt"],
          message: "结束时间必须晚于开始时间。",
        })
      }
    }
  })
type DurationType =
  | "duration.years"
  | "duration.months"
  | "duration.days"
  | "duration.hours"
  | "duration.minutes"
  | "duration.seconds"
type ScheduleInputs = z.infer<typeof scheduleInputsSchema>

export function CreateScheduleDialog({ workflowId }: { workflowId: string }) {
  const { createSchedule } = useSchedules(workflowId)
  const workspaceId = useWorkspaceId()
  const { workflow } = useWorkflow()
  const hasVersion = !!workflow?.version
  const [dialogOpen, setDialogOpen] = useState(false)
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false)
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false)
  const form = useForm<ScheduleInputs>({
    resolver: zodResolver(scheduleInputsSchema),
    defaultValues: {
      mode: "interval",
      duration: {
        years: 0,
        months: 0,
        weeks: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      },
      cronExpression: "",
      timeout: undefined,
      offset: "",
      startAt: "",
      endAt: "",
    },
  })
  const mode = form.watch("mode")

  useEffect(() => {
    if (mode === "cron") {
      form.setValue("offset", "")
      form.clearErrors(["offset"])
    } else {
      form.clearErrors(["cronExpression"])
    }
  }, [form, mode])

  const onSubmit = async (values: ScheduleInputs) => {
    if (!hasVersion) {
      toast({
        title: "无法创建定时计划",
        description: "创建定时计划前必须先提交工作流。",
        variant: "destructive",
      })
      return
    }

    const { mode, duration, cronExpression, timeout, offset, startAt, endAt } =
      values
    try {
      const payload: SchedulesCreateScheduleData["requestBody"] = {
        workflow_id: workflowId,
      }

      const sanitizedTimeout =
        typeof timeout === "number" && !Number.isNaN(timeout)
          ? timeout
          : undefined
      if (sanitizedTimeout !== undefined) {
        payload.timeout = sanitizedTimeout
      }

      if (mode === "interval") {
        const parsedDuration = durationSchema.parse(duration)
        payload.every = durationToISOString(parsedDuration)
        if (offset && offset.trim() !== "") {
          payload.offset = offset
        }
      } else {
        const cron = cronExpression?.trim()
        if (cron) {
          payload.cron = cron
        }
      }

      const convertDateTime = (value?: string) => {
        const trimmed = value?.trim()
        if (!trimmed) return undefined
        const parsed = Date.parse(trimmed)
        return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString()
      }

      const startAtIso = convertDateTime(startAt)
      if (startAtIso) {
        payload.start_at = startAtIso
      }

      const endAtIso = convertDateTime(endAt)
      if (endAtIso) {
        payload.end_at = endAtIso
      }

      const response = await createSchedule({
        workspaceId,
        requestBody: payload,
      })
      console.log("Schedule created", response)
      form.reset()
      setDialogOpen(false)
    } catch (error) {
      if (error instanceof ApiError) {
        console.error("Failed to create schedule", error.body)
      } else {
        console.error("Unexpected error when creating schedule", error)
      }
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <TooltipProvider>
        <Tooltip open={!hasVersion ? undefined : false}>
          <TooltipTrigger asChild>
            <span>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex gap-2 justify-center items-center w-full h-7 text-muted-foreground"
                  disabled={!hasVersion}
                >
                  <PlusCircleIcon className="size-4" />
                  <span>创建定时计划</span>
                </Button>
              </DialogTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>创建定时计划前必须先保存工作流。</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent size="lg" className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>创建定时计划</DialogTitle>
          <DialogDescription>
            配置工作流的定时计划。工作流不会立即运行。
            {!hasVersion && (
              <p className="mt-2 text-rose-500">
                警告：创建定时计划前必须先提交工作流。
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(onSubmit, () => {
              console.error("Form validation failed")
              toast({
                title: "表单输入无效",
                description: "请检查表单中的错误。",
              })
            })}
          >
            <DialogBody>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs capitalize text-foreground/80">
                        定时计划类型
                      </FormLabel>
                      <FormDescription className="text-xs">
                        选择按时间间隔或 Cron 表达式调度。
                      </FormDescription>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger className="text-xs capitalize">
                            <SelectValue placeholder={"选择定时计划类型"} />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="interval">间隔</SelectItem>
                            <SelectItem value="cron">Cron</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mode === "interval" && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "duration.years",
                      "duration.months",
                      "duration.days",
                      "duration.hours",
                      "duration.minutes",
                      "duration.seconds",
                    ].map((unit) => (
                      <FormField
                        key={unit}
                        control={form.control}
                        name={unit as DurationType}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs capitalize text-foreground/80">
                              {unit.split(".")[1]}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                className="text-xs capitalize"
                                placeholder={unit}
                                value={Math.max(0, Number(field.value || 0))}
                                {...form.register(unit as DurationType, {
                                  valueAsNumber: true,
                                })}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                )}

                {mode === "cron" && (
                  <FormField
                    control={form.control}
                    name="cronExpression"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs capitalize text-foreground/80">
                          Cron 表达式
                        </FormLabel>
                        <FormDescription className="text-xs">
                          标准的 5 或 6 字段 Cron 格式，例如{" "}
                          <code className="font-mono">0 0 * * *</code>.
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="text"
                            className="text-xs font-mono"
                            placeholder="0 0 * * *"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  key="timeout"
                  control={form.control}
                  name="timeout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs capitalize text-foreground/80">
                        超时时间
                      </FormLabel>
                      <FormDescription className="text-xs">
                        工作流可运行的最长时间（秒），默认为 0（不超时）。
                      </FormDescription>
                      <FormControl>
                        <Input
                          type="number"
                          className="text-xs capitalize"
                          placeholder={"超时时间（秒）"}
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mode === "interval" && (
                  <FormField
                    key="offset"
                    control={form.control}
                    name="offset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs capitalize text-foreground/80">
                          偏移量
                        </FormLabel>
                        <FormDescription className="text-xs">
                          首次执行前的可选延迟，使用 ISO 8601 格式：PT1H（1
                          小时）、P1D（1 天）、PT30M（30 分钟）。
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="text"
                            className="text-xs"
                            placeholder={"PT1H（可选）"}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  key="startAt"
                  control={form.control}
                  name="startAt"
                  render={({ field }) => {
                    const dateValue = field.value
                      ? new Date(field.value)
                      : undefined
                    const timeValue = field.value
                      ? new Date(field.value).toTimeString().slice(0, 8)
                      : ""

                    const handleDateChange = (date: Date | undefined) => {
                      if (!date) {
                        field.onChange("")
                        setStartDatePickerOpen(false)
                        return
                      }

                      const currentTime = field.value
                        ? new Date(field.value).toTimeString().slice(0, 8)
                        : "00:00:00"
                      const [hours, minutes, seconds] = currentTime.split(":")
                      date.setHours(
                        Number.parseInt(hours),
                        Number.parseInt(minutes),
                        Number.parseInt(seconds)
                      )
                      field.onChange(date.toISOString())
                      setStartDatePickerOpen(false)
                    }

                    const handleTimeChange = (
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => {
                      const timeStr = e.target.value
                      const currentDate = field.value
                        ? new Date(field.value)
                        : new Date()

                      const [hours, minutes, seconds] = timeStr.split(":")
                      currentDate.setHours(
                        Number.parseInt(hours || "0"),
                        Number.parseInt(minutes || "0"),
                        Number.parseInt(seconds || "0")
                      )
                      field.onChange(currentDate.toISOString())
                    }

                    return (
                      <FormItem>
                        <FormLabel className="text-xs capitalize text-foreground/80">
                          开始时间下限
                        </FormLabel>
                        <FormDescription className="text-xs">
                          此定时计划最早开始运行的日期和时间，可选。
                        </FormDescription>
                        <FormControl>
                          <div className="flex gap-4">
                            <div className="flex flex-col gap-3">
                              <Popover
                                open={startDatePickerOpen}
                                onOpenChange={setStartDatePickerOpen}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-32 justify-between font-normal text-xs"
                                  >
                                    {dateValue
                                      ? dateValue.toLocaleDateString("zh-CN")
                                      : "选择日期"}
                                    <ChevronDownIcon className="size-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto overflow-hidden p-0"
                                  align="start"
                                  portal={true}
                                >
                                  <Calendar
                                    mode="single"
                                    selected={dateValue}
                                    captionLayout="dropdown"
                                    onSelect={handleDateChange}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="flex flex-col gap-3">
                              <Input
                                type="time"
                                step="1"
                                value={timeValue}
                                onChange={handleTimeChange}
                                className="bg-background text-xs appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                <FormField
                  key="endAt"
                  control={form.control}
                  name="endAt"
                  render={({ field }) => {
                    const dateValue = field.value
                      ? new Date(field.value)
                      : undefined
                    const timeValue = field.value
                      ? new Date(field.value).toTimeString().slice(0, 8)
                      : ""

                    const handleDateChange = (date: Date | undefined) => {
                      if (!date) {
                        field.onChange("")
                        setEndDatePickerOpen(false)
                        return
                      }

                      const currentTime = field.value
                        ? new Date(field.value).toTimeString().slice(0, 8)
                        : "00:00:00"
                      const [hours, minutes, seconds] = currentTime.split(":")
                      date.setHours(
                        Number.parseInt(hours),
                        Number.parseInt(minutes),
                        Number.parseInt(seconds)
                      )
                      field.onChange(date.toISOString())
                      setEndDatePickerOpen(false)
                    }

                    const handleTimeChange = (
                      e: React.ChangeEvent<HTMLInputElement>
                    ) => {
                      const timeStr = e.target.value
                      const currentDate = field.value
                        ? new Date(field.value)
                        : new Date()

                      const [hours, minutes, seconds] = timeStr.split(":")
                      currentDate.setHours(
                        Number.parseInt(hours || "0"),
                        Number.parseInt(minutes || "0"),
                        Number.parseInt(seconds || "0")
                      )
                      field.onChange(currentDate.toISOString())
                    }

                    return (
                      <FormItem>
                        <FormLabel className="text-xs capitalize text-foreground/80">
                          结束时间上限
                        </FormLabel>
                        <FormDescription className="text-xs">
                          此定时计划停止运行的最晚日期和时间，可选。
                        </FormDescription>
                        <FormControl>
                          <div className="flex gap-4">
                            <div className="flex flex-col gap-3">
                              <Popover
                                open={endDatePickerOpen}
                                onOpenChange={setEndDatePickerOpen}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-32 justify-between font-normal text-xs"
                                  >
                                    {dateValue
                                      ? dateValue.toLocaleDateString("zh-CN")
                                      : "选择日期"}
                                    <ChevronDownIcon className="size-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto overflow-hidden p-0"
                                  align="start"
                                  portal={true}
                                >
                                  <Calendar
                                    mode="single"
                                    selected={dateValue}
                                    captionLayout="dropdown"
                                    onSelect={handleDateChange}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="flex flex-col gap-3">
                              <Input
                                type="time"
                                step="1"
                                value={timeValue}
                                onChange={handleTimeChange}
                                className="bg-background text-xs appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button size="sm" type="submit" variant="default">
                <PlusCircleIcon className="mr-2 size-4" />
                <span>创建定时计划</span>
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
