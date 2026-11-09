"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { DialogProps } from "@radix-ui/react-dialog"
import { useEffect, useState } from "react"
import { FormProvider, useForm, useFormContext } from "react-hook-form"
import { z } from "zod"
import { ApiError } from "@/client"
import { Spinner } from "@/components/loading/spinner"
import { ProtectedColumnsAlert } from "@/components/tables/protected-columns-alert"
import { CsvPreview } from "@/components/tables/table-import-csv-dialog"
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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { TracecatApiError } from "@/lib/errors"
import { useImportTableFromCsv } from "@/lib/hooks"
import { type CsvPreviewData, getCsvPreview } from "@/lib/tables"
import { useWorkspaceId } from "@/providers/workspace-id"

const BYTES_PER_MB = 1024 * 1024
const FILE_SIZE_LIMIT_MB = 5

const tableImportSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => {
      if (file.size > FILE_SIZE_LIMIT_MB * BYTES_PER_MB) {
        return false
      }
      const lowerName = file.name?.toLowerCase() ?? ""
      return file.type === "text/csv" || lowerName.endsWith(".csv")
    },
    (file) => ({
      message: `请上传小于 5MB 的 CSV 文件，当前文件大小为 ${(file.size / BYTES_PER_MB).toFixed(2)}MB`,
    })
  ),
  tableName: z
    .string()
    .trim()
    .max(100, "名称不能超过 100 个字符")
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      "名称只能包含字母、数字和下划线，且必须以字母或下划线开头"
    )
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      if (!value) return undefined
      const trimmed = value.trim()
      return trimmed === "" ? undefined : trimmed
    }),
})

type TableImportFormValues = z.infer<typeof tableImportSchema>

interface TableImportTableDialogProps extends DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TableImportTableDialog({
  open,
  onOpenChange,
}: TableImportTableDialogProps) {
  const workspaceId = useWorkspaceId()
  const { importTable, importTableIsPending } = useImportTableFromCsv()
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const form = useForm<TableImportFormValues>({
    resolver: zodResolver(tableImportSchema),
    defaultValues: {
      tableName: "",
    },
  })

  useEffect(() => {
    if (!open) {
      setCsvPreview(null)
      form.reset()
    }
  }, [open, form])

  const createPreview = async (file: File) => {
    try {
      setIsParsing(true)
      setCsvPreview(null)
      const parsed = await getCsvPreview(file)
      setCsvPreview(parsed)
    } catch (error) {
      console.error("Failed to parse CSV preview:", error)
      form.setError("file", {
        type: "manual",
        message: "无法读取 CSV 文件，请检查文件格式。",
      })
    } finally {
      setIsParsing(false)
    }
  }

  const handleSubmit = async (values: TableImportFormValues) => {
    try {
      const file = values.file
      if (!file) {
        form.setError("file", {
          type: "manual",
          message: "请选择要导入的 CSV 文件。",
        })
        return
      }

      await importTable({
        workspaceId,
        formData: {
          file,
          table_name: values.tableName ?? null,
        },
      })

      onOpenChange?.(false)
      form.reset()
      setCsvPreview(null)
    } catch (error) {
      if (error instanceof ApiError) {
        const apiError = error as TracecatApiError
        const detail =
          typeof apiError.body.detail === "string"
            ? apiError.body.detail
            : typeof apiError.body.detail === "object"
              ? JSON.stringify(apiError.body.detail)
              : undefined
        let message: string
        if (
          detail?.toLowerCase().includes("column") &&
          detail?.includes("already exists")
        ) {
          message =
            "CSV 中的列与现有列冲突，请检查是否使用了 id、created_at 或 updated_at 等受保护名称。"
        } else if (detail?.includes("already exists")) {
          message = "已存在同名数据表。"
        } else if (detail && error.status !== 500) {
          message = detail
        } else {
          message = "导入数据表失败，请检查 CSV 文件后重试。"
        }
        form.setError("file", { type: "manual", message })
      } else {
        console.error("Unexpected error importing table:", error)
        form.setError("file", {
          type: "manual",
          message: "导入数据表失败",
        })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>从 CSV 导入数据表</DialogTitle>
          <DialogDescription>
            上传 CSV 文件以创建数据表，系统会自动推断列和数据类型。
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <ProtectedColumnsAlert />
              <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSV 文件</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".csv,text/csv"
                        className="min-h-9 w-full py-2"
                        onChange={async (event) => {
                          const file = event.target.files?.[0]
                          if (!file) {
                            field.onChange(undefined)
                            setCsvPreview(null)
                            return
                          }
                          field.onChange(file)
                          await createPreview(file)
                        }}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormDescription>
                      支持的 CSV 文件大小上限为 {FILE_SIZE_LIMIT_MB}MB。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {csvPreview && (
                <div className="space-y-2">
                  <CsvPreview csvData={csvPreview} />
                  <p className="text-xs text-muted-foreground">
                    列名称会自动规范化，重复或无效的列名会被调整以保持唯一。
                  </p>
                </div>
              )}

              <TableNameField />
            </DialogBody>
            <DialogFooter>
              <div className="text-xs text-muted-foreground">
                数据表名称留空时，将根据文件名生成。
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  type="submit"
                  disabled={importTableIsPending || isParsing}
                >
                  {importTableIsPending || isParsing ? (
                    <>
                      <Spinner className="mr-2" />
                      导入中…
                    </>
                  ) : (
                    "导入数据表"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}

function TableNameField() {
  const form = useFormContext<TableImportFormValues>()

  return (
    <FormField
      control={form.control}
      name="tableName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>数据表名称（可选）</FormLabel>
          <FormControl>
            <Input
              placeholder={"输入数据表名称或留空"}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
