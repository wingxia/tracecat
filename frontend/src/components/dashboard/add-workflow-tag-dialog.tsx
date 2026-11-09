"use client"

import { CreateTagDialog } from "@/components/tags/create-tag-dialog"
import { useWorkflowTags } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

interface AddWorkflowTagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddWorkflowTagDialog({
  open,
  onOpenChange,
}: AddWorkflowTagDialogProps) {
  const workspaceId = useWorkspaceId()
  const { tags, createTag } = useWorkflowTags(workspaceId, { enabled: open })

  return (
    <CreateTagDialog
      open={open}
      onOpenChange={onOpenChange}
      existingTags={tags}
      onCreateTag={async (params) => {
        await createTag({
          workspaceId,
          requestBody: params,
        })
      }}
      title={"创建标签"}
      description={"输入新工作流标签的名称。"}
    />
  )
}
