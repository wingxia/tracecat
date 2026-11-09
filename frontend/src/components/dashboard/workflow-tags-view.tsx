"use client"

import { TagIcon } from "lucide-react"
import type { TagUpdate } from "@/client"
import { WorkflowTagsTable } from "@/components/dashboard/workflow-tags-table"
import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useWorkspaceDetails } from "@/hooks/use-workspace"
import { useWorkflowTags } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

export function WorkflowTagsView() {
  const workspaceId = useWorkspaceId()
  const { workspace, workspaceLoading, workspaceError } = useWorkspaceDetails()

  const {
    tags,
    tagsIsLoading,
    tagsError,
    deleteTag,
    deleteTagIsPending,
    updateTag,
    updateTagIsPending,
  } = useWorkflowTags(workspaceId)

  const handleDeleteTag = async (tagId: string) => {
    await deleteTag({ tagId, workspaceId })
  }

  const handleUpdateTag = async (tagId: string, params: TagUpdate) => {
    await updateTag({
      tagId,
      workspaceId,
      requestBody: params,
    })
  }

  if (workspaceLoading || tagsIsLoading) {
    return <CenteredSpinner />
  }

  if (workspaceError) {
    return (
      <AlertNotification level="error" message={"加载工作空间信息出错。"} />
    )
  }

  if (!workspace) {
    return <AlertNotification level="error" message={"未找到工作空间。"} />
  }

  if (tagsError) {
    return (
      <AlertNotification
        level="error"
        message={`加载标签出错：${tagsError.message}`}
      />
    )
  }

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-8 py-8">
        {!tags || tags.length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TagIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>尚未定义标签</EmptyTitle>
              <EmptyDescription>使用顶部按钮添加第一个标签</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-4">
            <WorkflowTagsTable
              tags={tags}
              onDeleteTag={handleDeleteTag}
              onUpdateTag={handleUpdateTag}
              isDeleting={deleteTagIsPending}
              isUpdating={updateTagIsPending}
            />
          </div>
        )}
      </div>
    </div>
  )
}
