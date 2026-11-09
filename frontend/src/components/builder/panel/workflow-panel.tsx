"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import "@radix-ui/react-dialog"

import {
  FileTextIcon,
  History,
  Info,
  LayoutListIcon,
  RotateCcw,
} from "lucide-react"
import { type DefaultValues, useForm } from "react-hook-form"
import { z } from "zod"
import {
  ApiError,
  type ExpectedField_Input,
  type RegistryLockEntryRead,
  type WorkflowDefinitionRead,
  type WorkflowRead,
  type WorkflowUpdate,
  workflowsValidateWorkflowEntrypoint,
} from "@/client"
import { ControlledYamlField } from "@/components/builder/panel/action-panel-fields"
import { CopyButton } from "@/components/copy-button"
import { CenteredSpinner } from "@/components/loading/spinner"
import { ReadOnlyFieldset } from "@/components/managed/read-only-fieldset"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import { TunnelSelect } from "@/components/tunnels/tunnel-select"
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useRestoreWorkflowDefinition,
  useWorkflowDefinitions,
} from "@/hooks/use-workflow-definitions"
import {
  isRequestValidationErrorArray,
  type TracecatApiError,
} from "@/lib/errors"
import { getRelativeTime } from "@/lib/event-history"
import { useWorkflow } from "@/providers/workflow"

const createWorkflowUpdateFormSchema = (workspaceId: string) =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(3, { message: "名称至少需要 3 个字符" })
        .max(100, { message: "名称不能超过 100 个字符" }),
      alias: z
        .string()
        .max(100, { message: "别名不能超过 100 个字符" })
        .nullish(),
      // Config fields
      environment: z
        .string()
        .max(100, { message: "环境名称不能超过 100 个字符" })
        .optional(),
      tunnel: z.string().max(63).optional(),
      timeout: z
        .number()
        .min(0, { message: "超时时间不能小于 0 秒" })
        .max(1209600, {
          message: "超时时间不能超过 14 天（1209600 秒）",
        })
        .optional(),
      /* Input Schema */
      expects: z
        .record(
          z.string(),
          z
            .object({
              type: z.string().min(1, { message: "类型不能为空" }),
              description: z.string().nullable().optional(),
              default: z.unknown().nullable().optional(),
            })
            .refine((val): val is ExpectedField_Input => true)
        )
        .nullish(),
      returns: z.unknown().nullish(),
      /* Error Handler */
      error_handler: z
        .string()
        .max(100, { message: "错误处理器不能超过 100 个字符" })
        .nullish(),
    })
    .superRefine(async (values, ctx) => {
      if (!values.expects || Object.keys(values.expects).length === 0) {
        return
      }

      try {
        const { valid, errors } = await workflowsValidateWorkflowEntrypoint({
          workspaceId,
          requestBody: {
            expects: values.expects,
          },
        })

        if (!valid) {
          const messages = errors?.flatMap((error) => {
            if (!error?.detail || !Array.isArray(error.detail)) {
              return []
            }
            return error.detail.map((detail) => detail.msg).filter(Boolean)
          })

          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["expects"],
            message:
              messages && messages.length > 0
                ? messages.join("\n")
                : "触发器输入定义无效。",
          })
        }
      } catch (error) {
        console.error("Failed to validate trigger inputs", error)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expects"],
          message: "校验触发器输入失败，请重试。",
        })
      }
    })

type WorkflowUpdateFormSchema = ReturnType<
  typeof createWorkflowUpdateFormSchema
>
type WorkflowUpdateForm = z.infer<WorkflowUpdateFormSchema>

const workflowReadmeSchema = z
  .string()
  .max(1000, { message: "README 不能超过 1000 个字符" })

type WorkflowPanelTab = "workflow" | "readme" | "versions"

export function WorkflowPanel({
  workflow,
}: {
  workflow: WorkflowRead
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<WorkflowPanelTab>("workflow")

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Tabs
        defaultValue="workflow"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as WorkflowPanelTab)}
        className="flex h-full w-full flex-col"
      >
        <div className="w-full shrink-0">
          <div className="no-scrollbar flex items-center justify-start overflow-x-auto">
            <TabsList className="h-9 shrink-0 justify-start rounded-none bg-transparent p-0">
              <TabsTrigger
                className="flex h-full min-w-24 items-center justify-center rounded-none px-5 py text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                value="workflow"
              >
                <LayoutListIcon className="mr-2 size-4" />
                <span>工作流</span>
              </TabsTrigger>
              <TabsTrigger
                className="flex h-full min-w-24 items-center justify-center rounded-none px-5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                value="readme"
              >
                <FileTextIcon className="mr-2 size-4" />
                <span>README</span>
              </TabsTrigger>
              <TabsTrigger
                className="flex h-full min-w-24 items-center justify-center rounded-none px-5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                value="versions"
              >
                <History className="mr-2 size-4" />
                <span>版本</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <Separator />
        </div>
        <div className="flex-1 overflow-auto">
          <TabsContent value="workflow" className="mt-0 h-full">
            <WorkflowSettingsPanel workflow={workflow} />
          </TabsContent>
          <TabsContent value="readme" className="mt-0 h-full">
            <WorkflowReadmePanel workflow={workflow} />
          </TabsContent>
          <TabsContent value="versions" className="mt-0 h-full">
            <WorkflowVersionsPanel workflow={workflow} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function WorkflowVersionsPanel({
  workflow,
}: {
  workflow: WorkflowRead
}): React.JSX.Element {
  const { workspaceId, workflowId, isReadOnly } = useWorkflow()
  const { definitions, definitionsIsLoading, definitionsError } =
    useWorkflowDefinitions(workspaceId, workflowId)
  const { restoreWorkflowDefinition, restoreWorkflowDefinitionIsPending } =
    useRestoreWorkflowDefinition(workspaceId, workflowId)
  const [confirmVersion, setConfirmVersion] = useState<number | null>(null)

  function handleRestore(version: number) {
    setConfirmVersion(version)
  }

  async function handleConfirmRestore() {
    if (confirmVersion === null) {
      return
    }
    const version = confirmVersion
    setConfirmVersion(null)
    await restoreWorkflowDefinition({ version })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <History className="size-3.5" />
          <span>工作流历史</span>
        </div>
        {workflow.version ? (
          <Badge variant="secondary">{`当前 v${workflow.version}`}</Badge>
        ) : null}
      </div>
      <ScrollArea className="flex-1">
        <WorkflowVersionsHistory
          definitions={definitions}
          definitionsIsLoading={definitionsIsLoading}
          definitionsError={definitionsError}
          currentVersion={workflow.version ?? null}
          restorePending={restoreWorkflowDefinitionIsPending || isReadOnly}
          onRestore={handleRestore}
        />
      </ScrollArea>
      <AlertDialog
        open={confirmVersion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmVersion(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>恢复工作流版本？</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmVersion !== null
                ? `恢复 v${confirmVersion} 将覆盖当前草稿，所有未提交的更改都会被丢弃。`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmRestore()}>
              恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function WorkflowVersionsHistory({
  definitions,
  definitionsIsLoading,
  definitionsError,
  currentVersion,
  restorePending,
  onRestore,
}: {
  definitions?: WorkflowDefinitionRead[]
  definitionsIsLoading: boolean
  definitionsError: unknown
  currentVersion: number | null
  restorePending: boolean
  onRestore: (version: number) => void
}): React.JSX.Element {
  if (definitionsIsLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <CenteredSpinner />
      </div>
    )
  }

  if (definitionsError) {
    return (
      <div className="px-4 py-6 text-sm text-destructive">
        加载工作流版本失败。
      </div>
    )
  }

  if (!definitions?.length) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <History />
            </EmptyMedia>
            <EmptyTitle>版本</EmptyTitle>
            <EmptyDescription>保存工作流以开始记录版本。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  const latestVersion = definitions[0]?.version ?? null

  return (
    <TooltipProvider>
      <div className="flex flex-col">
        {definitions.map((definition, index) => {
          const isCurrent = definition.version === currentVersion
          const isLatest = definition.version === latestVersion
          const registryLockEntries = getRegistryLockEntries(definition)
          const registryLockSummary =
            formatRegistryLockSummary(registryLockEntries)
          return (
            <div key={definition.id}>
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{`v${definition.version}`}</span>
                    {isCurrent ? <Badge variant="secondary">当前</Badge> : null}
                    {isLatest ? <Badge variant="outline">最新</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {getRelativeTime(new Date(definition.created_at))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {registryLockSummary ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className="max-w-full overflow-hidden truncate whitespace-nowrap font-mono font-normal"
                            tabIndex={0}
                            aria-label={`注册表锁定：${registryLockSummary}`}
                          >
                            {registryLockSummary}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-1">
                            <div className="font-medium">注册表锁定</div>
                            {registryLockEntries.map((entry) => (
                              <div
                                key={entry.origin}
                                className="break-all font-mono text-xs"
                              >
                                {`${entry.origin}@${entry.version}`}
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        未锁定注册表
                      </span>
                    )}
                  </div>
                </div>
                {!isCurrent ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={restorePending}
                        onClick={() => onRestore(definition.version)}
                        aria-label={`恢复 v${definition.version}`}
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>恢复</TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              {index < definitions.length - 1 ? <Separator /> : null}
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

function getRegistryLockEntries(
  definition: WorkflowDefinitionRead
): RegistryLockEntryRead[] {
  return definition.registry_lock_entries
}

function formatRegistryLockSummary(
  entries: RegistryLockEntryRead[]
): string | null {
  if (entries.length === 0) {
    return null
  }
  const [{ label }] = entries
  if (entries.length === 1) {
    return label
  }
  return `${label} +${entries.length - 1}`
}

function getWorkflowFormValues(
  workflow: WorkflowRead
): DefaultValues<WorkflowUpdateForm> {
  return {
    title: workflow.title,
    alias: workflow.alias,
    environment: workflow.config?.environment || "default",
    tunnel: workflow.config?.tunnel || undefined,
    timeout: workflow.config?.timeout || 0,
    // Use undefined for empty objects so the YAML editor shows empty instead of {}
    expects:
      workflow.expects && Object.keys(workflow.expects).length > 0
        ? workflow.expects
        : undefined,
    returns: workflow.returns,
    error_handler: workflow.error_handler || "",
  }
}

function WorkflowSettingsPanel({
  workflow,
}: {
  workflow: WorkflowRead
}): React.JSX.Element {
  const { updateWorkflow, workspaceId, isReadOnly } = useWorkflow()
  const workflowUpdateFormSchema = useMemo(
    () => createWorkflowUpdateFormSchema(workspaceId),
    [workspaceId]
  )
  const methods = useForm<WorkflowUpdateForm>({
    resolver: zodResolver(workflowUpdateFormSchema, undefined, {
      mode: "async",
    }),
    defaultValues: getWorkflowFormValues(workflow),
  })

  useEffect(() => {
    // Resync when the workflow changes outside this form (e.g. a breadcrumb
    // rename) so a later blur-save doesn't submit stale cached values.
    // keepDirtyValues preserves edits the user is still making here.
    methods.reset(getWorkflowFormValues(workflow), {
      keepDirtyValues: true,
      keepErrors: true,
    })
  }, [methods, workflow])

  const onSubmit = useCallback(
    async (values: WorkflowUpdateForm) => {
      console.log("Saving changes...", values)
      try {
        const updateData: WorkflowUpdate = {
          ...values,
          config: {
            environment: values.environment,
            tunnel: values.tunnel ?? null,
            timeout: values.timeout,
          },
        }

        await updateWorkflow(updateData)
      } catch (error) {
        if (error instanceof ApiError) {
          const apiError = error as TracecatApiError
          console.error("Application failed to validate action", apiError.body)

          // Set form errors from API validation errors
          if (isRequestValidationErrorArray(apiError.body.detail)) {
            const details = apiError.body.detail
            details.forEach((detail) => {
              methods.setError(detail.loc[1] as keyof WorkflowUpdateForm, {
                message: detail.msg,
              })
            })
          } else {
            console.error("Validation failed, unknown error", error)
            methods.setError("root", {
              message: `校验失败，未知错误：${JSON.stringify(
                apiError.body.detail
              )}`,
            })
          }
        } else {
          console.error("Validation failed, unknown error", error)
        }
      }
    },
    [updateWorkflow, methods]
  )

  const onPanelBlur = useCallback(async () => {
    // Managed workflows are read-only, so there is nothing to save.
    if (isReadOnly) {
      return
    }
    // Save whenever focus changes, regardless of where it's going
    const values = methods.getValues()

    // Parse values through zod schema first
    const result = await workflowUpdateFormSchema.safeParseAsync(values)
    if (result.success) {
      methods.clearErrors()
      await onSubmit(result.data)
    } else {
      console.warn("Validation failed:", result.error)
      // Set form errors with field name and message
      Object.entries(result.error.formErrors.fieldErrors).forEach(
        ([fieldName, error]) => {
          methods.setError(fieldName as keyof WorkflowUpdateForm, {
            type: "validation",
            message: error[0] || "值无效",
          })
        }
      )
    }
  }, [isReadOnly, methods, onSubmit, workflowUpdateFormSchema])

  return (
    <div onBlur={onPanelBlur} className="flex h-full flex-col">
      <Form {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-auto"
        >
          {/* All other fields in one flat section */}
          <ReadOnlyFieldset
            readOnly={isReadOnly}
            className="flex flex-col gap-6 overflow-y-auto px-4 pb-32 pt-4"
          >
            {/* Name */}
            <FormField
              control={methods.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-xs">
                    <HoverCard openDelay={100} closeDelay={100}>
                      <HoverCardTrigger asChild className="hover:border-none">
                        <Info className="mr-1 size-3 stroke-muted-foreground" />
                      </HoverCardTrigger>
                      <HoverCardContent
                        className="w-[300px] p-3 font-mono text-xs tracking-tight"
                        side="left"
                        sideOffset={20}
                      >
                        <div className="w-full space-y-4">
                          <div className="flex w-full items-center justify-between text-muted-foreground">
                            <span className="font-mono text-sm font-semibold">
                              工作流名称
                            </span>
                          </div>
                          <span className="text-muted-foreground">
                            便于识别的工作流名称，至少 3 个字符且少于 100
                            个字符。
                          </span>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                    <span>名称</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="text-xs"
                      placeholder={"为工作流命名…"}
                      {...field}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Alias */}
            <FormField
              control={methods.control}
              name="alias"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel className="flex items-center text-xs">
                      <HoverCard openDelay={100} closeDelay={100}>
                        <HoverCardTrigger asChild className="hover:border-none">
                          <Info className="mr-1 size-3 stroke-muted-foreground" />
                        </HoverCardTrigger>
                        <HoverCardContent
                          className="w-[300px] p-3 font-mono text-xs tracking-tight"
                          side="left"
                          sideOffset={20}
                        >
                          <div className="w-full space-y-4">
                            <div className="flex w-full items-center justify-between text-muted-foreground">
                              <span className="font-mono text-sm font-semibold">
                                工作流别名
                              </span>
                              <span className="text-xs text-muted-foreground/80">
                                （可选）
                              </span>
                            </div>
                            <span className="text-muted-foreground">
                              可代替工作流 ID
                              使用的唯一标识，在当前工作空间内必须唯一。
                            </span>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                      <span>别名</span>
                    </FormLabel>
                    {field.value && (
                      <CopyButton
                        value={field.value}
                        toastMessage="已将工作流别名复制到剪贴板"
                      />
                    )}
                  </div>
                  <FormControl>
                    <Input
                      className="text-xs"
                      placeholder={"此工作流的唯一标识"}
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error handler */}
            <FormField
              control={methods.control}
              name="error_handler"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel className="flex items-center text-xs">
                      <HoverCard openDelay={100} closeDelay={100}>
                        <HoverCardTrigger asChild className="hover:border-none">
                          <Info className="mr-1 size-3 stroke-muted-foreground" />
                        </HoverCardTrigger>
                        <HoverCardContent
                          className="w-[300px] p-3 font-mono text-xs tracking-tight"
                          side="left"
                          sideOffset={20}
                        >
                          <div className="w-full space-y-4">
                            <div className="flex w-full items-center justify-between text-muted-foreground">
                              <span className="font-mono text-sm font-semibold">
                                错误处理工作流
                              </span>
                              <span className="text-xs text-muted-foreground/80">
                                （可选）
                              </span>
                            </div>
                            <span className="text-muted-foreground">
                              此工作流出错时要运行的另一个工作流的 ID 或别名。
                            </span>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                      <span>错误处理工作流</span>
                    </FormLabel>
                    {field.value && (
                      <CopyButton
                        value={field.value}
                        toastMessage="已将错误处理工作流复制到剪贴板"
                      />
                    )}
                  </div>
                  <FormControl>
                    <Input
                      className="text-xs"
                      placeholder={"发生错误时运行的工作流。"}
                      {...field}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tunnel */}
            <FormField
              name="tunnel"
              control={methods.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">默认隧道</FormLabel>
                  <FormControl>
                    <TunnelSelect
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value)
                        void methods.handleSubmit(onSubmit)()
                      }}
                      noneLabel="无隧道"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    所有动作的 HTTP(S) 流量默认通过此隧道路由，动作可自行覆盖。
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Environment */}
            <FormField
              name="environment"
              control={methods.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-xs">
                    <HoverCard openDelay={100} closeDelay={100}>
                      <HoverCardTrigger asChild className="hover:border-none">
                        <Info className="mr-1 size-3 stroke-muted-foreground" />
                      </HoverCardTrigger>
                      <HoverCardContent
                        className="w-[300px] p-3 font-mono text-xs tracking-tight"
                        side="left"
                        sideOffset={20}
                      >
                        <div className="w-full space-y-4">
                          <div className="flex w-full items-center justify-between text-muted-foreground">
                            <span className="font-mono text-sm font-semibold">
                              环境
                            </span>
                            <span className="text-xs text-muted-foreground/80">
                              （可选）
                            </span>
                          </div>
                          <span className="text-muted-foreground">
                            工作流的目标执行环境，默认为“default”。
                          </span>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                    <span>环境</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="text-xs"
                      placeholder="default"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Timeout */}
            <FormField
              name="timeout"
              control={methods.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-xs">
                    <HoverCard openDelay={100} closeDelay={100}>
                      <HoverCardTrigger asChild className="hover:border-none">
                        <Info className="mr-1 size-3 stroke-muted-foreground" />
                      </HoverCardTrigger>
                      <HoverCardContent
                        className="w-[300px] p-3 font-mono text-xs tracking-tight"
                        side="left"
                        sideOffset={20}
                      >
                        <div className="w-full space-y-4">
                          <div className="flex w-full items-center justify-between text-muted-foreground">
                            <span className="font-mono text-sm font-semibold">
                              超时时间
                            </span>
                            <span className="text-xs text-muted-foreground/80">
                              （可选）
                            </span>
                          </div>
                          <span className="text-muted-foreground">
                            等待工作流完成的最长秒数。设为 0 时不超时，默认为
                            0（不限制）。
                          </span>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                    <span>超时时间（秒）</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      className="text-xs"
                      placeholder={"0（不限制）"}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Input schema */}
            <FormItem>
              <FormLabel className="flex items-center text-xs">
                <HoverCard openDelay={100} closeDelay={100}>
                  <HoverCardTrigger asChild className="hover:border-none">
                    <Info className="mr-1 size-3 stroke-muted-foreground" />
                  </HoverCardTrigger>
                  <HoverCardContent
                    className="w-[300px] p-3 font-mono text-xs tracking-tight"
                    side="left"
                    sideOffset={20}
                  >
                    <WorkflowInputSchemaTooltip />
                  </HoverCardContent>
                </HoverCard>
                <span>输入结构</span>
              </FormLabel>
              <ControlledYamlField fieldName="expects" hideType />
            </FormItem>

            {/* Output schema */}
            <FormItem>
              <FormLabel className="flex items-center text-xs">
                <HoverCard openDelay={100} closeDelay={100}>
                  <HoverCardTrigger asChild className="hover:border-none">
                    <Info className="mr-1 size-3 stroke-muted-foreground" />
                  </HoverCardTrigger>
                  <HoverCardContent
                    className="w-[300px] p-3 font-mono text-xs tracking-tight"
                    side="left"
                    sideOffset={20}
                  >
                    <WorkflowReturnValueTooltip />
                  </HoverCardContent>
                </HoverCard>
                <span>输出结构</span>
              </FormLabel>
              <ControlledYamlField fieldName="returns" hideType />
            </FormItem>
          </ReadOnlyFieldset>
        </form>
      </Form>
    </div>
  )
}

function WorkflowReadmePanel({
  workflow,
}: {
  workflow: WorkflowRead
}): React.JSX.Element {
  const { updateWorkflow, isReadOnly } = useWorkflow()
  const [value, setValue] = useState(workflow.description ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const savedValueRef = useRef(workflow.description ?? "")
  const containerRef = useRef<HTMLDivElement>(null)
  const isTooLong = value.length > 1000

  useEffect(() => {
    const nextValue = workflow.description ?? ""
    const previousValue = savedValueRef.current
    savedValueRef.current = nextValue
    setValue((current) => (current === previousValue ? nextValue : current))
  }, [workflow.description, workflow.id])

  const persistReadme = useCallback(async () => {
    if (isSaving || isReadOnly) {
      return
    }

    const nextValue = value ?? ""
    if (nextValue === savedValueRef.current) {
      return
    }

    if (isTooLong) {
      return
    }

    const result = workflowReadmeSchema.safeParse(nextValue)
    if (!result.success) {
      return
    }

    setIsSaving(true)
    try {
      await updateWorkflow({ description: result.data })
      savedValueRef.current = result.data
    } finally {
      setIsSaving(false)
    }
  }, [isReadOnly, isSaving, isTooLong, updateWorkflow, value])

  const handleContainerBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const container = containerRef.current
      const nextTarget = event.relatedTarget as Node | null
      if (!container || !nextTarget || !container.contains(nextTarget)) {
        void persistReadme()
      }
    },
    [persistReadme]
  )

  const toolbarStatus = isTooLong ? (
    <span className="text-xs text-destructive">最多 1000 个字符</span>
  ) : isSaving ? (
    <span className="text-xs text-muted-foreground">保存中…</span>
  ) : null

  return (
    <div
      ref={containerRef}
      onBlur={handleContainerBlur}
      className="flex h-full flex-col overflow-auto p-4"
    >
      <div className="mb-4 space-y-1">
        <h4 className="text-xs text-muted-foreground">编辑工作流描述</h4>
      </div>
      <ReadOnlyFieldset
        readOnly={isReadOnly}
        className="min-h-[300px] flex-1 rounded-md border border-input bg-background [&_.simple-editor-content_.tiptap.ProseMirror.simple-editor]:p-3"
      >
        <SimpleEditor
          value={value}
          editable={!isReadOnly}
          onChange={setValue}
          onSave={() => void persistReadme()}
          placeholder={"在此输入 Markdown，开始编写 README。"}
          toolbarStatus={toolbarStatus}
          className="h-full"
          style={{ height: "100%" }}
        />
      </ReadOnlyFieldset>
    </div>
  )
}

function WorkflowReturnValueTooltip() {
  return (
    <div className="flex w-full flex-col space-y-4">
      <div className="flex w-full items-center justify-between text-muted-foreground">
        <span className="font-mono text-sm font-semibold">输出结构</span>
        <span className="text-xs text-muted-foreground/80">（可选）</span>
      </div>
      <span className="w-full text-muted-foreground">
        定义工作流返回的数据，支持静态值和表达式。使用表达式引用特定动作的输出。
      </span>
      <span className="w-full text-muted-foreground">表达式用法示例：</span>
      <div className="rounded-md border bg-muted-foreground/10 p-2">
        <pre className="text-xs text-foreground/70">
          {"${{ ACTIONS.my_action.result }}"}
        </pre>
      </div>
    </div>
  )
}

const exampleExpects = `\
my_param:
  type: str
  description: This is a string
  default: My default value

my_list:
  type: list[int]
  description: This is a list of integers without a default value

my_union:
  type: str | int | None
  description: This is a union of a string, an integer, and None
`
function WorkflowInputSchemaTooltip() {
  return (
    <div className="flex w-full flex-col space-y-4">
      <div className="flex w-full items-center justify-between text-muted-foreground">
        <span className="font-mono text-sm font-semibold">输入结构</span>
        <span className="text-xs text-muted-foreground/80">（可选）</span>
      </div>
      <span className="w-full text-muted-foreground">
        定义工作流输入结构，用于校验传入工作流的触发器输入。
      </span>
      <span className="w-full text-muted-foreground">
        提供默认值后，该字段将变为可选。
      </span>
      <span className="w-full text-muted-foreground">用法示例：</span>
      <div className="rounded-md border bg-muted-foreground/10 p-2">
        <pre className="text-wrap text-xs text-foreground/70">
          {exampleExpects}
        </pre>
      </div>
    </div>
  )
}
