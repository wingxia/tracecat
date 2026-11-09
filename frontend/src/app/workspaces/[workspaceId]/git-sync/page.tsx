"use client"

import { AlertTriangleIcon, ArrowUpRight } from "lucide-react"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { EntitlementRequiredEmptyState } from "@/components/entitlement-required-empty-state"
import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import { Button } from "@/components/ui/button"
import {
  GitSyncHeader,
  GitSyncView,
} from "@/components/workspace-sync/git-sync-view"
import { useEntitlements } from "@/hooks/use-entitlements"
import { useWorkspaceDetails } from "@/hooks/use-workspace"

export default function WorkspaceGitSyncPage() {
  const { workspace, workspaceLoading, workspaceError } = useWorkspaceDetails()
  const {
    hasEntitlement,
    hasEntitlementData,
    isLoading: entitlementsLoading,
  } = useEntitlements()
  const canSyncWorkspace = useScopeCheck("workspace_sync:sync")
  // Matches the connection's former settings gate and the workspace update API.
  const canManageConnection = useScopeCheck("workspace:update")

  if (
    workspaceLoading ||
    entitlementsLoading ||
    canSyncWorkspace === undefined ||
    canManageConnection === undefined
  ) {
    return <CenteredSpinner />
  }
  if (workspaceError || !workspace) {
    return (
      <div className="container py-8">
        <AlertNotification level="error" message={"加载工作空间信息出错。"} />
      </div>
    )
  }
  // A failed plan lookup is not a missing plan; don't show the upgrade state.
  if (!hasEntitlementData) {
    return (
      <div className="flex h-full flex-col">
        <GitSyncHeader workspaceName={workspace.name} />
        <div className="flex flex-1 items-center justify-center">
          <EntitlementRequiredEmptyState
            icon={<AlertTriangleIcon className="size-6" />}
            title={"无法检查套餐权限"}
            description={"请重新加载页面后重试。"}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              重新加载
            </Button>
          </EntitlementRequiredEmptyState>
        </div>
      </div>
    )
  }
  if (!hasEntitlement("git_sync")) {
    return (
      <div className="flex h-full flex-col">
        <GitSyncHeader workspaceName={workspace.name} />
        <div className="flex flex-1 items-center justify-center">
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
      </div>
    )
  }
  if (!canSyncWorkspace && !canManageConnection) {
    return (
      <div className="flex h-full flex-col">
        <GitSyncHeader workspaceName={workspace.name} />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          你没有同步此工作空间的权限。
        </div>
      </div>
    )
  }
  return (
    <GitSyncView
      workspace={workspace}
      canSync={canSyncWorkspace}
      canManageConnection={canManageConnection}
    />
  )
}
