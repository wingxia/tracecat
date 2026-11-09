"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PlusCircle, Trash2Icon } from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import type { TableColumnCreate } from "@/client"
import { ApiError } from "@/client"
import { SqlTypeDisplay } from "@/components/data-type/sql-type-display"
import { ProtectedColumnsAlert } from "@/components/tables/protected-columns-alert"
import { MultiTagCommandInput } from "@/components/tags-input"
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TracecatApiError } from "@/lib/errors"
import { useCreateTable } from "@/lib/hooks"
import { SqlTypeCreatableEnum } from "@/lib/tables"
import { useWorkspaceId } from "@/providers/workspace-id"

const isSelectableColumnType = (type?: string) =>
  type === "SELECT" || type === "MULTI_SELECT"

const sanitizeColumnOptions = (options?: string[]) => {
  if (!options) return []
  const seen = new Set<string>()
  const cleaned: string[] = []
  for (const option of options) {
    const trimmed = option.trim()
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue
    }
    seen.add(trimmed)
    cleaned.push(trimmed)
  }
  return cleaned
}

const tableColumnSchema = z
  .object({
    name: z
      .string()
      .min(1, "列名称不能为空")
      .regex(/^[a-zA-Z_]/, "列名称必须以字母或下划线开头"),
    type: z.enum(SqlTypeCreatableEnum),
    options: z.array(z.string().min(1, "选项不能为空")).optional(),
  })
  .superRefine((column, ctx) => {
    if (isSelectableColumnType(column.type)) {
      const hasValidOptions = column.options && column.options.length > 0
      if (!hasValidOptions) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "请至少添加一个选项",
          path: ["options"],
        })
      }
    }
  })

const createTableSchema = z
  .object({
    name: z
      .string()
      .min(1, "名称不能为空")
      .max(100, "名称不能超过 100 个字符")
      .regex(
        /^[a-zA-Z_][a-zA-Z0-9_]*$/,
        "名称必须以字母或下划线开头，且只能包含字母、数字和下划线"
      ),
    columns: z.array(tableColumnSchema).min(1, "至少需要一列"),
  })
  .superRefine((data, ctx) => {
    // Check for duplicate column names - only show error on the last occurrence
    const columnNames = data.columns.map((col) => col.name.toLowerCase())
    const seen = new Set<string>()
    const duplicateIndices = new Map<string, number>() // Track last index for each duplicate name

    for (let i = 0; i < columnNames.length; i++) {
      const name = columnNames[i]
      if (seen.has(name)) {
        // This is a duplicate - update to track the latest occurrence
        duplicateIndices.set(name, i)
      } else {
        seen.add(name)
      }
    }

    // Add errors only for the last occurrence of each duplicate
    for (const [_, index] of duplicateIndices.entries()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "列名称必须唯一",
        path: ["columns", index, "name"],
      })
    }
  })

type CreateTableSchema = z.infer<typeof createTableSchema>

export function CreateTableDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const workspaceId = useWorkspaceId()
  const { createTable, createTableIsPending } = useCreateTable()

  const form = useForm<CreateTableSchema>({
    resolver: zodResolver(createTableSchema),
    defaultValues: {
      name: "",
      columns: [{ name: "", type: SqlTypeCreatableEnum[0], options: [] }],
    },
    mode: "onSubmit",
  })
  const { fields, append, remove } = useFieldArray<CreateTableSchema>({
    control: form.control,
    name: "columns",
  })

  const onSubmit = async (data: CreateTableSchema) => {
    try {
      if (data.columns.length === 0) {
        form.setError("columns", {
          type: "manual",
          message: "至少需要一列",
        })
        return
      }

      const payloadColumns: TableColumnCreate[] = data.columns.map(
        ({ name, type, options }) => {
          const columnPayload: TableColumnCreate = {
            name,
            type,
          }
          if (isSelectableColumnType(type)) {
            columnPayload.options = sanitizeColumnOptions(options)
          }
          return columnPayload
        }
      )

      await createTable({
        requestBody: {
          name: data.name,
          columns: payloadColumns,
        },
        workspaceId,
      })
      onOpenChange(false)
      form.reset()
    } catch (error) {
      if (error instanceof ApiError) {
        const apiError = error as TracecatApiError
        const detail =
          typeof apiError.body?.detail === "string"
            ? apiError.body.detail
            : typeof apiError.body?.detail === "object"
              ? JSON.stringify(apiError.body.detail)
              : error.message
        if (
          detail?.toLowerCase().includes("column") &&
          detail?.includes("already exists")
        ) {
          form.setError("columns", {
            type: "manual",
            message: "列名称与受保护的列（id、created_at、updated_at）冲突。",
          })
        } else if (error.status === 409) {
          form.setError("name", {
            type: "manual",
            message: "已存在同名数据表",
          })
        } else if (detail && error.status !== 500) {
          form.setError("root", { type: "manual", message: detail })
        } else {
          form.setError("root", {
            type: "manual",
            message: "创建数据表失败，请重试。",
          })
        }
      } else {
        form.setError("root", {
          type: "manual",
          message: "创建数据表失败，请重试。",
        })
        console.error("Error creating table:", error)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>创建数据表</DialogTitle>
          <DialogDescription>
            添加列并设置数据类型，以定义数据表结构。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <ProtectedColumnsAlert />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={"输入数据表名称…"}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      数据表名称，在工作空间内必须唯一。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="columns"
                  render={() => (
                    <FormItem>
                      <FormLabel>列</FormLabel>
                      <FormDescription>定义数据表的列。</FormDescription>
                      {fields.map((field, index) => {
                        const columnType = form.watch(`columns.${index}.type`)
                        const requiresOptions =
                          isSelectableColumnType(columnType)

                        return (
                          <div key={field.id} className="mb-2 flex items-start">
                            <div className="grid flex-1 grid-cols-3 gap-2">
                              <FormField
                                control={form.control}
                                name={`columns.${index}.name`}
                                render={({ field }) => (
                                  <FormItem className="col-span-2">
                                    <FormControl>
                                      <Input
                                        placeholder={"输入列名称…"}
                                        {...field}
                                        value={field.value ?? ""}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`columns.${index}.type`}
                                render={({ field }) => (
                                  <FormItem className="col-span-1">
                                    <FormControl>
                                      <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                      >
                                        <SelectTrigger className="[&>span]:!flex [&>span]:items-center">
                                          <SelectValue
                                            placeholder={"选择列类型"}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {SqlTypeCreatableEnum.map((type) => (
                                            <SelectItem key={type} value={type}>
                                              <SqlTypeDisplay
                                                type={type}
                                                labelClassName="text-xs"
                                              />
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              {requiresOptions && (
                                <FormField
                                  control={form.control}
                                  name={`columns.${index}.options`}
                                  render={({ field }) => (
                                    <FormItem className="col-span-3">
                                      <FormLabel>选项</FormLabel>
                                      <FormControl>
                                        <MultiTagCommandInput
                                          value={field.value || []}
                                          onChange={field.onChange}
                                          placeholder={"添加允许的值…"}
                                          allowCustomTags
                                          disableSuggestions
                                          className="w-full"
                                          searchKeys={["label"]}
                                        />
                                      </FormControl>
                                      <FormDescription className="text-xs">
                                        插入行时可用的值。
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              className="ml-2"
                              onClick={() => {
                                if (fields.length > 1) {
                                  remove(index)
                                }
                              }}
                              disabled={fields.length <= 1}
                              aria-label={"移除列"}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </div>
                        )
                      })}
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      name: "",
                      type: SqlTypeCreatableEnum[0],
                      options: [],
                    })
                  }
                  className="space-x-2 text-xs"
                  aria-label={"添加新列"}
                >
                  <PlusCircle className="mr-2 size-4" />
                  添加列
                </Button>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button size="sm" type="submit" disabled={createTableIsPending}>
                创建数据表
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
