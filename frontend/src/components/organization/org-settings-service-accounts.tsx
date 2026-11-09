"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { serviceAccountsListOrganizationServiceAccountApiKeys } from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { EntitlementRequiredEmptyState } from "@/components/entitlement-required-empty-state"
import { AlertNotification } from "@/components/notifications"
import { ServiceAccountsManager } from "@/components/organization/service-accounts-manager"
import { useEntitlements } from "@/hooks/use-entitlements"
import {
  useOrganizationServiceAccountScopes,
  useOrganizationServiceAccounts,
} from "@/hooks/use-service-accounts"

const CREATE_SERVICE_ACCOUNT_PARAM = "createServiceAccount"

export function OrgSettingsServiceAccounts() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const canCreate = useScopeCheck("org:service_account:create")
  const canUpdate = useScopeCheck("org:service_account:update")
  const canDisable = useScopeCheck("org:service_account:disable")
  const { hasEntitlement, isLoading: entitlementsLoading } = useEntitlements()
  const serviceAccountsEnabled = hasEntitlement("service_accounts")
  const {
    scopes,
    isLoading: scopesLoading,
    error: scopesError,
  } = useOrganizationServiceAccountScopes({
    enabled: serviceAccountsEnabled,
  })
  const {
    serviceAccounts,
    nextCursor,
    isLoading,
    error,
    createServiceAccount,
    createPending,
    updateServiceAccount,
    updatePending,
    disableServiceAccount,
    disablePending,
    enableServiceAccount,
    enablePending,
    issueApiKey,
    issueApiKeyPending,
    revokeApiKey,
    revokeApiKeyPending,
  } = useOrganizationServiceAccounts({
    enabled: serviceAccountsEnabled,
  })

  const handleCreateSignalConsumed = useCallback(() => {
    if (!pathname || !searchParams?.get(CREATE_SERVICE_ACCOUNT_PARAM)) {
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.delete(CREATE_SERVICE_ACCOUNT_PARAM)
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  if (scopesError) {
    return (
      <AlertNotification
        level="error"
        message={`加载权限范围出错：${scopesError.message}`}
      />
    )
  }
  if (entitlementsLoading) {
    return null
  }
  if (!serviceAccountsEnabled) {
    return (
      <EntitlementRequiredEmptyState
        title={"服务账号不可用"}
        description={"此组织未启用服务账号访问。"}
      />
    )
  }

  return (
    <ServiceAccountsManager
      kindLabel={"组织"}
      serviceAccounts={serviceAccounts}
      nextCursor={nextCursor}
      isLoading={isLoading || scopesLoading}
      error={error}
      availableScopes={scopes}
      createPending={createPending}
      updatePending={updatePending}
      disablePending={disablePending}
      enablePending={enablePending}
      issueApiKeyPending={issueApiKeyPending}
      revokeApiKeyPending={revokeApiKeyPending}
      apiKeysQueryKeyPrefix={["organization-service-accounts"]}
      canCreate={canCreate === true}
      canUpdate={canUpdate === true}
      canDisable={canDisable === true}
      openCreateSignal={searchParams?.get(CREATE_SERVICE_ACCOUNT_PARAM)}
      onCreateSignalConsumed={handleCreateSignalConsumed}
      onCreate={createServiceAccount}
      onUpdate={updateServiceAccount}
      onDisable={disableServiceAccount}
      onEnable={enableServiceAccount}
      onIssueApiKey={issueApiKey}
      onRevokeApiKey={revokeApiKey}
      listApiKeys={async (serviceAccountId) =>
        await serviceAccountsListOrganizationServiceAccountApiKeys({
          serviceAccountId,
          limit: 100,
        })
      }
    />
  )
}
