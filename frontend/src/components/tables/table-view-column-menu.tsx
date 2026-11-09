"use client"

import {
  ChevronDownIcon,
  CopyIcon,
  DatabaseZapIcon,
  Trash2Icon,
  UnlinkIcon,
} from "lucide-react"
import { useParams } from "next/navigation"
import { useState } from "react"
import { z } from "zod"
import type { TableColumnRead } from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { Spinner } from "@/components/loading/spinner"
import {
  TableSearchColumnDialog,
  TableSearchColumnMenuItem,
} from "@/components/tables/table-search-column-control"
import { useTableSearchContext } from "@/components/tables/table-search-context"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useManagedResources } from "@/hooks/use-managed-resources"
import { useDeleteColumn, useUpdateColumn } from "@/lib/hooks"
import { SqlTypeCreatableEnum } from "@/lib/tables"
import { useWorkspaceId } from "@/providers/workspace-id"

type TableViewColumnMenuType =
  | "delete"
  | "edit"
  | "set-natural-key"
  | "drop-natural-key"
  | "enable-vector-search"
  | "disable-vector-search"
  | null

export function TableViewColumnMenu({ column }: { column: TableColumnRead }) {
  const canUpdateTable = useScopeCheck("table:update")
  const canDeleteColumn = useScopeCheck("table:delete")
  const params = useParams<{ tableId?: string }>()
  const tableId = params?.tableId
  // A managed table's schema is locked; its rows stay editable.
  const { isManaged } = useManagedResources()
  const schemaLocked = isManaged("table", tableId)
  const [activeType, setActiveType] = useState<TableViewColumnMenuType>(null)
  const onOpenChange = () => setActiveType(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="size-4 p-0 !ring-0">
            <span className="sr-only">配置列</span>
            <ChevronDownIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            className="py-1 text-xs text-foreground/80"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(String(column.id))
            }}
          >
            <CopyIcon className="mr-2 size-3 group-hover/item:text-accent-foreground" />
            复制 ID
          </DropdownMenuItem>
          <DropdownMenuItem
            className="py-1 text-xs text-foreground/80"
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(String(column.name))
            }}
          >
            <CopyIcon className="mr-2 size-3 group-hover/item:text-accent-foreground" />
            复制名称
          </DropdownMenuItem>
          {canUpdateTable &&
            !schemaLocked &&
            (column.is_index ? (
              <DropdownMenuItem
                className="py-1 text-xs text-foreground/80"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveType("drop-natural-key")
                }}
              >
                <UnlinkIcon className="mr-2 size-3 group-hover/item:text-accent-foreground" />
                删除唯一索引
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="py-1 text-xs text-foreground/80"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveType("set-natural-key")
                }}
              >
                <DatabaseZapIcon className="mr-2 size-3 group-hover/item:text-accent-foreground" />
                创建唯一索引
              </DropdownMenuItem>
            ))}
          {!schemaLocked && (
            <TableSearchColumnMenuItem
              column={column}
              onSelectAction={(enabled) =>
                setActiveType(
                  enabled ? "enable-vector-search" : "disable-vector-search"
                )
              }
            />
          )}
          {canDeleteColumn && !schemaLocked && (
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
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <TableColumnDeleteDialog
        tableId={tableId}
        column={column}
        open={activeType === "delete"}
        onOpenChange={onOpenChange}
      />
      <TableColumnIndexDialog
        tableId={tableId}
        column={column}
        open={activeType === "set-natural-key"}
        onOpenChange={onOpenChange}
      />
      <TableColumnDropIndexDialog
        tableId={tableId}
        column={column}
        open={activeType === "drop-natural-key"}
        onOpenChange={onOpenChange}
      />
      <TableSearchColumnDialog
        column={column}
        enabled
        open={activeType === "enable-vector-search"}
        onOpenChange={onOpenChange}
      />
      <TableSearchColumnDialog
        column={column}
        enabled={false}
        open={activeType === "disable-vector-search"}
        onOpenChange={onOpenChange}
      />
    </>
  )
}

function TableColumnDeleteDialog({
  tableId,
  column,
  open,
  onOpenChange,
}: {
  tableId?: string
  column: TableColumnRead
  open: boolean
  onOpenChange: () => void
}) {
  const workspaceId = useWorkspaceId()
  const { deleteColumn } = useDeleteColumn()
  const search = useTableSearchContext()
  const selected = search?.configuration.data?.selected_column_ids?.includes(
    column.id
  )
  const [confirmName, setConfirmName] = useState("")

  if (!tableId || !workspaceId) {
    return null
  }

  const handleDeleteColumn = async () => {
    if (confirmName !== column.name) {
      toast({
        title: "列名称不匹配",
        description: "请输入完整准确的列名称以确认删除",
      })
      return
    }

    try {
      await deleteColumn({
        tableId,
        workspaceId,
        columnId: column.id,
      })
      onOpenChange()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>永久删除列</AlertDialogTitle>
          <AlertDialogDescription>
            请在下方输入列名称 <b>{column.name}</b> 以确认删除。此操作无法撤销。
            {selected && (
              <span className="mt-2 block">
                此列参与语义搜索。删除后会将其移出搜索，并为其余选中的列重建索引。
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4">
          <Input
            placeholder={`输入“${column.name}”以确认`}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteColumn}
            variant="destructive"
            disabled={confirmName !== column.name}
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const _updateColumnSchema = z.object({
  name: z
    .string()
    .min(1, { message: "名称至少需要 1 个字符" })
    .max(255, { message: "名称必须少于 255 个字符" })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "名称只能包含字母、数字和下划线",
    }),
  type: z.enum(SqlTypeCreatableEnum),
  nullable: z.boolean(),
})

function TableColumnIndexDialog({
  tableId,
  column,
  open,
  onOpenChange,
}: {
  tableId?: string
  column: TableColumnRead
  open: boolean
  onOpenChange: () => void
}) {
  const workspaceId = useWorkspaceId()
  const { updateColumn, updateColumnIsPending } = useUpdateColumn()

  if (!tableId || !workspaceId) {
    return null
  }

  if (column.is_index) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>此列已有唯一索引</AlertDialogTitle>
            <AlertDialogDescription>
              列 <b>{column.name}</b> 已具有唯一索引。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>关闭</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  const handleSetIndex = async () => {
    try {
      const updates = {
        is_index: true,
      }

      await updateColumn({
        tableId,
        columnId: column.id,
        workspaceId,
        requestBody: updates,
      })

      toast({
        title: "已创建唯一索引",
        description: "此列现已具有唯一索引。",
      })

      onOpenChange()
    } catch (error) {
      console.error("Error creating unique index:", error)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={() => {
        if (!updateColumnIsPending) {
          onOpenChange()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>创建唯一索引</AlertDialogTitle>
          <AlertDialogDescription>
            确定要为列 <b>{column.name}</b> 创建唯一索引吗？这将启用数据表的
            upsert 操作。
            <br />
            <br />
            <strong>要求：</strong>
            <ul className="mt-2 list-disc pl-5 text-xs">
              <li>此列的所有值必须唯一</li>
              <li>每个数据表只允许一个唯一索引</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateColumnIsPending}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSetIndex}
            disabled={updateColumnIsPending}
          >
            {updateColumnIsPending ? (
              <>
                <Spinner />
                创建中…
              </>
            ) : (
              <>
                <DatabaseZapIcon className="mr-2 size-4" />
                创建唯一索引
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function TableColumnDropIndexDialog({
  tableId,
  column,
  open,
  onOpenChange,
}: {
  tableId?: string
  column: TableColumnRead
  open: boolean
  onOpenChange: () => void
}) {
  const workspaceId = useWorkspaceId()
  const { updateColumn, updateColumnIsPending } = useUpdateColumn()

  if (!tableId || !workspaceId) {
    return null
  }

  const handleDropIndex = async () => {
    try {
      await updateColumn({
        tableId,
        columnId: column.id,
        workspaceId,
        requestBody: { is_index: false },
      })

      toast({
        title: "已移除唯一索引",
        description: "此列已不再具有唯一索引。",
      })

      onOpenChange()
    } catch (error) {
      console.error("Error removing unique index:", error)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={() => {
        if (!updateColumnIsPending) {
          onOpenChange()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除唯一索引</AlertDialogTitle>
          <AlertDialogDescription>
            确定要移除以下列的唯一索引： <b>{column.name}</b>?
            <br />
            <br />
            在其他列上创建新唯一索引之前，依赖此列作为冲突键的 upsert
            操作将无法使用。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateColumnIsPending}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDropIndex}
            disabled={updateColumnIsPending}
            variant="destructive"
          >
            {updateColumnIsPending ? (
              <>
                <Spinner />
                移除中…
              </>
            ) : (
              <>
                <UnlinkIcon className="mr-2 size-4" />
                删除唯一索引
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
