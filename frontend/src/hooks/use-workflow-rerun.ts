import {
  type WorkflowRerunPlan,
  type WorkflowRerunRequest,
  type WorkflowRerunResponse,
  workflowExecutionsPreviewWorkflowExecutionRerun,
  workflowExecutionsRerunWorkflowExecution,
} from "@/client"
import { toast } from "@/components/ui/use-toast"
import { retryHandler, type TracecatApiError } from "@/lib/errors"
import { useMutation, useQuery, useQueryClient } from "@/lib/query"

/**
 * Preview how a past run's successful action results match a rerun target.
 */
export function useWorkflowRerunPreview(
  workspaceId: string,
  executionId: string,
  target: Pick<
    WorkflowRerunRequest,
    "use_draft" | "version" | "rerun_from_ref"
  >,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const { data, isLoading, isPlaceholderData, error } = useQuery<
    WorkflowRerunPlan,
    TracecatApiError
  >({
    queryKey: [
      "workflow-rerun-preview",
      workspaceId,
      executionId,
      target.use_draft,
      target.version ?? null,
      target.rerun_from_ref ?? null,
    ],
    queryFn: async () =>
      await workflowExecutionsPreviewWorkflowExecutionRerun({
        workspaceId,
        executionId,
        requestBody: {
          use_draft: target.use_draft,
          version: target.version ?? null,
          fixed_action_refs: null,
          rerun_from_ref: target.rerun_from_ref ?? null,
        },
      }),
    enabled: enabled && Boolean(workspaceId) && Boolean(executionId),
    retry: retryHandler,
    placeholderData: (previous) => previous,
  })

  return {
    rerunPlan: data,
    rerunPlanIsLoading: isLoading,
    rerunPlanIsStale: isPlaceholderData,
    rerunPlanError: error,
  }
}

/**
 * Rerun a past execution, reusing results of the selected fixed actions.
 */
export function useRerunWorkflowExecution(
  workspaceId: string,
  executionId: string
) {
  const queryClient = useQueryClient()
  const { mutateAsync, isPending } = useMutation<
    WorkflowRerunResponse,
    TracecatApiError,
    WorkflowRerunRequest
  >({
    mutationFn: async (requestBody) =>
      await workflowExecutionsRerunWorkflowExecution({
        workspaceId,
        executionId,
        requestBody,
      }),
    onSuccess: async ({ wf_exec_id, plan }) => {
      toast({
        title: "已开始重新运行",
        description: `已固定 ${plan.fixed_action_refs.length} 个动作。${wf_exec_id}`,
      })
      await queryClient.refetchQueries({
        queryKey: ["last-manual-execution"],
      })
      await queryClient.refetchQueries({
        queryKey: ["compact-workflow-execution", wf_exec_id],
      })
    },
    onError: (error) => {
      const body = error.body as { detail?: unknown } | undefined
      const detail = body?.detail
      let description = "请检查重新运行计划后重试。"
      if (typeof detail === "string") {
        description = detail
      } else if (
        detail &&
        typeof detail === "object" &&
        "message" in detail &&
        typeof detail.message === "string"
      ) {
        description = detail.message
      }
      toast({ title: "无法开始重新运行", description })
    },
  })

  return {
    rerunExecution: mutateAsync,
    rerunExecutionIsPending: isPending,
  }
}
