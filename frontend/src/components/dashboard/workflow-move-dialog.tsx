"use client"

import { ChevronDownIcon, FolderIcon } from "lucide-react"
import { useEffect, useState } from "react"
import type { WorkflowReadMinimal } from "@/client"
import {
  FileTreeCommand,
  getFileTreeItems,
  ROOT_FOLDER_NAME,
} from "@/components/dashboard/file-tree-command"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { useFolders, useWorkflowManager } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

interface WorkflowMoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedWorkflow: WorkflowReadMinimal | null
  setSelectedWorkflow: (workflow: WorkflowReadMinimal | null) => void
}

export function WorkflowMoveDialog({
  open,
  onOpenChange,
  selectedWorkflow,
  setSelectedWorkflow,
}: WorkflowMoveDialogProps) {
  const workspaceId = useWorkspaceId()
  const { moveWorkflow } = useWorkflowManager(undefined, {
    listEnabled: false,
  })
  const { folders } = useFolders(workspaceId, { enabled: open })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [openFolderSelect, setOpenFolderSelect] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFolder(null)
    }
  }, [open])

  const handleMove = async () => {
    if (!selectedWorkflow) return

    setIsLoading(true)
    try {
      await moveWorkflow({
        workflowId: selectedWorkflow.id,
        workspaceId,
        requestBody: {
          folder_path: selectedFolder || "/",
        },
      })

      toast({
        title: "已移动工作流",
        description: `已将“${selectedWorkflow.title}”移至 ${selectedFolder || "根目录"}`,
      })

      onOpenChange(false)
      setSelectedWorkflow(null)
    } catch (error) {
      console.error("Failed to move workflow:", error)
      toast({
        title: "错误",
        description: "移动工作流失败",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fileTreeItems = getFileTreeItems(folders)

  const handleSelectFolder = (path: string) => {
    setSelectedFolder(path)
    setOpenFolderSelect(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>移动工作流</DialogTitle>
          <DialogDescription>
            选择文件夹，移动对象：{" "}
            <span className="font-medium">{selectedWorkflow?.title}</span>{" "}
            更改为
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="w-full flex items-center">
            <Popover
              modal
              open={openFolderSelect}
              onOpenChange={setOpenFolderSelect}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openFolderSelect}
                  className="flex w-96 max-w-full min-w-0 justify-between overflow-hidden"
                >
                  {selectedFolder ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <FolderIcon className="size-4 shrink-0" />
                      <span
                        className="truncate"
                        title={
                          selectedFolder === "/"
                            ? ROOT_FOLDER_NAME
                            : selectedFolder
                        }
                      >
                        {selectedFolder === "/"
                          ? ROOT_FOLDER_NAME
                          : selectedFolder}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">选择文件夹…</div>
                  )}
                  <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] overflow-hidden p-0"
                portal={true}
              >
                <FileTreeCommand
                  items={fileTreeItems}
                  onSelect={handleSelectFolder}
                />
              </PopoverContent>
            </Popover>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            size="sm"
            onClick={handleMove}
            disabled={isLoading || !selectedFolder}
          >
            {isLoading ? "移动中…" : "移动"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
