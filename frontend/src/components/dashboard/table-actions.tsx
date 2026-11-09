"use client"

import {
  Copy,
  CopyPlus,
  DownloadIcon,
  ExternalLink,
  FolderKanban,
  FolderUp,
  Pencil,
  TagsIcon,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import type {
  FolderDirectoryItem,
  TagRead,
  WorkflowDirectoryItem,
  WorkflowReadMinimal,
} from "@/client"
import { DeleteWorkflowAlertDialogTrigger } from "@/components/dashboard/delete-workflow-dialog"
import { ActiveDialog } from "@/components/dashboard/table-common"
import {
  ContextMenuCheckboxItem,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu"
import { toast } from "@/components/ui/use-toast"
import { useManagedResources } from "@/hooks/use-managed-resources"
import { exportWorkflow, handleExportError } from "@/lib/export"
import { useFolders, useOrgAppSettings, useWorkflowManager } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

export function WorkflowActions({
  item,
  onDuplicateWorkflow,
  duplicateDisabled = false,
  setSelectedWorkflow,
  setActiveDialog,
  showMoveToFolder = true,
  availableTags,
  areTagsLoading = false,
}: {
  item: WorkflowDirectoryItem
  onDuplicateWorkflow: (item: WorkflowDirectoryItem) => void
  duplicateDisabled?: boolean
  setSelectedWorkflow: (workflow: WorkflowReadMinimal) => void
  setActiveDialog?: (activeDialog: ActiveDialog | null) => void
  showMoveToFolder?: boolean
  availableTags?: TagRead[]
  areTagsLoading?: boolean
}) {
  const { appSettings } = useOrgAppSettings()
  const workspaceId = useWorkspaceId()
  // Managed workflows cannot be renamed, moved, retagged or deleted.
  const { isManaged } = useManagedResources()
  const isLocked = isManaged("workflow", item.id)

  const { addWorkflowTag, removeWorkflowTag } = useWorkflowManager(undefined, {
    listEnabled: false,
  })
  const enabledExport = appSettings?.app_workflow_export_enabled ?? false

  const handleExport = async (draft: boolean) => {
    if (!enabledExport) {
      return
    }

    try {
      await exportWorkflow({
        workspaceId,
        workflowId: item.id,
        format: "yaml",
        draft,
      })
    } catch (error) {
      console.error("Failed to download workflow definition as YAML:", error)
      toast(handleExportError(error as Error))
    }
  }

  return (
    <ContextMenuGroup>
      <ContextMenuItem
        className="text-xs"
        onClick={(e) => e.stopPropagation()}
        asChild
      >
        <Link
          href={`/workspaces/${workspaceId}/workflows/${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="mr-2 size-3.5" />
          在新标签页中打开
        </Link>
      </ContextMenuItem>
      {item.alias && (
        <ContextMenuItem
          className="text-xs"
          onClick={(e) => {
            e.stopPropagation() // Prevent row click
            if (item.alias) {
              navigator.clipboard.writeText(item.alias)
            }
          }}
        >
          <Copy className="mr-2 size-3.5" />
          复制工作流别名
        </ContextMenuItem>
      )}
      <ContextMenuItem
        className="text-xs"
        disabled={isLocked}
        onClick={(e) => {
          e.stopPropagation() // Prevent row click
          setSelectedWorkflow(item)
          setActiveDialog?.(ActiveDialog.WorkflowRename)
        }}
      >
        <Pencil className="mr-2 size-3.5" />
        重命名工作流
      </ContextMenuItem>
      {showMoveToFolder && (
        <ContextMenuItem
          className="text-xs"
          disabled={isLocked}
          onClick={(e) => {
            e.stopPropagation() // Prevent row click
            setSelectedWorkflow(item)
            setActiveDialog?.(ActiveDialog.WorkflowMove)
          }}
        >
          <FolderUp className="mr-2 size-3.5" />
          移至文件夹
        </ContextMenuItem>
      )}
      {availableTags && availableTags.length > 0 ? (
        <ContextMenuSub>
          <ContextMenuSubTrigger
            className="text-xs"
            disabled={isLocked}
            onClick={(e) => e.stopPropagation()}
          >
            <TagsIcon className="mr-2 size-3.5" />
            标签
          </ContextMenuSubTrigger>
          <ContextMenuPortal>
            <ContextMenuSubContent>
              {availableTags.map((tag) => {
                const hasTag = item.tags?.some((t) => t.id === tag.id)
                return (
                  <ContextMenuCheckboxItem
                    key={tag.id}
                    className="text-xs"
                    checked={hasTag}
                    onClick={async (e) => {
                      e.stopPropagation()
                      try {
                        if (hasTag) {
                          // Delete tag if already exists
                          await removeWorkflowTag({
                            workflowId: item.id,
                            workspaceId,
                            tagId: tag.id,
                          })
                          toast({
                            title: "已移除标签",
                            description: `已从工作流移除标签“${tag.name}”`,
                          })
                        } else {
                          // Add tag if doesn't exist
                          await addWorkflowTag({
                            workflowId: item.id,
                            workspaceId,
                            requestBody: {
                              tag_id: tag.id,
                            },
                          })
                          toast({
                            title: "已添加标签",
                            description: `已为工作流添加标签“${tag.name}”`,
                          })
                        }
                      } catch (error) {
                        console.error("Failed to modify tag:", error)
                        toast({
                          title: "错误",
                          description: `${hasTag ? "移除" : "添加"}工作流标签失败（${hasTag ? "来自" : "更改为"}）`,
                          variant: "destructive",
                        })
                      }
                    }}
                  >
                    <div
                      className="mr-2 flex size-2 rounded-full"
                      style={{
                        backgroundColor: tag.color || undefined,
                      }}
                    />
                    <span>{tag.name}</span>
                  </ContextMenuCheckboxItem>
                )
              })}
            </ContextMenuSubContent>
          </ContextMenuPortal>
        </ContextMenuSub>
      ) : areTagsLoading ? (
        <ContextMenuItem
          className="!bg-transparent text-xs !text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <TagsIcon className="mr-2 size-3.5" />
          <span>正在加载标签…</span>
        </ContextMenuItem>
      ) : (
        <ContextMenuItem
          className="!bg-transparent text-xs !text-muted-foreground hover:cursor-not-allowed"
          onClick={(e) => e.stopPropagation()}
        >
          <TagsIcon className="mr-2 size-3.5" />
          <span>暂无可用标签</span>
        </ContextMenuItem>
      )}
      <ContextMenuItem
        className="text-xs"
        disabled={!enabledExport}
        onClick={(e) => {
          e.stopPropagation()
          void handleExport(true)
        }}
      >
        <DownloadIcon className="mr-2 size-3.5" />
        导出草稿
      </ContextMenuItem>
      <ContextMenuItem
        className="text-xs"
        disabled={!enabledExport}
        onClick={(e) => {
          e.stopPropagation()
          void handleExport(false)
        }}
      >
        <DownloadIcon className="mr-2 size-3.5" />
        导出已保存版本
      </ContextMenuItem>
      <ContextMenuItem
        className="text-xs"
        onClick={(e) => {
          e.stopPropagation() // Prevent row click
          navigator.clipboard.writeText(item.id)
        }}
      >
        <Copy className="mr-2 size-3.5" />
        复制工作流 ID
      </ContextMenuItem>
      <ContextMenuItem
        className="text-xs"
        disabled={duplicateDisabled || !enabledExport}
        onClick={(event) => {
          event.stopPropagation()
          onDuplicateWorkflow(item)
        }}
      >
        <CopyPlus className="mr-2 size-3.5" />
        复制工作流
      </ContextMenuItem>
      <ContextMenuSeparator />
      <DeleteWorkflowAlertDialogTrigger asChild disabled={isLocked}>
        <ContextMenuItem
          className="text-xs text-rose-500 focus:text-rose-600"
          disabled={isLocked}
          onClick={(e) => {
            e.stopPropagation() // Prevent row click
            setSelectedWorkflow(item)
          }}
        >
          <Trash2 className="mr-2 size-3.5" />
          删除
        </ContextMenuItem>
      </DeleteWorkflowAlertDialogTrigger>
    </ContextMenuGroup>
  )
}

export function FolderActions({
  item,
  setActiveDialog,
  setSelectedFolder,
}: {
  item: FolderDirectoryItem
  setActiveDialog: (activeDialog: ActiveDialog | null) => void
  setSelectedFolder: (folder: FolderDirectoryItem | null) => void
}) {
  const workspaceId = useWorkspaceId()
  const { deleteFolder } = useFolders(workspaceId, { enabled: false })
  return (
    <ContextMenuGroup>
      <ContextMenuItem
        className="text-xs"
        onClick={(e) => e.stopPropagation()}
        onSelect={(e) => {
          e.stopPropagation() // Prevent row click
          navigator.clipboard.writeText(item.id)
        }}
      >
        <Copy className="mr-2 size-3.5" />
        复制文件夹 ID
      </ContextMenuItem>
      <ContextMenuItem
        className="text-xs"
        onClick={(e) => e.stopPropagation()}
        onSelect={(e) => {
          e.stopPropagation() // Prevent row click
          setSelectedFolder(item)
          setActiveDialog(ActiveDialog.FolderRename)
        }}
      >
        <Pencil className="mr-2 size-3.5" />
        重命名文件夹
      </ContextMenuItem>
      <ContextMenuItem
        className="text-xs"
        onClick={(e) => e.stopPropagation()}
        onSelect={(e) => {
          e.stopPropagation() // Prevent row click
          setSelectedFolder(item)
          setActiveDialog(ActiveDialog.FolderMove)
        }}
      >
        <FolderKanban className="mr-2 size-3.5" />
        移动文件夹
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className="text-xs text-rose-500 focus:text-rose-600"
        onClick={(e) => e.stopPropagation()}
        onSelect={(e) => {
          e.stopPropagation() // Prevent row click
          if (item.num_items === 0) {
            // Empty folders are deleted without a confirmation gate.
            void deleteFolder({ folderId: item.id }).catch(() => {
              // The mutation hook reports failures.
            })
            return
          }
          setSelectedFolder(item)
          setActiveDialog(ActiveDialog.FolderDelete)
        }}
      >
        <Trash2 className="mr-2 size-3.5" />
        删除
      </ContextMenuItem>
    </ContextMenuGroup>
  )
}
