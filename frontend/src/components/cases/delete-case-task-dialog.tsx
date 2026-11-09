"use client"

import type { CaseTaskRead } from "@/client"
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
import { useDeleteCaseTask } from "@/lib/hooks"

interface DeleteCaseTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: CaseTaskRead | null
  caseId: string
  workspaceId: string
  onDeleteSuccess?: () => void
}

export function DeleteCaseTaskDialog({
  open,
  onOpenChange,
  task,
  caseId,
  workspaceId,
  onDeleteSuccess,
}: DeleteCaseTaskDialogProps) {
  const { deleteTask, deleteTaskIsPending } = useDeleteCaseTask({
    caseId,
    workspaceId,
    taskId: task?.id || "",
  })

  const handleDelete = () => {
    if (!task) return

    deleteTask(undefined, {
      onSuccess: () => {
        onOpenChange(false)
        onDeleteSuccess?.()
      },
    })
  }

  if (!task) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除任务</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除“{task.title}”吗？此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteTaskIsPending}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteTaskIsPending}
          >
            {deleteTaskIsPending ? "删除中…" : "删除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
