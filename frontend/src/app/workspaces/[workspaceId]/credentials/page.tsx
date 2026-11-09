"use client"

import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import { WorkspaceCredentialsInventory } from "@/components/workspaces/workspace-credentials-inventory"
import { useWorkspaceDetails } from "@/hooks/use-workspace"

export default function WorkspaceCredentialsPage() {
  const { workspace, workspaceLoading, workspaceError } = useWorkspaceDetails()
  if (workspaceLoading) {
    return <CenteredSpinner />
  }
  if (workspaceError) {
    return (
      <div className="size-full overflow-auto">
        <div className="container flex h-full flex-col space-y-12 py-8">
          <AlertNotification level="error" message={"加载工作空间信息出错。"} />
        </div>
      </div>
    )
  }
  if (!workspace) {
    return (
      <div className="size-full overflow-auto">
        <div className="container flex h-full flex-col space-y-12 py-8">
          <AlertNotification level="error" message={"未找到工作空间。"} />
        </div>
      </div>
    )
  }
  return (
    <div className="size-full overflow-auto">
      <div className="flex h-full flex-col">
        <WorkspaceCredentialsInventory />
      </div>
    </div>
  )
}
