"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { type ControllerRenderProps, useForm } from "react-hook-form"
import { z } from "zod"
import { ApiError, type CaseFieldKind, casesCreateField } from "@/client"
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
import {
  createCaseFieldReference,
  createUniqueCaseFieldReference,
} from "@/lib/case-field-display"
import { invalidateCaseFieldQueries } from "@/lib/cases/invalidation"
import { CASE_FIELD_KIND_CONFIG } from "@/lib/data-type"
import type { TracecatApiError } from "@/lib/errors"
import { useCaseFields } from "@/lib/hooks"
import { useQueryClient } from "@/lib/query"
import { type SqlTypeCreatable, SqlTypeCreatableEnum } from "@/lib/tables"
import { useWorkspaceId } from "@/providers/workspace-id"

/** Options for the case field type picker (SQL types + kind-based semantic types). */
interface CaseFieldTypeOption {
  value: string
  type: SqlTypeCreatable
  kind: CaseFieldKind | null
}

const CASE_FIELD_TYPE_OPTIONS: CaseFieldTypeOption[] = [
  { value: "TEXT", type: "TEXT", kind: null },
  { value: "LONG_TEXT", type: "TEXT", kind: "LONG_TEXT" },
  { value: "INTEGER", type: "INTEGER", kind: null },
  { value: "NUMERIC", type: "NUMERIC", kind: null },
  { value: "BOOLEAN", type: "BOOLEAN", kind: null },
  { value: "DATE", type: "DATE", kind: null },
  { value: "TIMESTAMPTZ", type: "TIMESTAMPTZ", kind: null },
  { value: "JSONB", type: "JSONB", kind: null },
  { value: "URL", type: "JSONB", kind: "URL" },
  { value: "SELECT", type: "SELECT", kind: null },
  { value: "MULTI_SELECT", type: "MULTI_SELECT", kind: null },
]

function findTypeOption(value: string): CaseFieldTypeOption | undefined {
  return CASE_FIELD_TYPE_OPTIONS.find((opt) => opt.value === value)
}

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

const caseFieldFormSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "字段名称不能为空")
      .max(255, "字段名称不能超过 255 个字符")
      .refine(
        (value) => createCaseFieldReference(value).length > 0,
        "字段名称必须至少包含一个拉丁字母或数字"
      ),
    type: z.enum(SqlTypeCreatableEnum),
    kind: z.enum(["LONG_TEXT", "URL"]).nullable().optional(),
    nullable: z.boolean().default(true),
    default: z.string().nullable().optional(),
    defaultMulti: z.array(z.string()).optional(), // For MULTI_SELECT defaults
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

      // Validate default value(s) are in options
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

interface AddCustomFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCustomFieldDialog({
  open,
  onOpenChange,
}: AddCustomFieldDialogProps) {
  const workspaceId = useWorkspaceId()
  const queryClient = useQueryClient()
  const { caseFields } = useCaseFields(workspaceId, open)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CaseFieldFormValues>({
    resolver: zodResolver(caseFieldFormSchema),
    defaultValues: {
      displayName: "",
      type: "TEXT",
      kind: null,
      nullable: true,
      default: null,
      defaultMulti: [],
      options: [],
    },
  })
  const selectedType = form.watch("type")
  const selectedKind = form.watch("kind")
  const displayName = form.watch("displayName")
  const existingReferences = new Set(caseFields?.map((field) => field.id))
  const fieldReference = createUniqueCaseFieldReference(
    displayName,
    existingReferences
  )
  const requiresOptions = isSelectableColumnType(selectedType)
  const pickerValue = selectedKind ?? selectedType

  useEffect(() => {
    form.setValue("default", "")
    form.setValue("defaultMulti", [])
    form.clearErrors("default")
    form.clearErrors("defaultMulti")
    // Clear options when switching away from SELECT/MULTI_SELECT
    if (!isSelectableColumnType(selectedType)) {
      form.setValue("options", [])
      form.clearErrors("options")
    }
  }, [form, selectedType, selectedKind])

  const onSubmit = async (data: CaseFieldFormValues) => {
    setIsSubmitting(true)
    try {
      let defaultValue: string | number | boolean | string[] | null = null
      const rawDefault = data.default

      // Handle MULTI_SELECT separately - it uses defaultMulti (array)
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

      await casesCreateField({
        workspaceId,
        requestBody: {
          name: createUniqueCaseFieldReference(
            data.displayName,
            existingReferences
          ),
          display_name: data.displayName,
          type: data.type,
          nullable: data.nullable,
          default: defaultValue,
          options: isSelectableColumnType(data.type)
            ? sanitizeColumnOptions(data.options)
            : null,
          kind: data.kind ?? null,
        },
      })

      await invalidateCaseFieldQueries(queryClient, workspaceId)

      toast({
        title: "已创建字段",
        description: "已成功创建事件字段。",
      })

      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create case field", error)
      if (error instanceof ApiError) {
        const apiError = error as TracecatApiError
        if (apiError.status === 409) {
          // Duplicate field error - show inline error only, no toast
          form.setError("displayName", {
            type: "manual",
            message: "已存在同名字段",
          })
        }
      } else {
        toast({
          title: "创建字段出错",
          description: "创建事件字段失败，请重试。",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>创建字段</DialogTitle>
          <DialogDescription>为事件创建自定义字段。</DialogDescription>
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input placeholder={"分析师结论"} {...field} />
                    </FormControl>
                    <FormDescription>
                      引用： {fieldReference || "输入名称"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>数据类型</FormLabel>
                <Select
                  value={pickerValue}
                  onValueChange={(value) => {
                    const opt = findTypeOption(value)
                    if (opt) {
                      form.setValue("type", opt.type)
                      form.setValue("kind", opt.kind ?? null)
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={"选择数据类型"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CASE_FIELD_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.kind ? (
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            {(() => {
                              const Icon = CASE_FIELD_KIND_CONFIG[opt.kind].icon
                              return <Icon className="size-4 shrink-0" />
                            })()}
                            <span className="text-xs font-normal leading-none whitespace-nowrap">
                              {CASE_FIELD_KIND_CONFIG[opt.kind].label}
                            </span>
                          </span>
                        ) : (
                          <SqlTypeDisplay
                            type={opt.type}
                            labelClassName="text-xs"
                          />
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>此字段的数据类型。</FormDescription>
                <FormMessage />
              </FormItem>

              {requiresOptions && (
                <FormField
                  control={form.control}
                  name="options"
                  render={({ field }) => (
                    <FormItem>
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
                      <FormDescription>定义此字段允许的值。</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {!selectedKind &&
                selectedType !== "JSONB" &&
                (selectedType === "MULTI_SELECT" ? (
                  <FormField
                    control={form.control}
                    name="defaultMulti"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>默认值（可选）</FormLabel>
                        <FormControl>
                          <MultiTagCommandInput
                            value={field.value || []}
                            onChange={field.onChange}
                            placeholder={"选择默认值…"}
                            suggestions={sanitizeColumnOptions(
                              form.watch("options")
                            ).map((opt) => ({
                              id: opt,
                              label: opt,
                              value: opt,
                            }))}
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>默认值（可选）</FormLabel>
                        <FormControl>
                          <DefaultValueInput
                            type={selectedType}
                            field={field}
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
                ))}
            </DialogBody>
            <DialogFooter>
              <Button size="sm" type="submit" disabled={isSubmitting}>
                创建字段
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
