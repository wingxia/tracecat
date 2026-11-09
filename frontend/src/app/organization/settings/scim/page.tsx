"use client"

import type { ReactNode } from "react"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { EntitlementRequiredEmptyState } from "@/components/entitlement-required-empty-state"
import { CenteredSpinner } from "@/components/loading/spinner"
import {
  OrgSettingsScim,
  ScimPageHeader,
} from "@/components/organization/org-settings-scim"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useEntitlements } from "@/hooks/use-entitlements"

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        {children}
      </div>
    </div>
  )
}

export default function ScimSettingsPage() {
  const { hasEntitlement, hasEntitlementData, isLoading } = useEntitlements()
  const canManage = useScopeCheck("org:scim:manage")

  if (isLoading || canManage === undefined) {
    return (
      <PageShell>
        <ScimPageHeader />
        <CenteredSpinner />
      </PageShell>
    )
  }
  if (!hasEntitlementData) {
    return (
      <PageShell>
        <ScimPageHeader />
        <Alert>
          <AlertTitle>无法检查套餐权限</AlertTitle>
          <AlertDescription>请重新加载页面后重试。</AlertDescription>
          <Button variant="outline" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </Alert>
      </PageShell>
    )
  }
  if (!hasEntitlement("rbac_addons")) {
    return (
      <PageShell>
        <ScimPageHeader />
        <EntitlementRequiredEmptyState
          title={"当前套餐不支持"}
          description={
            "SCIM 用户配置需要访问控制附加服务，请联系 Tracecat 客户团队启用。"
          }
        />
      </PageShell>
    )
  }
  if (!canManage) {
    return (
      <PageShell>
        <ScimPageHeader />
        <EntitlementRequiredEmptyState
          title={"权限不足"}
          description={"你需要管理 SCIM 用户配置的权限。"}
        />
      </PageShell>
    )
  }
  return (
    <PageShell>
      <OrgSettingsScim />
    </PageShell>
  )
}
