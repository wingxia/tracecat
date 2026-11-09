"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { CopyIcon, PencilIcon, Tag, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import z from "zod"
import type { SyncResourceType, TagUpdate } from "@/client"
import { ColorPicker } from "@/components/color-picker"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useManagedResources } from "@/hooks/use-managed-resources"

const updateTagSchema = z.object({
  name: z
    .string()
    .min(1, "标签名称不能为空")
    .max(50, "标签名称不能超过 50 个字符")
    .trim()
    .refine((name) => name.trim().length > 0, "标签名称不能仅为空白字符")
    .optional(),
  color: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined
      }
      return value
    },
    z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "颜色必须是有效的十六进制色值")
      .optional()
  ),
})

const DEFAULT_TAG_COLOR = "#aabbcc"

enum TagItemAction {
  Edit = "edit",
  Delete = "delete",
}

/** Tag shape expected by the catalog table. */
interface TagItem {
  id: string
  name: string
  ref: string
  color?: string | null
}

interface TagCatalogTableProps {
  tags: TagItem[]
  onDeleteTag: (tagId: string) => Promise<void>
  onUpdateTag: (tagId: string, params: TagUpdate) => Promise<void>
  isDeleting?: boolean
  isUpdating?: boolean
  canUpdateTag?: boolean
  canDeleteTag?: boolean
  /** Resource label used in the delete confirmation, e.g. "workflows", "cases", "agents". */
  resourceLabel: string
  /**
   * Set when these tags can be managed by Tracecat (case tags). Managed tags
   * show a badge and cannot be edited or deleted.
   */
  managedResourceType?: SyncResourceType
}

export function TagCatalogTable({
  tags,
  onDeleteTag,
  onUpdateTag,
  isDeleting,
  isUpdating,
  canUpdateTag = true,
  canDeleteTag = true,
  resourceLabel,
  managedResourceType,
}: TagCatalogTableProps) {
  // Only catalogs whose tags can be managed (case tags) need the lookup.
  const { isManaged } = useManagedResources(undefined, {
    enabled: managedResourceType !== undefined,
  })
  function isLocked(tagId: string): boolean {
    return (
      managedResourceType !== undefined && isManaged(managedResourceType, tagId)
    )
  }
  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null)
  const [action, setAction] = useState<TagItemAction | null>(null)
  const isDialogOpen = action !== null && selectedTag !== null

  return (
    <AlertDialog
      open={isDialogOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedTag(null)
          setAction(null)
        }
      }}
    >
      <DataTable
        data={tags}
        columns={[
          {
            accessorKey: "name",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"标签名称"}
              />
            ),
            cell: ({ row }) => {
              const tag = row.original
              return (
                <div className="flex items-center gap-2">
                  <Tag
                    className="size-4"
                    style={{
                      fill: "transparent",
                      stroke: tag.color ?? DEFAULT_TAG_COLOR,
                    }}
                  />
                  <span className="text-xs text-foreground/80">{tag.name}</span>
                  {managedResourceType ? (
                    <ManagedResourceStatus
                      resourceType={managedResourceType}
                      id={tag.id}
                      name={tag.name}
                      showDetach
                    />
                  ) : null}
                </div>
              )
            },
            enableSorting: true,
            enableHiding: false,
          },
          {
            accessorKey: "color",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"颜色"}
              />
            ),
            cell: ({ row }) => (
              <div className="flex items-center gap-2">
                <div
                  className="size-4 rounded border"
                  style={{
                    backgroundColor: row.original.color ?? DEFAULT_TAG_COLOR,
                    borderColor: row.original.color ?? DEFAULT_TAG_COLOR,
                  }}
                />
                <span className="font-mono text-xs text-foreground/80">
                  {row.original.color ?? DEFAULT_TAG_COLOR}
                </span>
              </div>
            ),
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
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => (
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
                    {canUpdateTag && !isLocked(row.original.id) ? (
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedTag(row.original)
                            setAction(TagItemAction.Edit)
                          }}
                        >
                          <PencilIcon className="mr-2 size-3" />
                          编辑标签
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    ) : null}
                    {canDeleteTag && !isLocked(row.original.id) ? (
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-rose-500 focus:text-rose-600"
                          onClick={() => {
                            setSelectedTag(row.original)
                            setAction(TagItemAction.Delete)
                          }}
                        >
                          <Trash2Icon className="mr-2 size-3" />
                          删除
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ]}
        toolbarProps={defaultToolbarProps}
      />
      {action === TagItemAction.Delete && selectedTag && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除标签</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除标签 <strong>{selectedTag.name}</strong>
              吗？此操作无法撤销，并将从所有以下资源中移除此标签：{" "}
              {resourceLabel}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async (event) => {
                event.preventDefault()
                if (selectedTag) {
                  try {
                    await onDeleteTag(selectedTag.id)
                    setSelectedTag(null)
                    setAction(null)
                  } catch (error) {
                    console.error("Failed to delete tag:", error)
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
      {action === TagItemAction.Edit && selectedTag && (
        <EditTagDialogContent
          tag={selectedTag}
          onUpdate={onUpdateTag}
          isUpdating={isUpdating}
          onClose={() => {
            setSelectedTag(null)
            setAction(null)
          }}
        />
      )}
    </AlertDialog>
  )
}

function EditTagDialogContent({
  tag,
  onUpdate,
  isUpdating,
  onClose,
}: {
  tag: TagItem
  onUpdate: (tagId: string, params: TagUpdate) => Promise<void>
  isUpdating?: boolean
  onClose: () => void
}) {
  const methods = useForm<TagUpdate>({
    resolver: zodResolver(updateTagSchema),
    defaultValues: {
      name: tag.name,
      color: tag.color ?? "",
    },
  })

  useEffect(() => {
    methods.reset({
      name: tag.name,
      color: tag.color ?? "",
    })
  }, [methods, tag.color, tag.name])

  const handleEdit = async (params: TagUpdate) => {
    try {
      await onUpdate(tag.id, {
        name: params.name || undefined,
        color: params.color || undefined,
      })
      onClose()
    } catch (error) {
      console.error("Error updating tag:", error)
      methods.setError("name", {
        type: "manual",
        message: `更新标签出错：${String(error)}`,
      })
    }
  }

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>编辑标签</AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogDescription>编辑标签的名称和颜色。</AlertDialogDescription>
      <Form {...methods}>
        <form onSubmit={methods.handleSubmit(handleEdit)}>
          <div className="space-y-4">
            <FormField
              key="name"
              control={methods.control}
              name="name"
              defaultValue={tag.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">名称</FormLabel>
                  <FormControl>
                    <Input
                      className="text-sm"
                      placeholder={"名称"}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              key="color"
              control={methods.control}
              name="color"
              defaultValue={tag.color ?? ""}
              render={({ field }) => {
                const displayColor =
                  field.value && field.value.length > 0
                    ? field.value
                    : "#000000"
                return (
                  <FormItem>
                    <FormLabel className="text-sm">颜色</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          className="max-w-24 font-mono text-sm"
                          placeholder="#000000"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <ColorPicker
                        value={displayColor}
                        onChange={(color) => field.onChange(color)}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdating}>取消</AlertDialogCancel>
              <Button
                type="submit"
                className="flex items-center gap-2"
                disabled={isUpdating}
              >
                <PencilIcon className="size-4" />
                保存更改
              </Button>
            </AlertDialogFooter>
          </div>
        </form>
      </Form>
    </AlertDialogContent>
  )
}

const defaultToolbarProps: DataTableToolbarProps<TagItem> = {
  filterProps: {
    placeholder: "按名称筛选标签…",
    column: "name",
  },
}
