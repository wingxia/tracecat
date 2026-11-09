"use client"

import type React from "react"
import type { SecretReadMinimal } from "@/client"
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
import { useOrgSecrets } from "@/lib/hooks"

export function DeleteOrgSecretAlertDialog({
  selectedSecret,
  setSelectedSecret,
  children,
}: React.PropsWithChildren<{
  selectedSecret: SecretReadMinimal | null
  setSelectedSecret: (selectedSecret: SecretReadMinimal | null) => void
}>) {
  const { deleteSecretById } = useOrgSecrets()
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
            确定要从组织中删除此密钥吗？此操作无法撤销。
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

export const DeleteOrgSecretAlertDialogTrigger = AlertDialogTrigger
