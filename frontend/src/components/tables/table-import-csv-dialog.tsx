"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { DialogProps } from "@radix-ui/react-dialog"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { FormProvider, useForm, useFormContext } from "react-hook-form"
import { z } from "zod"
import { ApiError, type TableRead } from "@/client"
import { SqlTypeDisplay } from "@/components/data-type/sql-type-display"
import { Spinner } from "@/components/loading/spinner"
import { ProtectedColumnsAlert } from "@/components/tables/protected-columns-alert"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import type { SqlType } from "@/lib/data-type"
import type { TracecatApiError } from "@/lib/errors"
import { useGetTable, useImportCsv } from "@/lib/hooks"
import {
  type CsvPreviewData,
  getCsvPreview,
  resolveColumnMapping,
} from "@/lib/tables"
import { useWorkspaceId } from "@/providers/workspace-id"

const BYTES_PER_MB = 1024 * 1024
const FILE_SIZE_LIMIT_MB = 5

// Form schema for Csv import
const csvImportSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => {
      // Check file size (5MB limit)
      if (file.size > FILE_SIZE_LIMIT_MB * BYTES_PER_MB) {
        return false
      }
      // Check file type
      return file.type === "text/csv" || file.name.endsWith(".csv")
    },
    (file) => ({
      message: `请上传小于 5MB 的 CSV 文件，当前文件大小为 ${(file.size / BYTES_PER_MB).toFixed(2)}MB`,
    })
  ),
  columnMapping: z
    .record(z.string(), z.string())
    .refine(
      (mapping) =>
        Object.values(mapping).some(
          (value) => typeof value === "string" && value !== "skip"
        ),
      "请至少映射一列"
    ),
})

type CsvImportFormValues = z.infer<typeof csvImportSchema>

interface TableImportCsvDialogProps extends DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TableImportCsvDialog({
  open,
  onOpenChange,
}: TableImportCsvDialogProps) {
  const params = useParams<{ tableId: string }>()
  const tableId = params?.tableId
  const workspaceId = useWorkspaceId()
  const { table } = useGetTable({
    tableId: tableId ?? "",
    workspaceId,
  })
  const { importCsv, importCsvIsPending } = useImportCsv()

  const [isUploading, setIsUploading] = useState(false)
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})

  const form = useForm<CsvImportFormValues>({
    resolver: zodResolver(csvImportSchema),
    defaultValues: {
      columnMapping: {},
    },
  })

  useEffect(() => {
    if (!csvPreview || !table) {
      return
    }

    const currentMapping = columnMapping
    const nextMapping = resolveColumnMapping(
      csvPreview.headers,
      table.columns.map((column) => column.name),
      currentMapping
    )

    const needsUpdate =
      csvPreview.headers.some(
        (header) => currentMapping[header] !== nextMapping[header]
      ) ||
      Object.keys(currentMapping).some(
        (header) => !csvPreview.headers.includes(header)
      )
    if (!needsUpdate) {
      return
    }

    setColumnMapping(nextMapping)
    form.setValue("columnMapping", nextMapping, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [columnMapping, csvPreview, form, table])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCsvPreview(null)
      setColumnMapping({})
      form.reset()
    }
  }, [open, form])

  const handleCreatePreview = useCallback(async () => {
    const { file } = form.getValues()
    try {
      setIsUploading(true)
      setColumnMapping({})
      form.setValue("columnMapping", {})
      const parsedData = await getCsvPreview(file)
      setCsvPreview(parsedData)
    } catch (error) {
      console.error("Error parsing CSV preview:", error)
      toast({
        title: "错误",
        description: "解析 CSV 文件失败",
      })
    } finally {
      setIsUploading(false)
    }
  }, [form])

  const onSubmit = async ({ file }: CsvImportFormValues) => {
    if (!csvPreview || !table) return

    try {
      const finalColumnMapping = resolveColumnMapping(
        csvPreview.headers,
        table.columns.map((column) => column.name),
        columnMapping
      )
      const hasMappedColumns = Object.values(finalColumnMapping).some(
        (value) => value !== "skip"
      )
      if (!hasMappedColumns) {
        form.setError("root", {
          type: "manual",
          message: "导入前请至少映射一列。",
        })
        return
      }
      const response = await importCsv({
        formData: {
          file,
          column_mapping: JSON.stringify(finalColumnMapping),
        },
        tableId: tableId ?? "",
        workspaceId,
      })
      toast({
        title: "导入成功",
        description: `已导入 ${response.rows_inserted} 行`,
      })
      onOpenChange?.(false)
    } catch (error) {
      console.error("Error importing data:", error)
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
        } else if (detail && error.status !== 500) {
          message = detail
        } else {
          message = "导入数据失败，请检查 CSV 文件后重试。"
        }
        form.setError("root", { type: "manual", message })
      } else {
        form.setError("root", {
          type: "manual",
          message: "导入数据失败，请重试。",
        })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="max-w-3xl"
        aria-describedby="csv-import-description"
      >
        <DialogHeader>
          <DialogTitle>从 CSV 导入</DialogTitle>
          <DialogDescription>从 CSV 文件向数据表导入数据。</DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <ProtectedColumnsAlert />
              <div className="space-y-6">
                {!csvPreview ? (
                  <CsvUploadForm />
                ) : (
                  <>
                    <CsvPreview csvData={csvPreview} />
                    {table && (
                      <ColumnMapping
                        csvData={csvPreview}
                        table={table}
                        columnMapping={columnMapping}
                        onChange={(header, value) => {
                          const nextMapping = {
                            ...columnMapping,
                            [header]: value,
                          }
                          setColumnMapping(nextMapping)
                          form.setValue("columnMapping", nextMapping, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </DialogBody>

            {!csvPreview && (
              <DialogFooter>
                <Button
                  size="sm"
                  type="button"
                  onClick={async () => {
                    const isValid = await form.trigger("file")
                    if (!isValid) return
                    handleCreatePreview()
                  }}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Spinner className="mr-2" />
                      上传中…
                    </>
                  ) : (
                    "下一页"
                  )}
                </Button>
              </DialogFooter>
            )}

            {csvPreview && (
              <DialogFooter>
                {form.formState.errors.root && (
                  <div className="mr-auto text-sm text-red-500">
                    {form.formState.errors.root.message}
                  </div>
                )}
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCsvPreview(null)
                    setColumnMapping({})
                    form.reset({ columnMapping: {} })
                  }}
                >
                  返回
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={
                    importCsvIsPending ||
                    !Object.values(columnMapping).some(
                      (value) => value !== "skip"
                    )
                  }
                >
                  {importCsvIsPending ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      导入中…
                    </>
                  ) : (
                    "导入数据"
                  )}
                </Button>
              </DialogFooter>
            )}
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}

function CsvUploadForm() {
  const form = useFormContext<CsvImportFormValues>()
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="file"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CSV 文件</FormLabel>
            <FormControl>
              <Input
                type="file"
                accept=".csv"
                className="min-h-9 py-2"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    field.onChange(file)
                  }
                }}
              />
            </FormControl>
            <FormDescription>
              上传文件（最大 {FILE_SIZE_LIMIT_MB}MB）
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

interface CsvPreviewProps {
  csvData: CsvPreviewData
}

export function CsvPreview({ csvData }: CsvPreviewProps) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">预览</span>
        <span className="text-xs text-muted-foreground">
          {csvData.headers.length} 列 · {csvData.preview.length} 行
        </span>
      </div>
      <div className="no-scrollbar max-h-[240px] overflow-auto rounded-md border border-border/50">
        <table className="w-full min-w-max table-auto border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-[40px] border-b border-r border-border/30 bg-muted px-3 py-2 text-left font-medium text-muted-foreground">
                #
              </th>
              {csvData.headers.map((header) => (
                <th
                  key={header}
                  className="sticky top-0 z-10 min-w-[120px] max-w-[200px] whitespace-nowrap border-b border-border/30 bg-muted px-3 py-2 text-left font-medium"
                >
                  <div className="truncate" title={header}>
                    {header}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {csvData.preview.map((row, i) => (
              <tr key={i}>
                <td className="sticky left-0 z-10 border-r border-border/30 bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                  {i + 1}
                </td>
                {csvData.headers.map((header) => {
                  const cellValue = row[header]
                  const isObject =
                    typeof cellValue === "object" && cellValue !== null
                  const fullValue = isObject
                    ? JSON.stringify(cellValue)
                    : String(cellValue ?? "")
                  const displayValue =
                    fullValue.length > 80
                      ? `${fullValue.substring(0, 77)}...`
                      : fullValue

                  return (
                    <td
                      key={header}
                      className="min-w-[120px] max-w-[200px] truncate px-3 py-1.5"
                      title={fullValue}
                    >
                      {displayValue}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface ColumnMappingProps {
  csvData: CsvPreviewData
  table: TableRead
  columnMapping: Record<string, string>
  onChange: (header: string, value: string) => void
}

function ColumnMapping({
  csvData,
  table,
  columnMapping,
  onChange,
}: ColumnMappingProps) {
  const form = useFormContext<CsvImportFormValues>()

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">将 CSV 列映射到数据表列</div>
      <FormField
        control={form.control}
        name="columnMapping"
        render={() => (
          <FormItem>
            <div className="space-y-2">
              {csvData.headers.map((header) => (
                <div key={header} className="flex items-center gap-2">
                  <FormLabel className="w-1/3 text-sm">{header}</FormLabel>
                  <Select
                    value={columnMapping[header] ?? ""}
                    onValueChange={(value) => onChange(header, value)}
                  >
                    <SelectTrigger className="w-2/3">
                      <SelectValue placeholder={"选择列"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">跳过此列</SelectItem>
                      {table.columns.map((column) => (
                        <SelectItem key={column.name} value={column.name}>
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="text-xs font-medium">
                              {column.name}
                            </span>
                            <SqlTypeDisplay
                              type={column.type as SqlType}
                              className="gap-1.5 text-muted-foreground"
                              iconClassName="size-3"
                              labelClassName="text-xs font-normal"
                            />
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
