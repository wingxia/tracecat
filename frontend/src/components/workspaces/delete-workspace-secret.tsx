"use client"

import type React from "react"
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
import { useWorkspaceSecrets, type WorkspaceSecretListItem } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

export function DeleteSecretAlertDialog({
  selectedSecret,
  setSelectedSecret,
  children,
}: React.PropsWithChildren<{
  selectedSecret: WorkspaceSecretListItem | null
  setSelectedSecret: (selectedSecret: WorkspaceSecretListItem | null) => void
}>) {
  const workspaceId = useWorkspaceId()
  const { deleteSecretById } = useWorkspaceSecrets(workspaceId, {
    listEnabled: false,
  })
  return (
    <AlertDialog
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedSecret(null)
        }
      }}
    >
      {children}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除密钥</AlertDialogTitle>
          <AlertDialogDescription>
            确定要从工作空间删除此密钥吗？此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              if (selectedSecret) {
                console.log("Deleting secret", selectedSecret)
                await deleteSecretById(selectedSecret)
              }
              setSelectedSecret(null)
            }}
          >
            确认
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export const DeleteSecretAlertDialogTrigger = AlertDialogTrigger
