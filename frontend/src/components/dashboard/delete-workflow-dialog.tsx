"use client"

import type React from "react"
import { useState } from "react"
import type { WorkflowReadMinimal } from "@/client"
import { ConfirmDestructiveDialog } from "@/components/confirm-destructive-dialog"
import { AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useWorkflowManager } from "@/lib/hooks"

export function DeleteWorkflowConfirmDialog({
  open,
  onOpenChange,
  workflowId,
  workflowTitle,
  onDeleted,
  children,
}: React.PropsWithChildren<{
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string | null
  workflowTitle?: string | null
  onDeleted?: () => void
}>) {
  const { deleteWorkflow, deleteWorkflowIsPending } = useWorkflowManager(
    undefined,
    { listEnabled: false }
  )
  const id = workflowId ?? ""

  return (
    <ConfirmDestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={"删除工作流"}
      description={
        <>
          永久删除{" "}
          {workflowTitle ? (
            <span className="font-medium text-foreground">{workflowTitle}</span>
          ) : (
            "此工作流"
          )}
          吗？其定时计划也将被删除，此操作无法撤销。
        </>
      }
      identifier={{ label: "工作流 ID", value: id }}
      confirmPhrase={id}
      isPending={deleteWorkflowIsPending}
      onConfirm={async () => {
        if (!workflowId) return
        await deleteWorkflow(workflowId)
        onOpenChange(false)
        onDeleted?.()
      }}
    >
      {children}
    </ConfirmDestructiveDialog>
  )
}

export function DeleteWorkflowAlertDialog({
  selectedWorkflow,
  setSelectedWorkflow,
  children,
}: React.PropsWithChildren<{
  selectedWorkflow: WorkflowReadMinimal | null
  setSelectedWorkflow: (selectedWorkflow: WorkflowReadMinimal | null) => void
}>) {
  const [open, setOpen] = useState(false)
  return (
    <DeleteWorkflowConfirmDialog
      open={open && selectedWorkflow !== null}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) {
          setSelectedWorkflow(null)
        }
      }}
      workflowId={selectedWorkflow?.id ?? null}
      workflowTitle={selectedWorkflow?.title}
    >
      {children}
    </DeleteWorkflowConfirmDialog>
  )
}

export const DeleteWorkflowAlertDialogTrigger = AlertDialogTrigger
