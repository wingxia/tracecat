"use client"

import type React from "react"
import type { CaseReadMinimal } from "@/client"
import { ConfirmDestructiveDialog } from "@/components/confirm-destructive-dialog"
import { AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useDeleteCase } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

export function DeleteCaseAlertDialog({
  selectedCase,
  setSelectedCase,
  children,
}: React.PropsWithChildren<{
  selectedCase: CaseReadMinimal | null
  setSelectedCase: (selectedCase: CaseReadMinimal | null) => void
}>) {
  const workspaceId = useWorkspaceId()
  const { deleteCase, deleteCaseIsPending } = useDeleteCase({ workspaceId })
  const shortId = selectedCase?.short_id ?? ""

  return (
    <ConfirmDestructiveDialog
      open={selectedCase !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedCase(null)
        }
      }}
      title={"删除事件"}
      description={
        <>
          永久删除{" "}
          {selectedCase?.summary ? (
            <span className="font-medium text-foreground">
              {selectedCase.summary}
            </span>
          ) : (
            "此事件"
          )}
          吗？此操作无法撤销。
        </>
      }
      identifier={{ label: "事件 ID", value: shortId }}
      confirmPhrase={shortId}
      isPending={deleteCaseIsPending}
      onConfirm={async () => {
        if (!selectedCase) return
        await deleteCase(selectedCase.id)
        setSelectedCase(null)
      }}
    >
      {children}
    </ConfirmDestructiveDialog>
  )
}

export const DeleteCaseAlertDialogTrigger = AlertDialogTrigger
