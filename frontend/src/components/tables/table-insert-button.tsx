"use client"

import {
  BetweenHorizonalStartIcon,
  BetweenVerticalStartIcon,
  ChevronDownIcon,
  FileUpIcon,
  Plus,
} from "lucide-react"
import { useParams } from "next/navigation"
import { useState } from "react"
import { TableImportCsvDialog } from "@/components/tables/table-import-csv-dialog"
import { TableInsertColumnDialog } from "@/components/tables/table-insert-column-dialog"
import { TableInsertRowDialog } from "@/components/tables/table-insert-row-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useManagedResources } from "@/hooks/use-managed-resources"

type DialogType = "row" | "column" | "csv" | null

export function TableInsertButton() {
  const [activeDialog, setActiveDialog] = useState<DialogType>(null)
  const params = useParams<{ tableId?: string }>()
  // A managed table keeps row inserts but not new columns. Stay locked until
  // the managed lookup settles so a managed table never offers the action.
  const { isManaged, isLoading: managedLoading } = useManagedResources()
  const schemaLocked = managedLoading || isManaged("table", params?.tableId)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 bg-background">
            <Plus className="mr-1 h-3.5 w-3.5" />
            插入
            <ChevronDownIcon className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="
            [&_[data-radix-collection-item]]:flex
            [&_[data-radix-collection-item]]:items-center
            [&_[data-radix-collection-item]]:gap-2
          "
        >
          <DropdownMenuItem onSelect={() => setActiveDialog("row")}>
            <BetweenHorizonalStartIcon className="size-4 text-foreground/80" />
            <div className="flex flex-col text-xs">
              <span>插入行</span>
              <span className="text-xs text-muted-foreground">
                向数据表插入新行
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={schemaLocked}
            onSelect={() => setActiveDialog("column")}
          >
            <BetweenVerticalStartIcon className="size-4 text-foreground/80" />
            <div className="flex flex-col text-xs">
              <span>创建列</span>
              <span className="text-xs text-muted-foreground">
                在数据表中创建新列
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setActiveDialog("csv")}>
            <FileUpIcon className="size-4 text-foreground/80" />
            <div className="flex flex-col text-xs">
              <span>从 CSV 插入行</span>
              <span className="text-xs text-muted-foreground">
                从 CSV 文件插入行
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TableInsertRowDialog
        open={activeDialog === "row"}
        onOpenChange={() => setActiveDialog(null)}
      />

      <TableInsertColumnDialog
        open={activeDialog === "column" && !schemaLocked}
        onOpenChange={() => setActiveDialog(null)}
      />

      <TableImportCsvDialog
        open={activeDialog === "csv"}
        onOpenChange={() => setActiveDialog(null)}
      />
    </>
  )
}
