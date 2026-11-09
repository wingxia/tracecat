"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useState } from "react"
import type { CaseFieldReadMinimal } from "@/client"
import { EditCustomFieldDialog } from "@/components/cases/edit-custom-field-dialog"
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableToolbarProps,
} from "@/components/data-table"
import { ManagedResourceStatus } from "@/components/managed/managed-resource-status"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useManagedResources } from "@/hooks/use-managed-resources"
import { getCaseFieldTypeConfig } from "@/lib/data-type"

interface CustomFieldsTableProps {
  fields: CaseFieldReadMinimal[]
  onDeleteField: (fieldId: string) => Promise<void>
  isDeleting?: boolean
}

export function CustomFieldsTable({
  fields,
  onDeleteField,
  isDeleting,
}: CustomFieldsTableProps) {
  const [selectedField, setSelectedField] =
    useState<CaseFieldReadMinimal | null>(null)
  const [editingField, setEditingField] = useState<CaseFieldReadMinimal | null>(
    null
  )
  // Managed case fields keep their definition; values on cases stay editable.
  // A case field's id is its field name, which managed records key on.
  const { isManaged } = useManagedResources()

  return (
    <>
      <AlertDialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedField(null)
          }
        }}
      >
        <DataTable
          data={fields.filter((field) => !field.reserved)}
          columns={[
            {
              accessorKey: "display_name",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"字段名称"}
                />
              ),
              cell: ({ row }) => (
                <div className="flex items-center gap-2 text-xs text-foreground/80">
                  {row.getValue<CaseFieldReadMinimal["display_name"]>(
                    "display_name"
                  )}
                  <ManagedResourceStatus
                    resourceType="case_field"
                    id={row.original.id}
                    name={row.original.id}
                    showDetach
                  />
                </div>
              ),
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "type",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"数据类型"}
                />
              ),
              cell: ({ row }) => {
                const fieldType =
                  row.getValue<CaseFieldReadMinimal["type"]>("type")
                const fieldKind = row.original.kind
                const config = getCaseFieldTypeConfig(fieldType, fieldKind)
                if (config) {
                  const Icon = config.icon
                  return (
                    <Badge
                      variant="secondary"
                      className="text-xs whitespace-nowrap"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="size-3 shrink-0" />
                        <span className="text-xs font-medium whitespace-nowrap">
                          {config.label}
                        </span>
                      </span>
                    </Badge>
                  )
                }
                return <div className="text-xs">{fieldType}</div>
              },
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "id",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"引用"}
                />
              ),
              cell: ({ row }) => (
                <div className="font-mono text-xs text-muted-foreground">
                  {row.getValue<CaseFieldReadMinimal["id"]>("id")}
                </div>
              ),
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "default",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"默认值"}
                />
              ),
              cell: ({ row }) => {
                const defaultValue =
                  row.getValue<CaseFieldReadMinimal["default"]>("default")
                const fieldType = row.original.type

                // Handle SELECT/MULTI_SELECT as badges
                if (fieldType === "SELECT" || fieldType === "MULTI_SELECT") {
                  let parsedValues: string[] = []
                  if (defaultValue) {
                    if (fieldType === "MULTI_SELECT") {
                      try {
                        const parsed = JSON.parse(defaultValue)
                        if (Array.isArray(parsed)) {
                          parsedValues = parsed.filter(
                            (item): item is string => typeof item === "string"
                          )
                        }
                      } catch {
                        parsedValues = [defaultValue]
                      }
                    } else {
                      parsedValues = [defaultValue]
                    }
                  }

                  if (parsedValues.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-1">
                        {parsedValues.map((item, idx) => (
                          <Badge
                            key={`default-${item}-${idx}`}
                            variant="secondary"
                            className="text-[11px]"
                          >
                            {item}
                          </Badge>
                        ))}
                      </div>
                    )
                  }
                  return <div className="text-xs">-</div>
                }

                // Handle TIMESTAMPTZ defaults with date formatting
                const parsedDate =
                  typeof defaultValue === "string" &&
                  defaultValue &&
                  fieldType === "TIMESTAMPTZ"
                    ? new Date(defaultValue)
                    : null
                const isValidDate =
                  parsedDate && !Number.isNaN(parsedDate.getTime())
                    ? parsedDate
                    : null

                return (
                  <div className="text-xs">
                    {isValidDate
                      ? format(isValidDate, "yyyy年M月d日 '·' HH:mm", {
                          locale: zhCN,
                        })
                      : defaultValue || "-"}
                  </div>
                )
              },
              enableSorting: false,
              enableHiding: false,
            },
            {
              id: "actions",
              enableHiding: false,
              cell: ({ row }) => {
                const isLocked = isManaged("case_field", row.original.id)
                return (
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="size-8 p-0">
                          <span className="sr-only">打开菜单</span>
                          <DotsHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigator.clipboard.writeText(row.original.id)
                          }
                        >
                          复制引用
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isLocked}
                          onClick={() => {
                            setEditingField(row.original)
                          }}
                        >
                          编辑字段
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild disabled={isLocked}>
                          <DropdownMenuItem
                            className="text-rose-500 focus:text-rose-600"
                            disabled={isLocked}
                            onClick={() => {
                              setSelectedField(row.original)
                            }}
                          >
                            删除
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              },
            },
          ]}
          toolbarProps={defaultToolbarProps}
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除字段</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除字段 <strong>{selectedField?.display_name}</strong>
              吗？此操作无法撤销，将删除所有事件中此字段的现有值。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (selectedField) {
                  try {
                    await onDeleteField(selectedField.id)
                    setSelectedField(null)
                  } catch (error) {
                    console.error("Failed to delete field:", error)
                    // Keep dialog open so user can see error and retry
                  }
                }
              }}
              disabled={isDeleting}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EditCustomFieldDialog
        open={editingField !== null}
        field={editingField}
        onOpenChange={(open) => {
          if (!open) {
            setEditingField(null)
          }
        }}
      />
    </>
  )
}

const defaultToolbarProps: DataTableToolbarProps<CaseFieldReadMinimal> = {
  filterProps: {
    placeholder: "按名称筛选字段…",
    column: "display_name",
  },
}
