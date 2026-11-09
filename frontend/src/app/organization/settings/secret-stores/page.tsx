"use client"

import { ArrowUpRight } from "lucide-react"

import { ScopeGuard } from "@/components/auth/scope-guard"
import { EntitlementRequiredEmptyState } from "@/components/entitlement-required-empty-state"
import { CenteredSpinner } from "@/components/loading/spinner"
import { OrgSettingsSecretStores } from "@/components/organization/org-settings-secret-stores"
import { Button } from "@/components/ui/button"
import { useEntitlements } from "@/hooks/use-entitlements"

export default function SecretStoresSettingsPage() {
  const { hasEntitlement, isLoading } = useEntitlements()

  if (isLoading) {
    return <CenteredSpinner />
  }

  return (
    <ScopeGuard
      scope="org:secret:read"
      fallback={<p>你没有查看密钥存储的权限。</p>}
    >
      <div className="size-full overflow-auto">
        <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
          <div className="flex w-full">
            <div className="items-start space-y-3 text-left">
              <h2 className="text-2xl font-semibold tracking-tight">
                密钥存储
              </h2>
              <p className="text-base text-muted-foreground">
                允许工作空间引用外部密钥管理器中的密钥。
              </p>
            </div>
          </div>
          {hasEntitlement("external_secret_stores") ? (
            <OrgSettingsSecretStores />
          ) : (
            <div className="flex flex-1 items-center justify-center pb-8">
              <EntitlementRequiredEmptyState
                title={"需要升级"}
                description={"当前套餐不支持外部密钥存储。"}
              >
                <Button
                  variant="link"
                  asChild
                  className="text-muted-foreground"
                  size="sm"
                >
                  <a
                    href="https://tracecat.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    了解更多 <ArrowUpRight className="size-4" />
                  </a>
                </Button>
              </EntitlementRequiredEmptyState>
            </div>
          )}
        </div>
      </div>
    </ScopeGuard>
  )
}
