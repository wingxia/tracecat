"use client"

import { ArrowUpRight } from "lucide-react"
import { EntitlementRequiredEmptyState } from "@/components/entitlement-required-empty-state"
import { CenteredSpinner } from "@/components/loading/spinner"
import { OrgSettingsCustomRegistryForm } from "@/components/organization/org-settings-custom-registry"
import { Button } from "@/components/ui/button"
import { useEntitlements } from "@/hooks/use-entitlements"

export default function CustomRegistrySettingsPage() {
  const { hasEntitlement, isLoading } = useEntitlements()
  const customRegistryEnabled = hasEntitlement("custom_registry")

  if (isLoading) return <CenteredSpinner />

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">仓库</h2>
            <p className="text-base text-muted-foreground">
              连接托管组织自定义动作的 Git 仓库。
            </p>
          </div>
        </div>

        {customRegistryEnabled ? (
          <OrgSettingsCustomRegistryForm />
        ) : (
          <div className="flex flex-1 items-center justify-center pb-8">
            <EntitlementRequiredEmptyState
              title={"需要升级"}
              description={"当前套餐不支持自定义注册表 Git 设置。"}
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
  )
}
