"use client"

import type { TableColumnRead } from "@/client"
import {
  type TableRowFormData,
  TableRowFormDialog,
} from "@/components/tables/table-insert-row-dialog"
import { toast } from "@/components/ui/use-toast"
import { useInsertCaseRow } from "@/hooks/use-case-rows"

/** Props for {@link CaseInsertRowDialog}. */
export interface CaseInsertRowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseId: string
  workspaceId: string
  tableId: string
  tableName: string | null
  /** Table schema from the case-scoped summary, not a `table:read`. */
  columns: readonly TableColumnRead[]
}

/**
 * The tables view's "Add new row" form on the case page: the new row is
 * inserted into the table and linked to the case in one request.
 */
export function CaseInsertRowDialog({
  open,
  onOpenChange,
  caseId,
  workspaceId,
  tableId,
  tableName,
  columns,
}: CaseInsertRowDialogProps) {
  const { insertCaseRow, insertCaseRowIsPending } = useInsertCaseRow({
    caseId,
    workspaceId,
  })

  async function handleSubmit(data: TableRowFormData) {
    await insertCaseRow({ tableId, data })
    toast({
      title: "已添加行",
      description: "已添加此行并关联到当前事件。",
    })
  }

  let description = "向此数据表添加新行，并关联到当前事件。"
  if (tableName) {
    description = `向“${tableName}”数据表添加新行并关联到此事件。`
  }

  return (
    <TableRowFormDialog
      open={open}
      onOpenChange={onOpenChange}
      columns={columns}
      tableName={tableName}
      description={description}
      onSubmit={handleSubmit}
      isPending={insertCaseRowIsPending}
    />
  )
}
