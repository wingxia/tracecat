"use client"

import { ArrowUpRight, Loader2 } from "lucide-react"
import { workspacesGetWorkspace } from "@/client"
import { EntitlementRequiredEmptyState } from "@/components/entitlement-required-empty-state"
import type { SettingsSection } from "@/components/settings/settings-modal-context"
import { WorkspaceFilesSettings } from "@/components/settings/workspace-files-settings"
import { WorkspaceGeneralSettings } from "@/components/settings/workspace-general-settings"
import { WorkspaceModelSettings } from "@/components/settings/workspace-model-settings"
import { WorkspaceRuntimeSettings } from "@/components/settings/workspace-runtime-settings"
import { Button } from "@/components/ui/button"
import { useEntitlements } from "@/hooks/use-entitlements"
import { useQuery } from "@/lib/query"

interface WorkspaceSettingsContainerProps {
  workspaceId: string
  activeSection: SettingsSection
}

export function WorkspaceSettingsContainer({
  workspaceId,
  activeSection,
}: WorkspaceSettingsContainerProps) {
  const { hasEntitlement, isLoading: entitlementsLoading } = useEntitlements()
  const {
    data: workspace,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => workspacesGetWorkspace({ workspaceId }),
  })

  if (isLoading || entitlementsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !workspace) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        加载工作空间设置失败。
      </div>
    )
  }

  switch (activeSection) {
    case "workspace-general":
      return <WorkspaceGeneralSettings workspace={workspace} />
    case "workspace-runtime":
      return <WorkspaceRuntimeSettings workspace={workspace} />
    case "workspace-models":
      return hasEntitlement("agent_addons") ? (
        <WorkspaceModelSettings workspace={workspace} />
      ) : (
        <div className="flex flex-1 items-center justify-center py-12">
          <EntitlementRequiredEmptyState
            title={"需要升级"}
            description={"当前套餐不支持工作空间 AI 模型子集设置。"}
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
      )
    case "workspace-files":
      return <WorkspaceFilesSettings workspace={workspace} />
    default:
      return null
  }
}
