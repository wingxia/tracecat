"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { type ControllerRenderProps, useForm } from "react-hook-form"
import { z } from "zod"
import { ApiError, type CaseFieldReadMinimal, casesUpdateField } from "@/client"
import { SqlTypeDisplay } from "@/components/data-type/sql-type-display"
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
import { toast } from "@/components/ui/use-toast"
import { invalidateCaseFieldQueries } from "@/lib/cases/invalidation"
import { getCaseFieldTypeConfig } from "@/lib/data-type"
import type { TracecatApiError } from "@/lib/errors"
import { useQueryClient } from "@/lib/query"
import { type SqlTypeCreatable, SqlTypeCreatableEnum } from "@/lib/tables"
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

const isSqlTypeCreatable = (value: string): value is SqlTypeCreatable =>
  SqlTypeCreatableEnum.includes(value as SqlTypeCreatable)

const parseMultiSelectDefault = (value: string | null): string[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string")
    }
  } catch {
    // Ignore parse errors and treat as no default values.
  }
  return []
}

const caseFieldFormSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "字段名称不能为空")
      .max(255, "字段名称不能超过 255 个字符"),
    reference: z
      .string()
      .trim()
      .min(1, "引用不能为空")
      .max(100, "引用不能超过 100 个字符")
      .regex(
        /^[a-zA-Z_][a-zA-Z0-9_]*$/,
        "引用必须以字母或下划线开头，且只能包含字母、数字和下划线"
      ),
    type: z.enum(SqlTypeCreatableEnum),
    nullable: z.boolean().default(true),
    default: z.string().nullable().optional(),
    defaultMulti: z.array(z.string()).optional(),
    options: z.array(z.string().min(1, "选项不能为空")).optional(),
  })
  .superRefine((data, ctx) => {
    if (isSelectableColumnType(data.type)) {
      const sanitizedOptions = sanitizeColumnOptions(data.options)
      if (sanitizedOptions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "请至少添加一个选项",
          path: ["options"],
        })
      }

      if (data.type === "SELECT") {
        const defaultVal = data.default?.trim()
        if (defaultVal && defaultVal.length > 0) {
          if (!sanitizedOptions.includes(defaultVal)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "默认值必须是已定义的选项之一",
              path: ["default"],
            })
          }
        }
      } else if (data.type === "MULTI_SELECT") {
        const defaultVals = data.defaultMulti || []
        for (const val of defaultVals) {
          if (!sanitizedOptions.includes(val)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `“${val}”不在已定义的选项中`,
              path: ["defaultMulti"],
            })
            break
          }
        }
      }
    }
  })

type CaseFieldFormValues = z.infer<typeof caseFieldFormSchema>

interface EditCustomFieldDialogProps {
  open: boolean
  field: CaseFieldReadMinimal | null
  onOpenChange: (open: boolean) => void
}

const emptyDefaults: CaseFieldFormValues = {
  displayName: "",
  reference: "",
  type: "TEXT",
  nullable: true,
  default: null,
  defaultMulti: [],
  options: [],
}

function getFormDefaults(field: CaseFieldReadMinimal): CaseFieldFormValues {
  const safeType = isSqlTypeCreatable(field.type) ? field.type : "TEXT"
  const sanitizedOptions = sanitizeColumnOptions(field.options ?? [])

  if (safeType === "MULTI_SELECT") {
    return {
      displayName: field.display_name,
      reference: field.id,
      type: safeType,
      nullable: field.nullable,
      default: "",
      defaultMulti: parseMultiSelectDefault(field.default),
      options: sanitizedOptions,
    }
  }

  return {
    displayName: field.display_name,
    reference: field.id,
    type: safeType,
    nullable: field.nullable,
    default: field.default ?? "",
    defaultMulti: [],
    options: sanitizedOptions,
  }
}

export function EditCustomFieldDialog({
  open,
  field,
  onOpenChange,
}: EditCustomFieldDialogProps) {
  const workspaceId = useWorkspaceId()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CaseFieldFormValues>({
    resolver: zodResolver(caseFieldFormSchema),
    defaultValues: emptyDefaults,
  })

  const selectedType = form.watch("type")
  const requiresOptions = isSelectableColumnType(selectedType)

  useEffect(() => {
    if (!field || !open) {
      return
    }
    const defaults = getFormDefaults(field)
    form.reset(defaults)
  }, [field, form, open])

  const onSubmit = async (data: CaseFieldFormValues) => {
    if (!field) return

    setIsSubmitting(true)
    try {
      let defaultValue: string | number | boolean | string[] | null = null
      const rawDefault = data.default

      if (data.type === "MULTI_SELECT") {
        const multiDefaults = data.defaultMulti || []
        if (multiDefaults.length > 0) {
          defaultValue = multiDefaults
        }
      } else if (
        rawDefault !== null &&
        rawDefault !== undefined &&
        rawDefault !== ""
      ) {
        switch (data.type) {
          case "INTEGER": {
            const normalized =
              typeof rawDefault === "string" ? rawDefault.trim() : rawDefault
            if (typeof normalized === "string" && normalized.length === 0) {
              form.setError("default", {
                type: "manual",
                message: "默认值必须是整数",
              })
              setIsSubmitting(false)
              return
            }
            const parsed =
              typeof normalized === "number" ? normalized : Number(normalized)
            if (!Number.isInteger(parsed)) {
              form.setError("default", {
                type: "manual",
                message: "默认值必须是整数",
              })
              setIsSubmitting(false)
              return
            }
            defaultValue = parsed
            break
          }
          case "NUMERIC": {
            const normalized =
              typeof rawDefault === "string" ? rawDefault.trim() : rawDefault
            if (typeof normalized === "string" && normalized.length === 0) {
              form.setError("default", {
                type: "manual",
                message: "默认值必须是数字",
              })
              setIsSubmitting(false)
              return
            }
            const parsed =
              typeof normalized === "number" ? normalized : Number(normalized)
            if (Number.isNaN(parsed)) {
              form.setError("default", {
                type: "manual",
                message: "默认值必须是数字",
              })
              setIsSubmitting(false)
              return
            }
            defaultValue = parsed
            break
          }
          case "BOOLEAN": {
            const normalized = String(rawDefault).trim().toLowerCase()
            if (normalized === "true" || normalized === "1") {
              defaultValue = true
            } else if (normalized === "false" || normalized === "0") {
              defaultValue = false
            } else {
              form.setError("default", {
                type: "manual",
                message: "使用 true、false、1 或 0",
              })
              setIsSubmitting(false)
              return
            }
            break
          }
          case "TIMESTAMPTZ": {
            const iso =
              typeof rawDefault === "string"
                ? rawDefault
                : new Date(rawDefault).toISOString()
            const parsed = new Date(iso)
            if (Number.isNaN(parsed.getTime())) {
              form.setError("default", {
                type: "manual",
                message: "选择有效的日期和时间",
              })
              setIsSubmitting(false)
              return
            }
            defaultValue = parsed.toISOString()
            break
          }
          case "SELECT": {
            defaultValue = String(rawDefault)
            break
          }
          default: {
            defaultValue = String(rawDefault).trim()
          }
        }
      }

      await casesUpdateField({
        workspaceId,
        fieldId: field.id,
        requestBody: {
          ...(data.reference !== field.id ? { name: data.reference } : {}),
          display_name: data.displayName,
          nullable: data.nullable,
          default: defaultValue,
          options: isSelectableColumnType(data.type)
            ? sanitizeColumnOptions(data.options)
            : null,
        },
      })

      await invalidateCaseFieldQueries(queryClient, workspaceId)

      toast({
        title: "已更新字段",
        description: "已成功更新事件字段。",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update case field", error)
      if (error instanceof ApiError) {
        const apiError = error as TracecatApiError
        if (apiError.status === 409) {
          form.setError("reference", {
            type: "manual",
            message: "已存在相同引用的字段",
          })
          return
        }
      }
      toast({
        title: "更新字段出错",
        description: "更新事件字段失败，请重试。",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!field) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑自定义字段</DialogTitle>
          <DialogDescription>更新此事件自定义字段。</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <FormField
                control={form.control}
                name="displayName"
                render={({ field: fieldInput }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input {...fieldInput} />
                    </FormControl>
                    <FormDescription>在产品中显示的易读标签。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field: fieldInput }) => (
                  <FormItem>
                    <FormLabel>引用</FormLabel>
                    <FormControl>
                      <Input {...fieldInput} className="font-mono" />
                    </FormControl>
                    <FormDescription>
                      用于 API 和工作流，修改可能破坏现有引用。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field: fieldInput }) => {
                  const typeConfig = getCaseFieldTypeConfig(
                    fieldInput.value,
                    field?.kind
                  )
                  const Icon = typeConfig?.icon
                  return (
                    <FormItem>
                      <FormLabel>数据类型</FormLabel>
                      <FormControl>
                        <div className="flex h-10 items-center rounded-md border border-input px-3 text-xs">
                          {field?.kind && Icon ? (
                            <span className="inline-flex items-center gap-2 whitespace-nowrap">
                              <Icon className="size-4 shrink-0" />
                              <span className="text-xs font-normal leading-none whitespace-nowrap">
                                {typeConfig?.label}
                              </span>
                            </span>
                          ) : (
                            <SqlTypeDisplay
                              type={fieldInput.value}
                              labelClassName="text-xs"
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        字段创建后无法更改数据类型。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              {requiresOptions && (
                <FormField
                  control={form.control}
                  name="options"
                  render={({ field: fieldInput }) => (
                    <FormItem>
                      <FormLabel>选项</FormLabel>
                      <FormControl>
                        <MultiTagCommandInput
                          value={fieldInput.value || []}
                          onChange={fieldInput.onChange}
                          placeholder={"添加允许的值…"}
                          allowCustomTags
                          disableSuggestions
                          className="w-full"
                          searchKeys={["label"]}
                        />
                      </FormControl>
                      <FormDescription>定义此字段允许的值。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedType === "MULTI_SELECT" ? (
                <FormField
                  control={form.control}
                  name="defaultMulti"
                  render={({ field: fieldInput }) => (
                    <FormItem>
                      <FormLabel>默认值（可选）</FormLabel>
                      <FormControl>
                        <MultiTagCommandInput
                          value={fieldInput.value || []}
                          onChange={fieldInput.onChange}
                          placeholder={"选择默认值…"}
                          suggestions={sanitizeColumnOptions(
                            form.watch("options")
                          ).map((opt) => ({ id: opt, label: opt, value: opt }))}
                          searchKeys={["label"]}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        从上述选项中选择默认值。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="default"
                  render={({ field: fieldInput }) => (
                    <FormItem>
                      <FormLabel>默认值（可选）</FormLabel>
                      <FormControl>
                        <DefaultValueInput
                          type={selectedType}
                          field={fieldInput}
                          options={form.watch("options")}
                        />
                      </FormControl>
                      <FormDescription>
                        {getDefaultHelperText(selectedType)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </DialogBody>
            <DialogFooter>
              <Button size="sm" type="submit" disabled={isSubmitting}>
                保存更改
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function getDefaultHelperText(type: SqlTypeCreatable | undefined) {
  switch (type) {
    case "INTEGER":
      return "可选的整数，用于填充缺失值。"
    case "NUMERIC":
      return "未提供值时使用的可选数值，允许小数。"
    case "BOOLEAN":
      return "接受 true、false、1 或 0。留空则不设默认值。"
    case "TIMESTAMPTZ":
      return "选择 ISO 8601 日期和时间（以 UTC 存储）。"
    case "SELECT":
      return "从上述选项中选择默认值。"
    default:
      return "未提供值时使用的可选文本。"
  }
}

function DefaultValueInput({
  type,
  field,
  options,
}: {
  type: SqlTypeCreatable | undefined
  field: ControllerRenderProps<CaseFieldFormValues, "default">
  options?: string[]
}) {
  const resolvedType: SqlTypeCreatable = type ?? "TEXT"
  const sanitizedOptions = sanitizeColumnOptions(options)

  switch (resolvedType) {
    case "INTEGER":
      return (
        <Input
          type="text"
          inputMode="numeric"
          value={field.value ?? ""}
          onChange={(event) => field.onChange(event.target.value)}
          placeholder={"输入整数"}
        />
      )
    case "NUMERIC":
      return (
        <Input
          type="text"
          inputMode="decimal"
          value={field.value ?? ""}
          onChange={(event) => field.onChange(event.target.value)}
          placeholder={"输入数字"}
        />
      )
    case "BOOLEAN":
      return (
        <Input
          type="text"
          value={field.value ?? ""}
          onChange={(event) => field.onChange(event.target.value)}
          placeholder={"true、false、1 或 0"}
        />
      )
    case "TIMESTAMPTZ":
      return (
        <Input
          type="text"
          value={field.value ?? ""}
          onChange={(event) => field.onChange(event.target.value)}
          placeholder="YYYY-MM-DDTHH:mm:ss.Z"
        />
      )
    case "SELECT":
      return (
        <Select
          value={field.value ?? ""}
          onValueChange={(value) =>
            field.onChange(value === "__none__" ? "" : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={"选择默认值"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">无默认值</SelectItem>
            {sanitizedOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    default:
      return (
        <Input
          type="text"
          value={field.value ?? ""}
          onChange={(event) => field.onChange(event.target.value)}
          placeholder={"输入默认文本"}
        />
      )
  }
}
