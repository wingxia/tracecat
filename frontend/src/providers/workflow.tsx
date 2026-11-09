"use client"

import type React from "react"
import {
  createContext,
  type ReactNode,
  type SetStateAction,
  useContext,
  useState,
} from "react"
import {
  type ApiError,
  type ValidationResult,
  type WorkflowCommitResponse,
  type WorkflowDslPublish,
  type WorkflowDslPublishResult,
  type WorkflowRead,
  type WorkflowUpdate,
  workflowsCommitWorkflow,
  workflowsGetWorkflow,
  workflowsPublishWorkflow,
  workflowsUpdateWorkflow,
} from "@/client"
import { ToastAction } from "@/components/ui/toast"
import { toast } from "@/components/ui/use-toast"
import {
  ExportErrorMessage,
  getExportError,
} from "@/components/workspace-sync/export-error"
import {
  isPublishRequired,
  PublishFirstDialog,
  type PublishFirstError,
} from "@/components/workspace-sync/publish-first-dialog"
import { useManagedResources } from "@/hooks/use-managed-resources"
import { getApiErrorDetail, type TracecatApiError } from "@/lib/errors"
import {
  type MutateFunction,
  useMutation,
  useQuery,
  useQueryClient,
} from "@/lib/query"

type WorkflowContextType = {
  workflow: WorkflowRead | null
  workspaceId: string
  workflowId: string | null
  isLoading: boolean
  error: Error | null
  commitWorkflow: MutateFunction<
    WorkflowCommitResponse,
    ApiError,
    void,
    unknown
  >
  publishWorkflow: MutateFunction<
    WorkflowDslPublishResult,
    ApiError,
    WorkflowDslPublish,
    unknown
  >
  updateWorkflow: MutateFunction<
    WorkflowRead,
    ApiError,
    WorkflowUpdate,
    unknown
  >
  validationErrors: ValidationResult[] | null
  setValidationErrors: React.Dispatch<SetStateAction<ValidationResult[] | null>>
  /**
   * True when the workflow is managed by Tracecat. Edits, saves, publishes,
   * renames, moves and deletes are locked; runs and schedules stay allowed.
   */
  isReadOnly: boolean
}
type TracecatErrorMessage = {
  type?: string
  message: string
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(
  undefined
)

export function WorkflowProvider({
  workflowId,
  workspaceId,
  children,
}: {
  workflowId: string
  workspaceId: string
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const [validationErrors, setValidationErrors] = useState<
    ValidationResult[] | null
  >(null)
  const [publishRequiredOpen, setPublishRequiredOpen] = useState(false)
  const [publishError, setPublishError] = useState<PublishFirstError | null>(
    null
  )
  const { isManaged } = useManagedResources(workspaceId)
  const isReadOnly = isManaged("workflow", workflowId)

  // Queries
  const {
    data: workflow,
    isLoading,
    error,
  } = useQuery<WorkflowRead | null, ApiError>({
    queryKey: ["workflow", workflowId],
    queryFn: async ({ queryKey }) => {
      const wfId = queryKey[1] as string | null
      if (!wfId) {
        return null
      }
      const workflow = await workflowsGetWorkflow({
        workspaceId,
        workflowId: queryKey[1] as string,
      })
      if (!workflow) {
        return null
      }
      return workflow
    },
  })

  // Mutations
  const { mutateAsync: commitWorkflow, isPending: isCommitting } = useMutation({
    mutationFn: async () =>
      await workflowsCommitWorkflow({ workspaceId, workflowId }),
    onSuccess: (response) => {
      if (response.status === "success") {
        queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] })
        queryClient.invalidateQueries({
          queryKey: ["workflow-definitions", workspaceId, workflowId],
        })
        toast({
          title: "已保存工作流更改",
          description: "新工作流版本保存成功。",
        })
      } else {
        const errorCount = response.errors?.length ?? 1
        toast({
          title: `工作流校验失败，存在 ${errorCount} ${errorCount === 1 ? "个错误" : "个错误"}`,
          description: "请悬停在保存按钮上查看错误。",
        })
      }
    },
    onError: (error: ApiError) => {
      console.warn("Failed to save workflow:", error)
      toast({
        title: "保存工作流出错",
        description:
          (error.body as TracecatErrorMessage | undefined)?.message ||
          "无法保存工作流，请重试。",
        variant: "destructive",
      })
    },
  })

  const { mutateAsync: publishWorkflow } = useMutation({
    mutationFn: async (params: WorkflowDslPublish) =>
      await workflowsPublishWorkflow({
        workspaceId,
        workflowId,
        requestBody: params,
      }),
    onSuccess: (response) => {
      let title = "工作流已提交"
      if (response.status === "no_op") {
        if (response.pr_url && response.pr_reused) {
          title = "无更改（复用 PR）"
        } else if (response.pr_url) {
          title = "无更改（已创建 PR）"
        } else {
          title = "没有可发布的更改"
        }
      } else if (response.pr_url && response.pr_reused) {
        title = "工作流已提交（复用 PR）"
      } else if (response.pr_url) {
        title = "工作流已提交（已创建 PR）"
      }

      toast({
        title,
        description: response.message,
        action: response.pr_url ? (
          <ToastAction
            altText="打开拉取请求"
            onClick={() =>
              window.open(
                response.pr_url ?? "",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            查看拉取请求
          </ToastAction>
        ) : undefined,
      })
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] })
    },
    onError: (error: ApiError) => {
      if (isPublishRequired(error)) {
        setPublishError(null)
        setPublishRequiredOpen(true)
        return
      }
      if (getExportError(error)) {
        toast({
          variant: "destructive",
          title: "发布工作流失败",
          description: (
            <ExportErrorMessage error={error} workspaceId={workspaceId} />
          ),
        })
        return
      }
      const apiError = error as TracecatApiError<string>
      const detail = apiError.body?.detail
      switch (apiError.status) {
        case 400:
          toast({
            title: "发布工作流失败",
            description: detail || "工作流配置无效，请查看日志获取更多详情。",
          })
          break
        case 403:
          toast({
            title: "发布工作流失败",
            description: detail || "你没有发布此工作流的权限。",
          })
          break
        case 404:
          toast({
            title: "未找到工作流定义",
            description: detail || "发布前请先保存工作流。",
          })
          break
        case 409:
          toast({
            title: "发布工作流失败",
            description: detail || "发布工作流时发生冲突，请重试。",
          })
          break
        case 422:
          toast({
            title: "发布工作流失败",
            description: detail || "工作流校验失败，请检查配置。",
          })
          break
        default:
          toast({
            title: "发布工作流失败",
            description: detail || "无法发布工作流，请重试。",
            variant: "destructive",
          })
      }
    },
  })

  const { mutateAsync: updateWorkflow } = useMutation({
    mutationFn: async (values: WorkflowUpdate) =>
      await workflowsUpdateWorkflow({
        workspaceId,
        workflowId,
        requestBody: values,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] })
      // A title change is visible on the dashboard too. Those lists are cached
      // with a 5 minute staleTime and no refetch on focus, so without this the
      // dashboard keeps showing the old name after a rename in the builder.
      queryClient.invalidateQueries({ queryKey: ["workflows"] })
      queryClient.invalidateQueries({ queryKey: ["directory-items"] })
      queryClient.invalidateQueries({
        queryKey: ["agent-preset-workflow-references", workspaceId],
      })
    },
    onError: (error: TracecatApiError) => {
      console.error("Failed to update workflow:", error)
      // `body` is absent on transport failures, and `String(undefined)` is the
      // truthy string "undefined", so read the detail through the safe accessor
      // rather than dereferencing it and defeating the fallbacks below.
      const detail = getApiErrorDetail(error)
      switch (error.status) {
        case 409:
          toast({
            title: "更新工作流失败",
            description: detail ?? "更新工作流时发生冲突，请重试。",
            variant: "destructive",
          })
          break
        default:
          toast({
            title: "更新工作流失败",
            description: detail ?? "无法更新工作流，请查看日志。",
            variant: "destructive",
          })
      }
    },
  })

  async function handlePublishFirst() {
    setPublishError(null)
    try {
      const response = await commitWorkflow()
      if (response.status === "success") {
        setValidationErrors(null)
        setPublishRequiredOpen(false)
      } else {
        setValidationErrors(response.errors || null)
        setPublishError({
          message: "发布前请先修复工作流校验错误。",
          validationErrors: response.errors,
        })
      }
    } catch {
      // The commit mutation also shows the "Error saving workflow" toast.
      setPublishError({
        message: "无法发布此工作流，请重试。",
      })
    }
  }

  return (
    <WorkflowContext.Provider
      value={{
        workspaceId,
        workflow: workflow || null,
        workflowId,
        isLoading,
        error,
        commitWorkflow,
        publishWorkflow,
        updateWorkflow,
        validationErrors,
        setValidationErrors,
        isReadOnly,
      }}
    >
      {children}
      <PublishFirstDialog
        open={publishRequiredOpen}
        onOpenChange={setPublishRequiredOpen}
        onPublish={handlePublishFirst}
        isPublishing={isCommitting}
        publishError={publishError}
      />
    </WorkflowContext.Provider>
  )
}

export const useWorkflow = () => {
  const context = useContext(WorkflowContext)
  if (context === undefined) {
    throw new Error("useWorkflow must be used within a WorkflowProvider")
  }
  return context
}
