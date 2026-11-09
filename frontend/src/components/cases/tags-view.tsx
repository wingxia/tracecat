"use client"

import { TagIcon } from "lucide-react"
import type { TagUpdate } from "@/client"
import { TagsTable } from "@/components/cases/tags-table"
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
import { useCaseTagCatalog } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

export function TagsView() {
  const workspaceId = useWorkspaceId()
  const { workspace, workspaceLoading, workspaceError } = useWorkspaceDetails()

  const {
    caseTags,
    caseTagsIsLoading,
    caseTagsError,
    deleteCaseTag,
    deleteCaseTagIsPending,
    updateCaseTag,
    updateCaseTagIsPending,
  } = useCaseTagCatalog(workspaceId)

  const handleDeleteTag = async (tagId: string) => {
    await deleteCaseTag({ tagId, workspaceId })
  }

  const handleUpdateTag = async (tagId: string, params: TagUpdate) => {
    await updateCaseTag({
      tagId,
      workspaceId,
      requestBody: params,
    })
  }

  if (workspaceLoading || caseTagsIsLoading) {
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

  if (caseTagsError) {
    return (
      <AlertNotification
        level="error"
        message={`加载标签出错：${caseTagsError.message}`}
      />
    )
  }

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-8 py-8">
        {!caseTags || caseTags.length === 0 ? (
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
            <TagsTable
              tags={caseTags}
              onDeleteTag={handleDeleteTag}
              onUpdateTag={handleUpdateTag}
              isDeleting={deleteCaseTagIsPending}
              isUpdating={updateCaseTagIsPending}
            />
          </div>
        )}
      </div>
    </div>
  )
}
