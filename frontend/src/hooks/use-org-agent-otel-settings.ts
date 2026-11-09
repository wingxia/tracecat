"use client"

import {
  type AgentOtelSettingsRead,
  type SettingsUpdateAgentOtelSettingsData,
  settingsGetAgentOtelSettings,
  settingsUpdateAgentOtelSettings,
} from "@/client"
import { toast } from "@/components/ui/use-toast"
import { getApiErrorDetail, type TracecatApiError } from "@/lib/errors"
import { useMutation, useQuery, useQueryClient } from "@/lib/query"

/** Load and update organization-scoped agent telemetry settings. */
export function useOrgAgentOtelSettings() {
  const queryClient = useQueryClient()
  const {
    data: agentOtelSettings,
    isLoading: agentOtelSettingsIsLoading,
    error: agentOtelSettingsError,
  } = useQuery<AgentOtelSettingsRead>({
    queryKey: ["org-agent-otel-settings"],
    queryFn: async () => await settingsGetAgentOtelSettings(),
  })

  const {
    mutateAsync: updateAgentOtelSettings,
    isPending: updateAgentOtelSettingsIsPending,
    error: updateAgentOtelSettingsError,
  } = useMutation({
    mutationFn: async (params: SettingsUpdateAgentOtelSettingsData) =>
      await settingsUpdateAgentOtelSettings(params),
    onSuccess: async () => {
      // Await the refetch so isPending spans it; the settings form stays
      // disabled until the seeding effect has re-run with fresh data.
      await queryClient.invalidateQueries({
        queryKey: ["org-agent-otel-settings"],
      })
      toast({
        title: "已更新智能体遥测",
        description: "智能体遥测设置更新成功。",
      })
    },
    onError: (error: TracecatApiError) => {
      switch (error.status) {
        case 403:
          toast({
            title: "禁止访问",
            description: "你无法执行此操作",
          })
          break
        default:
          console.error("Failed to update agent telemetry settings", {
            status: error.status,
            detail: getApiErrorDetail(error),
          })
          toast({
            title: "更新智能体遥测失败",
            description: `更新智能体遥测设置时出错：${getApiErrorDetail(error) ?? "未知错误"}`,
          })
      }
    },
  })

  return {
    agentOtelSettings,
    agentOtelSettingsIsLoading,
    agentOtelSettingsError,
    updateAgentOtelSettings,
    updateAgentOtelSettingsIsPending,
    updateAgentOtelSettingsError,
  }
}
