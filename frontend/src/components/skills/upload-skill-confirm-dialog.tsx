"use client"

import { FileText, Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

type UploadSkillConfirmDialogProps = {
  open: boolean
  files: Array<{ file: File; path: string }>
  pending: boolean
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

/**
 * Confirmation dialog shown after selecting files for skill upload.
 * Displays file count and a preview of files to be uploaded.
 */
export function UploadSkillConfirmDialog({
  open,
  files,
  pending,
  onConfirm,
  onCancel,
}: UploadSkillConfirmDialogProps) {
  const fileCount = files.length
  const totalSize = files.reduce((sum, { file }) => sum + file.size, 0)
  const formattedSize = formatBytes(totalSize)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !pending) {
          onCancel()
        }
      }}
    >
      <AlertDialogContent className="sm:max-w-[480px]">
        <AlertDialogHeader>
          <AlertDialogTitle>上传技能</AlertDialogTitle>
          <AlertDialogDescription>
            {fileCount} {fileCount === 1 ? "文件" : "个文件"} ({formattedSize}
            ）将被上传。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="rounded-md border [&>[data-radix-scroll-area-viewport]]:max-h-[200px]">
          <div className="flex flex-col gap-1 p-3">
            {files.slice(0, 50).map(({ path }) => (
              <div
                key={path}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <FileText className="size-3 shrink-0" />
                <span className="truncate">{path}</span>
              </div>
            ))}
            {fileCount > 50 && (
              <div className="pt-1 text-xs text-muted-foreground">
                另有 {fileCount - 50} 个文件…
              </div>
            )}
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} onClick={onCancel}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              void onConfirm()
            }}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            上传
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B"
  }
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / Math.pow(1024, index)
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}
