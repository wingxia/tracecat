"use client"

import type { FolderDirectoryItem } from "@/client"
import { ConfirmDestructiveDialog } from "@/components/confirm-destructive-dialog"
import { useFolders } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

export function getFolderDeleteConfirmPhrase(folderId: string): string {
  return `delete folder ${folderId}`
}

/**
 * Confirmation for deleting a non-empty workflow folder. The folder, its
 * subfolders, and every workflow inside them are deleted. Empty folders are
 * deleted directly from the context menu without this dialog.
 */
export function FolderDeleteAlertDialog({
  open,
  onOpenChange,
  selectedFolder,
  setSelectedFolder,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFolder: FolderDirectoryItem | null
  setSelectedFolder: (selectedFolder: FolderDirectoryItem | null) => void
}) {
  const workspaceId = useWorkspaceId()
  const { deleteFolder, deleteFolderIsPending } = useFolders(workspaceId, {
    enabled: open,
  })
  const folderId = selectedFolder?.id ?? ""
  const numWorkflows = selectedFolder?.num_workflows ?? 0
  const workflowCount = `${numWorkflows} ${numWorkflows === 1 ? "workflow" : "workflows"}`

  return (
    <ConfirmDestructiveDialog
      open={open && selectedFolder !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedFolder(null)
        }
        onOpenChange(isOpen)
      }}
      title={"删除文件夹及内容"}
      description={
        <>
          <p>
            永久删除{" "}
            <span className="font-medium text-foreground">
              {selectedFolder?.name}
            </span>
            、其子文件夹和{" "}
            <span className="font-medium text-foreground">{workflowCount}</span>{" "}
            吗？其中工作流的定时计划也会被删除，此操作无法撤销。
          </p>
          <p>如需保留工作流，请先将其移出文件夹。</p>
        </>
      }
      identifier={{ label: "文件夹 ID", value: folderId }}
      confirmPhrase={getFolderDeleteConfirmPhrase(folderId)}
      confirmPrompt={
        <>
          输入{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs font-medium">
            delete folder
          </code>{" "}
          并在后面输入文件夹 ID 以确认
        </>
      }
      confirmLabel={"继续"}
      finalStep={{
        title: "确定吗？",
        description: (
          <>
            即将删除{" "}
            <span className="font-medium text-foreground">{workflowCount}</span>{" "}
            及其中的所有子文件夹，位置为{" "}
            <span className="font-medium text-foreground">
              {selectedFolder?.name}
            </span>
            。此操作无法撤销。
          </>
        ),
        confirmLabel: numWorkflows > 0 ? `删除 ${workflowCount}` : "删除",
      }}
      isPending={deleteFolderIsPending}
      onConfirm={async () => {
        if (!selectedFolder) return
        await deleteFolder({
          folderId: selectedFolder.id,
          recursive: true,
          deleteWorkflows: true,
        })
        setSelectedFolder(null)
        onOpenChange(false)
      }}
    />
  )
}
