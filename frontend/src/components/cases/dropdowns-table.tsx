"use client"

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { zodResolver } from "@hookform/resolvers/zod"
import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import {
  CopyIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useId, useState } from "react"
import { useForm } from "react-hook-form"
import z from "zod"
import type {
  CaseDropdownDefinitionRead,
  CaseDropdownDefinitionUpdate,
  CaseDropdownOptionRead,
} from "@/client"
import {
  createEmptyOption,
  type OptionInput,
  SortableOptionRow,
  slugify,
} from "@/components/cases/add-case-dropdown-dialog"
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableToolbarProps,
} from "@/components/data-table"
import type { IconPickerProps } from "@/components/form/icon-picker"
import { ManagedResourceStatus } from "@/components/managed/managed-resource-status"
import { useManagedResources } from "@/hooks/use-managed-resources"

const IconPicker = dynamic<IconPickerProps>(
  () => import("@/components/form/icon-picker").then((mod) => mod.IconPicker),
  { ssr: false }
)

import {
  DynamicLucideIcon,
  resolveIconName,
} from "@/components/dynamic-lucide-icon"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

const updateDefinitionSchema = z.object({
  name: z
    .string()
    .min(1, "名称不能为空")
    .max(50, "名称不能超过 50 个字符")
    .trim()
    .optional(),
  icon_name: z.string().max(100).optional(),
  is_ordered: z.boolean().optional(),
})

enum DefinitionAction {
  Edit = "edit",
  Delete = "delete",
}

interface DropdownsTableProps {
  definitions: CaseDropdownDefinitionRead[]
  onDeleteDefinition: (definitionId: string) => Promise<void>
  onUpdateDefinition: (
    definitionId: string,
    params: CaseDropdownDefinitionUpdate
  ) => Promise<void>
  onAddOption?: (
    definitionId: string,
    option: {
      label: string
      ref: string
      icon_name?: string
      color?: string
      position: number
    }
  ) => Promise<void>
  onUpdateOption?: (
    definitionId: string,
    optionId: string,
    option: {
      label?: string
      ref?: string
      icon_name?: string | null
      color?: string | null
      position?: number
    }
  ) => Promise<void>
  onDeleteOption?: (definitionId: string, optionId: string) => Promise<void>
  onReorderOptions?: (
    definitionId: string,
    optionIds: string[]
  ) => Promise<void>
  isDeleting?: boolean
  isUpdating?: boolean
}

export function DropdownsTable({
  definitions,
  onDeleteDefinition,
  onUpdateDefinition,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onReorderOptions,
  isDeleting,
  isUpdating,
}: DropdownsTableProps) {
  const [selectedDef, setSelectedDef] =
    useState<CaseDropdownDefinitionRead | null>(null)
  const [action, setAction] = useState<DefinitionAction | null>(null)
  // Managed dropdowns keep their definition; choosing values on cases works.
  const { isManaged } = useManagedResources()

  const handleCloseEdit = () => {
    setSelectedDef(null)
    setAction(null)
  }

  return (
    <>
      <AlertDialog
        open={action === DefinitionAction.Delete && selectedDef !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedDef(null)
            setAction(null)
          }
        }}
      >
        <DataTable
          data={definitions}
          columns={[
            {
              accessorKey: "name",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"下拉字段名称"}
                />
              ),
              cell: ({ row }) => {
                const def = row.original
                return (
                  <div className="flex items-center gap-2">
                    {def.icon_name ? (
                      <DynamicLucideIcon
                        name={def.icon_name}
                        className="size-4 text-muted-foreground"
                        fallback={
                          <ListIcon className="size-4 text-muted-foreground" />
                        }
                      />
                    ) : (
                      <ListIcon className="size-4 text-muted-foreground" />
                    )}
                    <span className="text-xs text-foreground/80">
                      {def.name}
                    </span>
                    <ManagedResourceStatus
                      resourceType="case_dropdown"
                      id={def.id}
                      name={def.name}
                      showDetach
                    />
                  </div>
                )
              },
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "options",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"选项"}
                />
              ),
              cell: ({ row }) => {
                const options = row.original.options ?? []
                return (
                  <div className="flex flex-wrap gap-1">
                    {options.slice(0, 5).map((opt) => (
                      <Badge
                        key={opt.id}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {opt.color && (
                          <div
                            className="mr-1 size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: opt.color }}
                          />
                        )}
                        {opt.label}
                      </Badge>
                    ))}
                    {options.length > 5 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{options.length - 5}
                      </span>
                    )}
                  </div>
                )
              },
              enableSorting: false,
              enableHiding: false,
            },
            {
              accessorKey: "ref",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"引用"}
                />
              ),
              cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground">
                  {row.original.ref}
                </span>
              ),
              enableSorting: false,
              enableHiding: false,
            },
            {
              accessorKey: "is_ordered",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"有序"}
                />
              ),
              cell: ({ row }) => (
                <span className="text-xs text-muted-foreground">
                  {row.original.is_ordered ? "是" : "否"}
                </span>
              ),
              enableSorting: false,
              enableHiding: false,
            },
            {
              id: "actions",
              enableHiding: false,
              cell: ({ row }) => {
                const isLocked = isManaged("case_dropdown", row.original.id)
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
                            navigator.clipboard.writeText(row.original.ref)
                          }
                        >
                          <CopyIcon className="mr-2 size-3" />
                          复制引用
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isLocked}
                          onClick={() => {
                            setSelectedDef(row.original)
                            setAction(DefinitionAction.Edit)
                          }}
                        >
                          <PencilIcon className="mr-2 size-3" />
                          编辑下拉字段
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-rose-500 focus:text-rose-600"
                          disabled={isLocked}
                          onClick={() => {
                            setSelectedDef(row.original)
                            setAction(DefinitionAction.Delete)
                          }}
                        >
                          <Trash2Icon className="mr-2 size-3" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              },
            },
          ]}
          toolbarProps={defaultToolbarProps}
        />
        {action === DefinitionAction.Delete && selectedDef && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除下拉字段</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除下拉字段 <strong>{selectedDef.name}</strong>
                吗？此操作无法撤销，将从事件中移除该字段的所有值。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={async () => {
                  if (selectedDef) {
                    try {
                      await onDeleteDefinition(selectedDef.id)
                      setSelectedDef(null)
                      setAction(null)
                    } catch (error) {
                      console.error("Failed to delete dropdown:", error)
                    }
                  }
                }}
                disabled={isDeleting}
              >
                <Trash2Icon className="mr-2 size-4" />
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
      {action === DefinitionAction.Edit && selectedDef && (
        <EditDefinitionDialog
          definition={selectedDef}
          onUpdate={onUpdateDefinition}
          onAddOption={onAddOption}
          onUpdateOption={onUpdateOption}
          onDeleteOption={onDeleteOption}
          onReorderOptions={onReorderOptions}
          isUpdating={isUpdating}
          onClose={handleCloseEdit}
        />
      )}
    </>
  )
}

/** Convert existing API options to local OptionInput shape */
function toOptionInput(
  opt: CaseDropdownOptionRead,
  localId: string
): OptionInput {
  return {
    id: localId,
    label: opt.label,
    icon_name: opt.icon_name ?? "",
    color: opt.color ?? "",
  }
}

interface EditOptionState extends OptionInput {
  /** Original API option ID, null for newly added options */
  apiId: string | null
}

function EditDefinitionDialog({
  definition,
  onUpdate,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onReorderOptions,
  isUpdating,
  onClose,
}: {
  definition: CaseDropdownDefinitionRead
  onUpdate: (
    definitionId: string,
    params: CaseDropdownDefinitionUpdate
  ) => Promise<void>
  onAddOption?: (
    definitionId: string,
    option: {
      label: string
      ref: string
      icon_name?: string
      color?: string
      position: number
    }
  ) => Promise<void>
  onUpdateOption?: (
    definitionId: string,
    optionId: string,
    option: {
      label?: string
      ref?: string
      icon_name?: string | null
      color?: string | null
      position?: number
    }
  ) => Promise<void>
  onDeleteOption?: (definitionId: string, optionId: string) => Promise<void>
  onReorderOptions?: (
    definitionId: string,
    optionIds: string[]
  ) => Promise<void>
  isUpdating?: boolean
  onClose: () => void
}) {
  const idPrefix = useId()
  const makeOptionId = useCallback(
    (n: number) => `${idPrefix}-edit-opt-${n}`,
    [idPrefix]
  )

  const [nextOptionId, setNextOptionId] = useState(
    () => (definition.options ?? []).length
  )

  const [options, setOptions] = useState<EditOptionState[]>(() => {
    return (definition.options ?? []).map((opt, i) => ({
      ...toOptionInput(opt, makeOptionId(i)),
      apiId: opt.id,
    }))
  })

  // Track the original options for diffing
  const [originalOptions] = useState(() =>
    (definition.options ?? []).map((opt) => ({
      id: opt.id,
      label: opt.label,
      ref: opt.ref,
      icon_name: opt.icon_name ?? "",
      color: opt.color ?? "",
    }))
  )

  const [isSaving, setIsSaving] = useState(false)

  const methods = useForm<CaseDropdownDefinitionUpdate>({
    resolver: zodResolver(updateDefinitionSchema),
    defaultValues: {
      name: definition.name,
      icon_name: definition.icon_name ?? "",
      is_ordered: definition.is_ordered,
    },
  })

  useEffect(() => {
    methods.reset({
      name: definition.name,
      icon_name: definition.icon_name ?? "",
      is_ordered: definition.is_ordered,
    })
  }, [methods, definition.name, definition.icon_name, definition.is_ordered])

  const isOrdered = methods.watch("is_ordered") ?? false

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleAddOption = () => {
    const id = makeOptionId(nextOptionId)
    setNextOptionId((n) => n + 1)
    setOptions([...options, { ...createEmptyOption(id), apiId: null }])
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleOptionChange = (
    index: number,
    field: keyof OptionInput,
    value: string
  ) => {
    const updated = [...options]
    updated[index] = { ...updated[index], [field]: value }
    setOptions(updated)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = options.findIndex((o) => o.id === active.id)
    const newIndex = options.findIndex((o) => o.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const updated = [...options]
    const [moved] = updated.splice(oldIndex, 1)
    updated.splice(newIndex, 0, moved)
    setOptions(updated)
  }

  const handleSave = async (formValues: CaseDropdownDefinitionUpdate) => {
    setIsSaving(true)
    try {
      const nextName = formValues.name?.trim() ?? definition.name
      const nextRef = slugify(nextName)
      if (!nextRef) {
        methods.setError("name", {
          type: "manual",
          message: "名称必须能生成有效引用（请使用字母或数字）",
        })
        return
      }

      const rawDefinitionIcon = formValues.icon_name?.trim() ?? ""
      const normalizedDefinitionIcon =
        resolveIconName(rawDefinitionIcon) ?? rawDefinitionIcon

      // 1. Update definition fields
      await onUpdate(definition.id, {
        name: nextName,
        ref: nextRef,
        icon_name: normalizedDefinitionIcon || null,
        is_ordered: formValues.is_ordered,
      })

      // 2. Delete removed options
      const currentApiIds = new Set(
        options.filter((o) => o.apiId).map((o) => o.apiId)
      )
      const deletedOptions = originalOptions.filter(
        (o) => !currentApiIds.has(o.id)
      )
      for (const opt of deletedOptions) {
        await onDeleteOption?.(definition.id, opt.id)
      }

      // 3. Add new options
      for (let i = 0; i < options.length; i++) {
        const opt = options[i]
        if (!opt.apiId && opt.label.trim()) {
          const rawIconName = opt.icon_name.trim()
          const normalizedIconName = resolveIconName(rawIconName) ?? rawIconName
          await onAddOption?.(definition.id, {
            label: opt.label.trim(),
            ref: slugify(opt.label),
            icon_name: normalizedIconName || undefined,
            color: opt.color.trim() || undefined,
            position: i,
          })
        }
      }

      // 4. Update changed existing options
      for (let i = 0; i < options.length; i++) {
        const opt = options[i]
        if (!opt.apiId) continue

        const orig = originalOptions.find((o) => o.id === opt.apiId)
        if (!orig) continue

        const trimmedLabel = opt.label.trim()
        const rawIconName = opt.icon_name.trim()
        const normalizedIconName = resolveIconName(rawIconName) ?? rawIconName
        const rawOrigIconName = orig.icon_name.trim()
        const normalizedOrigIconName =
          resolveIconName(rawOrigIconName) ?? rawOrigIconName
        const trimmedColor = opt.color.trim()

        const changed =
          orig.label !== trimmedLabel ||
          normalizedOrigIconName !== normalizedIconName ||
          orig.color !== trimmedColor

        if (changed) {
          const payload: {
            label?: string
            ref?: string
            icon_name?: string | null
            color?: string | null
          } = {}

          if (orig.label !== trimmedLabel && trimmedLabel) {
            payload.label = trimmedLabel
            payload.ref = slugify(trimmedLabel) || undefined
          }
          if (normalizedOrigIconName !== normalizedIconName) {
            payload.icon_name = normalizedIconName || null
          }
          if (orig.color !== trimmedColor) {
            payload.color = trimmedColor || null
          }

          if (Object.keys(payload).length === 0) continue
          await onUpdateOption?.(definition.id, opt.apiId, {
            ...payload,
          })
        }
      }

      // 5. Reorder if order changed
      const existingApiIds = options
        .filter((o) => o.apiId)
        .map((o) => o.apiId as string)
      const originalOrder = originalOptions.map((o) => o.id)
      const orderChanged =
        existingApiIds.length !== originalOrder.length ||
        existingApiIds.some((id, i) => id !== originalOrder[i])

      if (orderChanged && existingApiIds.length > 0) {
        await onReorderOptions?.(definition.id, existingApiIds)
      }

      onClose()
    } catch (error) {
      console.error("Error saving dropdown changes", error)
      methods.setError("name", {
        type: "manual",
        message: `保存更改出错：${String(error)}`,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const saving = isSaving || isUpdating

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="md" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑下拉字段</DialogTitle>
          <DialogDescription>
            编辑下拉字段的名称、图标、设置和选项。
          </DialogDescription>
        </DialogHeader>
        <Form {...methods}>
          <form
            onSubmit={methods.handleSubmit(handleSave)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <div className="flex items-start gap-3">
                <FormField
                  control={methods.control}
                  name="icon_name"
                  render={({ field }) => (
                    <FormItem className="mt-6">
                      <FormControl>
                        <IconPicker
                          className="size-9 shrink-0"
                          placeholder={"图标"}
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-sm">名称</FormLabel>
                      <FormControl>
                        <Input
                          className="text-sm"
                          placeholder={"名称"}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>最多 50 个字母或数字</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={methods.control}
                name="is_ordered"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">有序</FormLabel>
                      <FormDescription>
                        允许在事件列表中按此下拉字段排序
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <FormLabel className="text-sm">选项</FormLabel>
                <FormDescription>
                  拖动以调整顺序，可编辑各选项的标签、图标和颜色。
                </FormDescription>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={options.map((o) => o.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {options.map((opt, index) => (
                      <SortableOptionRow
                        key={opt.id}
                        opt={opt}
                        index={index}
                        isOrdered={isOrdered}
                        canRemove={options.length > 1}
                        onOptionChange={handleOptionChange}
                        onRemove={handleRemoveOption}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleAddOption}
                >
                  <PlusIcon className="mr-1 size-3.5" />
                  添加选项
                </Button>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                size="sm"
                type="submit"
                className="flex items-center gap-2"
                disabled={saving}
              >
                <PencilIcon className="size-4" />
                保存更改
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const defaultToolbarProps: DataTableToolbarProps<CaseDropdownDefinitionRead> = {
  filterProps: {
    placeholder: "按名称筛选下拉字段…",
    column: "name",
  },
}
