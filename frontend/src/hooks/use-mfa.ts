"use client"

import {
  adminGetMfaSettings,
  adminUpdateMfaSettings,
  authDeleteCredential,
  authListCredentials,
  authRegenerateRecoveryCodes,
  type MfaPolicyRead,
  settingsGetMfaPolicy,
  settingsUpdateMfaPolicy,
  type WebAuthnCredentialRead,
} from "@/client"
import { toast } from "@/components/ui/use-toast"
import { getApiErrorDetail, type TracecatApiError } from "@/lib/errors"
import { useMutation, useQuery, useQueryClient } from "@/lib/query"
import { MFA_STATUS_QUERY_KEY } from "@/lib/webauthn"

export const MFA_CREDENTIALS_QUERY_KEY = ["auth", "mfa-credentials"]

/** Read and update the org or platform admin "Require MFA" policy. */
export function useMfaPolicy(scope: "organization" | "platform") {
  const queryClient = useQueryClient()
  const queryKey = ["mfa-policy", scope]
  const { data: policy, isLoading } = useQuery<MfaPolicyRead, TracecatApiError>(
    {
      queryKey,
      queryFn: async () =>
        scope === "platform"
          ? await adminGetMfaSettings()
          : await settingsGetMfaPolicy(),
    }
  )
  const { mutateAsync: updatePolicy, isPending } = useMutation<
    MfaPolicyRead,
    TracecatApiError,
    boolean
  >({
    mutationFn: async (mfaRequired) => {
      const requestBody = { mfa_required: mfaRequired }
      return scope === "platform"
        ? await adminUpdateMfaSettings({ requestBody })
        : await settingsUpdateMfaPolicy({ requestBody })
    },
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result)
      toast({
        title: result.mfa_required ? "已要求多因素认证" : "不再要求多因素认证",
      })
    },
    onError: (error) => {
      toast({
        title: "更新多因素认证策略失败",
        description: getApiErrorDetail(error) ?? "请重试。",
        variant: "destructive",
      })
    },
  })
  return { policy, isLoading, updatePolicy, isPending }
}

/** The signed-in user's security keys and recovery codes. */
export function useSecurityKeys() {
  const queryClient = useQueryClient()
  const { data: credentials, isLoading } = useQuery<
    WebAuthnCredentialRead[],
    TracecatApiError
  >({
    queryKey: MFA_CREDENTIALS_QUERY_KEY,
    queryFn: async () => await authListCredentials(),
  })
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: MFA_CREDENTIALS_QUERY_KEY })
    await queryClient.invalidateQueries({ queryKey: MFA_STATUS_QUERY_KEY })
  }
  const { mutateAsync: deleteCredential, isPending: deletePending } =
    useMutation<void, TracecatApiError, string>({
      mutationFn: async (credentialId) =>
        await authDeleteCredential({ credentialId }),
      onSuccess: async () => {
        await refresh()
        toast({ title: "已移除安全密钥" })
      },
      onError: (error) => {
        toast({
          title: "移除安全密钥失败",
          description: getApiErrorDetail(error) ?? "请重试。",
          variant: "destructive",
        })
      },
    })
  const { mutateAsync: regenerateRecoveryCodes, isPending: regeneratePending } =
    useMutation<string[], TracecatApiError, void>({
      mutationFn: async () =>
        (await authRegenerateRecoveryCodes()).recovery_codes,
      onSuccess: refresh,
      onError: (error) => {
        toast({
          title: "生成恢复码失败",
          description: getApiErrorDetail(error) ?? "请重试。",
          variant: "destructive",
        })
      },
    })
  return {
    credentials,
    isLoading,
    refresh,
    deleteCredential,
    deletePending,
    regenerateRecoveryCodes,
    regeneratePending,
  }
}
