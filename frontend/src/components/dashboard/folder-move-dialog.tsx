import { ChevronDownIcon, FolderIcon } from "lucide-react"
import { useEffect, useState } from "react"
import type { FolderDirectoryItem } from "@/client"
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
import { useFolders } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

interface FolderMoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFolder: FolderDirectoryItem | null
  setSelectedFolder: (folder: FolderDirectoryItem | null) => void
}

export function FolderMoveDialog({
  open,
  onOpenChange,
  selectedFolder,
  setSelectedFolder,
}: FolderMoveDialogProps) {
  const workspaceId = useWorkspaceId()
  const { folders, moveFolder } = useFolders(workspaceId, { enabled: open })
  const [destinationPath, setDestinationPath] = useState<string>("/")
  const [isMoving, setIsMoving] = useState(false)
  const [openFolderSelect, setOpenFolderSelect] = useState(false)

  // Get the current parent path
  const getCurrentParentPath = (): string => {
    if (!selectedFolder || selectedFolder.path === "/") return "/"

    const lastSlashIndex = selectedFolder.path.lastIndexOf("/")
    if (lastSlashIndex <= 0) return "/"

    return selectedFolder.path.substring(0, lastSlashIndex) || "/"
  }

  const currentParentPath = getCurrentParentPath()

  useEffect(() => {
    // Reset destination path when dialog opens or selected folder changes
    if (open) {
      setDestinationPath("/")
    }
  }, [open, selectedFolder])

  const handleClose = () => {
    if (!isMoving) {
      onOpenChange(false)
      // Delay clearing selection to avoid UI flicker if dialog closes quickly
      setTimeout(() => setSelectedFolder(null), 150)
    }
  }

  const handleMove = async () => {
    if (!selectedFolder || !workspaceId) {
      toast({
        title: "错误",
        description: "未选择文件夹，或缺少工作空间上下文。",
        variant: "destructive",
      })
      return
    }

    // Prevent moving a folder into itself or its descendants
    if (
      destinationPath === selectedFolder.path ||
      destinationPath.startsWith(`${selectedFolder.path}/`)
    ) {
      toast({
        title: "目标位置无效",
        description: "无法将文件夹移入自身或其子文件夹。",
        variant: "destructive",
      })
      return
    }

    setIsMoving(true)
    try {
      await moveFolder({
        folderId: selectedFolder.id,
        newParentPath: destinationPath,
      })

      toast({
        title: "已移动文件夹",
        description: `已将“${selectedFolder.name}”移至 ${destinationPath === "/" ? "根目录" : destinationPath}`,
      })

      handleClose()
    } catch (error) {
      // Error toast is handled by the mutation hook
      console.error("Failed to move folder:", error)
    } finally {
      setIsMoving(false)
    }
  }

  // Filter out the selected folder and its descendants
  const availableFolders = folders?.filter(
    (folder) =>
      folder.id !== selectedFolder?.id && // Not the folder itself
      !folder.path.startsWith(`${selectedFolder?.path}/`) // Not a descendant
  )

  const fileTreeItems = getFileTreeItems(availableFolders)

  const handleSelectFolder = (path: string) => {
    setDestinationPath(path)
    setOpenFolderSelect(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="sm" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>移动文件夹</DialogTitle>
          <DialogDescription>
            选择新的目标文件夹，移动对象：{" "}
            <span className="font-medium">{selectedFolder?.name}</span>.
            <div className="mt-2 text-xs">
              当前位置：{" "}
              <span className="font-medium break-words">
                {currentParentPath === "/"
                  ? ROOT_FOLDER_NAME
                  : currentParentPath}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="flex w-full items-center">
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
                  disabled={isMoving}
                >
                  {destinationPath ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <FolderIcon className="size-4 shrink-0" />
                      <span
                        className="truncate"
                        title={
                          destinationPath === "/"
                            ? ROOT_FOLDER_NAME
                            : destinationPath
                        }
                      >
                        {destinationPath === "/"
                          ? ROOT_FOLDER_NAME
                          : destinationPath}
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
          <Button size="sm" onClick={handleMove} disabled={isMoving}>
            {isMoving ? "移动中…" : "移动文件夹"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
