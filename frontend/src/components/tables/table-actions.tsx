"use client"

import { Copy, Trash2 } from "lucide-react"
import type { TableReadMinimal } from "@/client"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { useManagedResources } from "@/hooks/use-managed-resources"

export function TableActions({
  table,
  onDeleteClick,
}: {
  table: TableReadMinimal
  onDeleteClick: (table: TableReadMinimal) => void
}) {
  // Managed tables cannot be deleted.
  const { isManaged } = useManagedResources()
  const isLocked = isManaged("table", table.id)
  return (
    <DropdownMenuGroup>
      <DropdownMenuItem
        className="text-xs"
        onClick={(e) => {
          e.stopPropagation() // Prevent row click
          navigator.clipboard.writeText(table.id)
          toast({
            title: "已复制数据表 ID",
            description: table.id,
          })
        }}
      >
        <Copy className="mr-2 h-3 w-3" />
        复制数据表 ID
      </DropdownMenuItem>
      <DropdownMenuItem
        className="text-xs text-destructive focus:text-destructive"
        disabled={isLocked}
        onClick={(e) => {
          e.stopPropagation() // Prevent row click
          onDeleteClick(table)
        }}
      >
        <Trash2 className="mr-2 h-3 w-3" />
        删除
      </DropdownMenuItem>
    </DropdownMenuGroup>
  )
}
