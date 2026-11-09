import type { AlertDialogProps } from "@radix-ui/react-alert-dialog"
import type { PropsWithoutRef } from "react"

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

interface DeleteNodeDialogProps extends PropsWithoutRef<AlertDialogProps> {
  onConfirm: () => void
}

export function DeleteActionNodeDialog({
  onConfirm,
  ...rest
}: DeleteNodeDialogProps) {
  return (
    <AlertDialog {...rest}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除动作节点</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            确定要删除此动作节点吗？此操作将从工作流中移除该节点，并删除与其他节点的所有连接。
            <br />
            <br />
            <strong>此操作无法撤销。</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
