"use client"

import {
  type IPAllowlistCheckRequest,
  type IPAllowlistCheckResult,
  type SecuritySettingsRead,
  type SecuritySettingsUpdate,
  settingsCheckIpAllowlist,
  settingsGetSecuritySettings,
  settingsUpdateSecuritySettings,
} from "@/client"
import { toast } from "@/components/ui/use-toast"
import { getApiErrorDetail, type TracecatApiError } from "@/lib/errors"
import { useMutation, useQuery, useQueryClient } from "@/lib/query"

const ORG_SECURITY_SETTINGS_QUERY_KEY = ["org-security-settings"]

/**
 * Read, update, and probe the organization IP allowlist.
 */
export function useOrgSecuritySettings() {
  const queryClient = useQueryClient()

  const {
    data: securitySettings,
    isLoading: securitySettingsIsLoading,
    error: securitySettingsError,
  } = useQuery<SecuritySettingsRead, TracecatApiError>({
    queryKey: ORG_SECURITY_SETTINGS_QUERY_KEY,
    queryFn: async () => await settingsGetSecuritySettings(),
  })

  const {
    mutateAsync: updateSecuritySettings,
    isPending: updateSecuritySettingsIsPending,
  } = useMutation<void, TracecatApiError, SecuritySettingsUpdate>({
    mutationFn: async (requestBody) =>
      await settingsUpdateSecuritySettings({ requestBody }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ORG_SECURITY_SETTINGS_QUERY_KEY,
      })
      toast({
        title: "已更新 IP 白名单",
        description: "已成功保存组织 IP 白名单。",
      })
    },
    onError: (error) => {
      if (error.status === 403) {
        toast({
          title: "禁止访问",
          description: "你无法执行此操作",
        })
        return
      }
      toast({
        title: "更新 IP 白名单失败",
        description: getApiErrorDetail(error) ?? "请重试。",
        variant: "destructive",
      })
    },
  })

  const {
    mutateAsync: checkIpAllowlist,
    isPending: checkIpAllowlistIsPending,
  } = useMutation<
    IPAllowlistCheckResult,
    TracecatApiError,
    IPAllowlistCheckRequest
  >({
    mutationFn: async (requestBody) =>
      await settingsCheckIpAllowlist({ requestBody }),
  })

  return {
    securitySettings,
    securitySettingsIsLoading,
    securitySettingsError,
    updateSecuritySettings,
    updateSecuritySettingsIsPending,
    checkIpAllowlist,
    checkIpAllowlistIsPending,
  }
}
