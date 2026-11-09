"use client"

import { ArrowUpRight } from "lucide-react"

import { EntitlementRequiredEmptyState } from "@/components/entitlement-required-empty-state"
import { CenteredSpinner } from "@/components/loading/spinner"
import { OrgVCSSettings } from "@/components/organization/org-vcs-settings"
import { Button } from "@/components/ui/button"
import { useEntitlements } from "@/hooks/use-entitlements"

export default function VCSSettingsPage() {
  const { hasEntitlement, isLoading } = useEntitlements()

  // Show loading while feature flags are being fetched
  if (isLoading) {
    return <CenteredSpinner />
  }

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">Git 同步</h2>
            <p className="text-md text-muted-foreground">
              与私有 Git 仓库双向同步工作流。
            </p>
          </div>
        </div>

        {hasEntitlement("git_sync") ? (
          <OrgVCSSettings />
        ) : (
          <div className="flex flex-1 items-center justify-center pb-8">
            <EntitlementRequiredEmptyState
              title={"需要升级"}
              description={"当前套餐不支持 Git 同步。"}
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
