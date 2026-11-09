"use client"

import type React from "react"
import type { VariableReadMinimal } from "@/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useWorkspaceVariables } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

export function DeleteVariableAlertDialog({
  selectedVariable,
  setSelectedVariable,
  children,
}: React.PropsWithChildren<{
  selectedVariable: VariableReadMinimal | null
  setSelectedVariable: (selectedVariable: VariableReadMinimal | null) => void
}>) {
  const workspaceId = useWorkspaceId()
  const { deleteVariableById } = useWorkspaceVariables(workspaceId, {
    listEnabled: false,
  })
  return (
    <AlertDialog
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedVariable(null)
        }
      }}
    >
      {children}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除变量</AlertDialogTitle>
          <AlertDialogDescription>
            确定要从工作空间删除此变量吗？此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              if (selectedVariable) {
                console.log("Deleting variable", selectedVariable)
                await deleteVariableById(selectedVariable)
              }
              setSelectedVariable(null)
            }}
          >
            确认
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export const DeleteVariableAlertDialogTrigger = AlertDialogTrigger
