"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import type { CustomCellRendererProps } from "ag-grid-react"
import { CopyIcon, Trash2Icon } from "lucide-react"
import { useParams } from "next/navigation"
import { useState } from "react"
import type { TableRowRead } from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDeleteRow } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

type RowActionType = "delete" | null

export function AgGridRowActions(params: CustomCellRendererProps) {
  const canDeleteRow = useScopeCheck("table:delete")
  const [activeType, setActiveType] = useState<RowActionType>(null)
  const row = params.data as TableRowRead

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="size-4 p-0">
            <span className="sr-only">打开菜单</span>
            <DotsHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            className="py-1 text-xs text-foreground/80"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(String(row.id))
            }}
          >
            <CopyIcon className="mr-2 size-3 group-hover/item:text-accent-foreground" />
            复制 ID
          </DropdownMenuItem>
          {canDeleteRow && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="py-1 text-xs text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveType("delete")
                }}
              >
                <Trash2Icon className="mr-2 size-3 group-hover/item:text-destructive" />
                删除
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <RowDeleteDialog
        row={row}
        open={activeType === "delete"}
        onOpenChange={() => setActiveType(null)}
      />
    </>
  )
}

function RowDeleteDialog({
  row,
  open,
  onOpenChange,
}: {
  row: TableRowRead
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const params = useParams<{ tableId?: string }>()
  const tableId = params?.tableId
  const workspaceId = useWorkspaceId()
  const { deleteRow } = useDeleteRow()

  if (!tableId || !workspaceId) {
    return null
  }

  const handleDeleteRow = async () => {
    try {
      await deleteRow({
        tableId,
        workspaceId,
        rowId: row.id,
      })
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除行</AlertDialogTitle>
          <AlertDialogDescription>
            确定要从数据表中删除此行吗？此操作无法撤销。
          </AlertDialogDescription>
          <AlertDialogDescription>行 ID： {row.id}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDeleteRow}>
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
