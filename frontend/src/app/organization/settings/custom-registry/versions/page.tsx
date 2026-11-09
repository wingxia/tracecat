"use client"

import { ArrowUpRight } from "lucide-react"
import { EntitlementRequiredEmptyState } from "@/components/entitlement-required-empty-state"
import { CenteredSpinner } from "@/components/loading/spinner"
import {
  OrgRegistryVersions,
  OrgRegistryVersionsShell,
} from "@/components/organization/org-registry-versions"
import { Button } from "@/components/ui/button"
import { useEntitlements } from "@/hooks/use-entitlements"

export default function CustomRegistryVersionsPage() {
  const { hasEntitlement, isLoading } = useEntitlements()
  const customRegistryEnabled = hasEntitlement("custom_registry")

  if (isLoading) return <CenteredSpinner />

  if (!customRegistryEnabled) {
    return (
      <OrgRegistryVersionsShell>
        <div className="flex flex-1 items-center justify-center pb-8">
          <EntitlementRequiredEmptyState
            title={"需要升级"}
            description={"当前套餐不支持自定义注册表版本。"}
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
      </OrgRegistryVersionsShell>
    )
  }

  return <OrgRegistryVersions />
}
