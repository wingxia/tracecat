"use client"

import { ArrowUpRight, PlayIcon } from "lucide-react"
import Link from "next/link"
import { useCallback, useMemo } from "react"
import type { ApiError, CaseRead, WorkflowRead } from "@/client"
import { workflowsGetWorkflow } from "@/client"
import {
  TRIGGER_SCROLL_AREA_CLASS,
  type TriggerFormValues,
  WorkflowTriggerForm,
} from "@/components/cases/workflow-trigger-form"
import { JsonViewWithControls } from "@/components/json-viewer"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { TooltipProvider } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { useWorkflowTriggerInputs } from "@/hooks/use-workflow-trigger-inputs"
import { useCreateManualWorkflowExecution } from "@/lib/hooks"
import { useQuery } from "@/lib/query"
import type { TracecatJsonSchema } from "@/lib/schema"
import { cn } from "@/lib/utils"
import { useWorkspaceId } from "@/providers/workspace-id"

type WorkflowWithSchema = WorkflowRead & {
  expects_schema?: TracecatJsonSchema | null
}

interface WorkflowTriggerDialogProps {
  caseData: CaseRead
  workflowId: string | null
  workflowTitle?: string | null
  defaultTriggerValues?: Record<string, unknown> | null
  taskId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkflowTriggerDialog({
  caseData,
  workflowId,
  workflowTitle,
  defaultTriggerValues,
  taskId,
  open,
  onOpenChange,
}: WorkflowTriggerDialogProps) {
  const workspaceId = useWorkspaceId()

  const { createExecution, createExecutionIsPending } =
    useCreateManualWorkflowExecution(workflowId || "")

  const {
    caseFieldDisplayNameById,
    caseFieldsRecord,
    fallbackInputs,
    groupCaseFields,
    setGroupCaseFields,
  } = useWorkflowTriggerInputs(caseData, taskId)

  const { data: selectedWorkflowDetail } = useQuery<
    WorkflowWithSchema | null,
    ApiError
  >({
    enabled: Boolean(workspaceId && workflowId),
    queryKey: ["workflow-detail", workflowId],
    queryFn: async ({ queryKey }) => {
      if (!workspaceId) {
        return null
      }
      const queriedWorkflowId = queryKey[1] as string | null
      if (!queriedWorkflowId) {
        return null
      }
      const workflowDetail = await workflowsGetWorkflow({
        workspaceId,
        workflowId: queriedWorkflowId,
      })
      return workflowDetail as WorkflowWithSchema
    },
  })

  const triggerSchema = useMemo<TracecatJsonSchema | null>(() => {
    const schema = selectedWorkflowDetail?.expects_schema
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
      return null
    }
    if ("type" in schema && schema.type !== "object") {
      return null
    }
    return schema as TracecatJsonSchema
  }, [selectedWorkflowDetail])

  const effectiveGroupCaseFields = triggerSchema ? false : groupCaseFields

  const selectedWorkflowUrl =
    workspaceId && workflowId
      ? `/workspaces/${workspaceId}/workflows/${workflowId}`
      : null

  const selectedWorkflowName =
    selectedWorkflowDetail?.title ?? workflowTitle ?? "此工作流"

  const withTaskContextInputs = useCallback(
    (values: Record<string, unknown>) => ({
      ...values,
      case_id: caseData.id,
      ...(taskId ? { task_id: taskId } : {}),
    }),
    [caseData.id, taskId]
  )

  const showExecutionStartedToast = useCallback(() => {
    if (!workflowId || !selectedWorkflowUrl) {
      return
    }
    toast({
      title: "工作流已开始运行",
      description: (
        <Link
          href={selectedWorkflowUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="flex items-center space-x-1">
            <ArrowUpRight className="size-3" />
            <span>查看工作流运行记录</span>
          </div>
        </Link>
      ),
    })
  }, [selectedWorkflowUrl, workflowId])

  const handleSchemaSubmit = useCallback(
    async (values: TriggerFormValues) => {
      if (!workflowId) return
      await createExecution({
        workflow_id: workflowId,
        inputs: withTaskContextInputs(values),
        case_task_id: taskId ?? null,
      })
      showExecutionStartedToast()
      onOpenChange(false)
    },
    [
      createExecution,
      onOpenChange,
      showExecutionStartedToast,
      withTaskContextInputs,
      workflowId,
    ]
  )

  const handleTriggerWithoutSchema = useCallback(async () => {
    if (!workflowId) return
    await createExecution({
      workflow_id: workflowId,
      inputs: withTaskContextInputs(fallbackInputs),
      case_task_id: taskId ?? null,
    })
    showExecutionStartedToast()
    onOpenChange(false)
  }, [
    createExecution,
    fallbackInputs,
    onOpenChange,
    showExecutionStartedToast,
    withTaskContextInputs,
    workflowId,
  ])

  if (!workflowId) {
    return null
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flex max-h-[85vh] max-w-md flex-col overflow-hidden [overflow-wrap:anywhere]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm">
            {triggerSchema ? "配置工作流输入" : "确认触发工作流"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {triggerSchema
              ? `提供“${selectedWorkflowName}”所需的输入。可用的默认值会从事件数据中填充。`
              : `确定使用以下输入触发“${selectedWorkflowName}”吗？`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {triggerSchema ? (
          <WorkflowTriggerForm
            schema={triggerSchema}
            caseId={caseData.id}
            caseFields={caseFieldsRecord}
            caseFieldDisplayNameById={caseFieldDisplayNameById}
            groupCaseFields={effectiveGroupCaseFields}
            defaultTriggerValues={defaultTriggerValues}
            taskId={taskId}
            onSubmit={handleSchemaSubmit}
            isSubmitting={createExecutionIsPending}
          />
        ) : (
          <>
            <ScrollArea className={cn(TRIGGER_SCROLL_AREA_CLASS, "mt-4")}>
              <div className="space-y-3 pr-3">
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <div className="space-y-1 text-xs">
                    <div className="font-medium">分组事件字段</div>
                    <p className="text-[11px] text-muted-foreground">
                      将事件数据放入单个 <code>case_fields</code> 对象中发送。
                    </p>
                  </div>
                  <Switch
                    checked={groupCaseFields}
                    onCheckedChange={(value) => setGroupCaseFields(value)}
                    className="h-4 w-8"
                  />
                </div>
                <TooltipProvider>
                  <JsonViewWithControls
                    src={fallbackInputs}
                    showControls={false}
                    defaultExpanded
                  />
                </TooltipProvider>
              </div>
            </ScrollArea>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs">取消</AlertDialogCancel>
              <Button
                type="button"
                onClick={handleTriggerWithoutSchema}
                className="text-xs"
                disabled={createExecutionIsPending}
              >
                <PlayIcon className="mr-1.5 h-3 w-3" />
                触发器
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
