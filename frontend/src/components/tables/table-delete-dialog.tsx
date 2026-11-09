"use client"

import { useRouter } from "next/navigation"
import type { TableReadMinimal } from "@/client"
import { ConfirmDestructiveDialog } from "@/components/confirm-destructive-dialog"
import { useDeleteTable } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

export function DeleteTableDialog({
  table,
  open,
  onOpenChange,
}: {
  table: TableReadMinimal
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const workspaceId = useWorkspaceId()
  const { deleteTable, deleteTableIsPending } = useDeleteTable()
  if (!workspaceId) {
    return null
  }

  return (
    <ConfirmDestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={"删除数据表"}
      description={<>永久删除此数据表及其所有行吗？此操作无法撤销。</>}
      identifier={{ label: "数据表名称", value: table.name }}
      confirmPhrase={table.name}
      isPending={deleteTableIsPending}
      onConfirm={async () => {
        await deleteTable({ tableId: table.id, workspaceId })
        onOpenChange(false)
        router.push(`/workspaces/${workspaceId}/tables`)
      }}
    />
  )
}
