"use client"

import { closeBrackets } from "@codemirror/autocomplete"
import { history } from "@codemirror/commands"
import { json } from "@codemirror/lang-json"
import { bracketMatching } from "@codemirror/language"
import { linter, lintGutter } from "@codemirror/lint"
import { EditorView } from "@codemirror/view"
import CodeMirror from "@uiw/react-codemirror"
import { AlertTriangle } from "lucide-react"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  CaseDropdownDefinitionRead,
  CaseDropdownValueRead,
  CaseFieldReadMinimal,
} from "@/client"
import { CaseDescriptionEditor } from "@/components/cases/case-description-editor"
import { tracecatSyntaxHighlighting } from "@/components/editor/codemirror/syntax-highlight"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckIndicator } from "@/components/ui/check-indicator"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  nonDismissableDialogProps,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  isValidSqlIntegerInput,
  isValidSqlNumericInput,
} from "@/lib/sql-value-validation"

interface CaseClosureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetStatus: "closed" | "resolved"
  requiredFields: CaseFieldReadMinimal[]
  requiredDropdowns: CaseDropdownDefinitionRead[]
  /** Pre-fill values from a single case. Omit for bulk mode. */
  currentFieldValues?: Record<string, unknown>
  currentDropdownValues?: CaseDropdownValueRead[]
  /** Bulk mode: shows override warning, no pre-fill. */
  isBulk?: boolean
  selectedCount?: number
  onSubmit: (data: {
    fields: Record<string, unknown>
    dropdown_values: Array<{ definition_id: string; option_id: string }>
  }) => Promise<void>
}

/**
 * Dialog shown when a case (or cases) are being closed/resolved and
 * required-on-closure fields or dropdowns are not yet filled in.
 */
export function CaseClosureDialog({
  open,
  onOpenChange,
  targetStatus,
  requiredFields,
  requiredDropdowns,
  currentFieldValues,
  currentDropdownValues,
  isBulk = false,
  selectedCount,
  onSubmit,
}: CaseClosureDialogProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({})
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set())
  const [dropdownValues, setDropdownValues] = useState<
    Record<string, string | null>
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const prevOpen = useRef(false)

  // Initialize values when dialog opens (false → true transition only)
  useEffect(() => {
    if (!open || prevOpen.current === open) {
      prevOpen.current = open
      return
    }
    prevOpen.current = open

    setFieldErrors(new Set())

    if (isBulk) {
      setFieldValues({})
      setDropdownValues({})
      return
    }

    // Single case mode: pre-fill from current values
    const initFields: Record<string, unknown> = {}
    for (const field of requiredFields) {
      const currentVal = currentFieldValues?.[field.id]
      initFields[field.id] = currentVal ?? null
    }
    setFieldValues(initFields)

    const initDropdowns: Record<string, string | null> = {}
    for (const dd of requiredDropdowns) {
      const current = currentDropdownValues?.find(
        (dv) => dv.definition_id === dd.id
      )
      initDropdowns[dd.id] = current?.option_id ?? null
    }
    setDropdownValues(initDropdowns)
  }, [
    open,
    isBulk,
    requiredFields,
    requiredDropdowns,
    currentFieldValues,
    currentDropdownValues,
  ])

  const isValid = useMemo(() => {
    if (fieldErrors.size > 0) return false
    for (const field of requiredFields) {
      if (isFieldValueEmpty(fieldValues[field.id])) return false
    }
    for (const dd of requiredDropdowns) {
      if (!dropdownValues[dd.id]) return false
    }
    return true
  }, [
    fieldValues,
    fieldErrors,
    dropdownValues,
    requiredFields,
    requiredDropdowns,
  ])

  const handleSubmit = useCallback(async () => {
    if (!isValid) return
    setIsSubmitting(true)
    try {
      const ddVals = Object.entries(dropdownValues)
        .filter(([, optionId]) => optionId != null)
        .map(([definitionId, optionId]) => ({
          definition_id: definitionId,
          option_id: optionId as string,
        }))

      await onSubmit({
        fields: fieldValues,
        dropdown_values: ddVals,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }, [isValid, fieldValues, dropdownValues, onSubmit, onOpenChange])

  const statusLabel = targetStatus === "closed" ? "关闭" : "解决"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        className="max-w-lg"
        {...nonDismissableDialogProps}
      >
        <DialogHeader>
          <DialogTitle>{statusLabel} 事件</DialogTitle>
          <DialogDescription>
            请先填写必填字段，再执行{" "}
            {targetStatus === "closed" ? "关闭" : "解决"}{" "}
            {isBulk ? `${selectedCount} 个事件` : "此事件"}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {isBulk && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>
                这些值会覆盖所有事件现有的字段和下拉选项值，共 {selectedCount}{" "}
                已选择 {selectedCount === 1 ? "事件" : "个事件"}.
              </AlertDescription>
            </Alert>
          )}

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {requiredFields.map((field) => (
              <ClosureFieldInput
                key={field.id}
                field={field}
                value={fieldValues[field.id] ?? null}
                onChange={(val) =>
                  setFieldValues((prev) => ({ ...prev, [field.id]: val }))
                }
                onValidationChange={(hasError) =>
                  setFieldErrors((prev) => {
                    const next = new Set(prev)
                    if (hasError) next.add(field.id)
                    else next.delete(field.id)
                    return next
                  })
                }
              />
            ))}

            {requiredDropdowns.map((dd) => (
              <div key={dd.id} className="space-y-1.5">
                <Label className="text-sm">{dd.name}</Label>
                <Select
                  value={dropdownValues[dd.id] ?? ""}
                  onValueChange={(val) =>
                    setDropdownValues((prev) => ({ ...prev, [dd.id]: val }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={"选择选项…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {dd.options?.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        <span className="flex items-center gap-2">
                          {opt.color && (
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: opt.color }}
                            />
                          )}
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            size="sm"
            variant="outline"
            disabled={!isValid || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? `${statusLabel}中…` : `${statusLabel} 事件`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Field input dispatcher ---

interface ClosureFieldInputProps {
  field: CaseFieldReadMinimal
  value: unknown
  onChange: (value: unknown) => void
  onValidationChange?: (hasError: boolean) => void
}

function ClosureFieldInput({
  field,
  value,
  onChange,
  onValidationChange,
}: ClosureFieldInputProps) {
  // Resolve effective type from kind
  if (field.kind === "LONG_TEXT") {
    return (
      <LongTextField
        label={field.display_name}
        value={value}
        onChange={onChange}
      />
    )
  }
  if (field.kind === "URL") {
    return (
      <UrlField label={field.display_name} value={value} onChange={onChange} />
    )
  }

  switch (field.type) {
    case "TEXT":
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">{field.display_name}</Label>
          <Input
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`输入 ${field.display_name}…`}
          />
        </div>
      )
    case "INTEGER":
    case "NUMERIC":
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">{field.display_name}</Label>
          <Input
            type="text"
            inputMode={field.type === "INTEGER" ? "numeric" : "decimal"}
            value={value != null ? String(value) : ""}
            onChange={(e) => {
              const raw = e.target.value
              const trimmed = raw.trim()
              if (!trimmed) {
                onValidationChange?.(false)
                onChange(null)
                return
              }

              if (field.type === "INTEGER") {
                const isValid = isValidSqlIntegerInput(trimmed)
                onValidationChange?.(!isValid)
                onChange(trimmed)
                return
              }

              const isValid = isValidSqlNumericInput(trimmed)
              onValidationChange?.(!isValid)
              onChange(trimmed)
            }}
            placeholder={`输入 ${field.display_name}…`}
          />
        </div>
      )
    case "BOOLEAN":
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">{field.display_name}</Label>
          <Select
            value={value != null ? String(value) : ""}
            onValueChange={(val) => onChange(val === "true")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={"选择…"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">真</SelectItem>
              <SelectItem value="false">假</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    case "DATE":
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">{field.display_name}</Label>
          <Input
            type="text"
            placeholder="YYYY-MM-DD"
            value={value != null ? String(value) : ""}
            onChange={(e) => {
              const raw = e.target.value.trim()
              if (!raw) {
                onValidationChange?.(false)
                onChange(null)
                return
              }
              const valid = !Number.isNaN(new Date(raw).getTime())
              onValidationChange?.(!valid)
              onChange(raw)
            }}
          />
        </div>
      )
    case "TIMESTAMPTZ":
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">{field.display_name}</Label>
          <Input
            type="text"
            placeholder="YYYY-MM-DDTHH:mm:ss.Z"
            value={value != null ? String(value) : ""}
            onChange={(e) => {
              const raw = e.target.value.trim()
              if (!raw) {
                onValidationChange?.(false)
                onChange(null)
                return
              }
              const valid = !Number.isNaN(new Date(raw).getTime())
              onValidationChange?.(!valid)
              onChange(raw)
            }}
          />
        </div>
      )
    case "SELECT":
      return <SelectField field={field} value={value} onChange={onChange} />
    case "MULTI_SELECT":
      return (
        <MultiSelectField field={field} value={value} onChange={onChange} />
      )
    case "JSONB":
      return (
        <JsonField
          label={field.display_name}
          value={value}
          onChange={onChange}
          onValidationChange={onValidationChange}
        />
      )
    default:
      return (
        <div className="space-y-1.5">
          <Label className="text-sm">{field.display_name}</Label>
          <Input
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`输入 ${field.display_name}…`}
          />
        </div>
      )
  }
}

// --- Per-type field components ---

function LongTextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: unknown
  onChange: (v: unknown) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="min-h-[100px] rounded-md border">
        <CaseDescriptionEditor
          className="case-description-editor--boxed"
          initialContent={typeof value === "string" ? value : ""}
          onChange={onChange}
        />
      </div>
    </div>
  )
}

function UrlField({
  label,
  value,
  onChange,
}: {
  label: string
  value: unknown
  onChange: (v: unknown) => void
}) {
  const urlVal =
    value && typeof value === "object" && "url" in value
      ? (value as { url: string; label: string })
      : { url: "", label: "" }
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="space-y-2">
        <Input
          value={urlVal.label}
          onChange={(e) => onChange({ ...urlVal, label: e.target.value })}
          placeholder={"显示文本"}
        />
        <Input
          type="url"
          value={urlVal.url}
          onChange={(e) => onChange({ ...urlVal, url: e.target.value })}
          placeholder="https://example.com"
        />
      </div>
    </div>
  )
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: CaseFieldReadMinimal
  value: unknown
  onChange: (v: unknown) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{field.display_name}</Label>
      <Select
        value={typeof value === "string" ? value : ""}
        onValueChange={onChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={"选择…"} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function MultiSelectField({
  field,
  value,
  onChange,
}: {
  field: CaseFieldReadMinimal
  value: unknown
  onChange: (v: unknown) => void
}) {
  const selected = Array.isArray(value) ? (value as string[]) : []
  const [popoverOpen, setPopoverOpen] = useState(false)

  function toggleOption(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{field.display_name}</Label>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-sm font-normal"
          >
            {selected.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {selected.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">选择…</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start" portal={true}>
          <Command>
            <CommandInput placeholder={"搜索…"} />
            <CommandList>
              <CommandEmpty>暂无选项。</CommandEmpty>
              <CommandGroup>
                {field.options?.map((opt) => (
                  <CommandItem
                    key={opt}
                    className="group"
                    onSelect={() => toggleOption(opt)}
                  >
                    <CheckIndicator checked={selected.includes(opt)} />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function jsonLinter(view: EditorView) {
  const content = view.state.doc.toString()
  if (!content.trim()) return []
  try {
    JSON.parse(content)
    return []
  } catch (err) {
    const msg = err instanceof Error ? err.message : "JSON 无效"
    const posMatch = msg.match(/position (\d+)/)
    const pos = posMatch ? Number.parseInt(posMatch[1], 10) : 0
    const from = Math.min(pos, content.length)
    const to = Math.min(from + 1, content.length)
    return [
      { from, to, severity: "error" as const, message: msg, source: "json" },
    ]
  }
}

function JsonField({
  label,
  value,
  onChange,
  onValidationChange,
}: {
  label: string
  value: unknown
  onChange: (v: unknown) => void
  onValidationChange?: (hasError: boolean) => void
}) {
  const { resolvedTheme } = useTheme()
  const codeMirrorTheme = resolvedTheme === "dark" ? "dark" : "light"
  const serialized =
    value === null || value === undefined ? "" : JSON.stringify(value, null, 2)
  const [draft, setDraft] = useState(serialized)
  const [error, setError] = useState<string | null>(null)
  const isLocalEdit = useRef(false)

  // Sync draft from external value changes only (e.g. dialog pre-fill)
  useEffect(() => {
    if (isLocalEdit.current) {
      isLocalEdit.current = false
      return
    }
    setDraft(serialized)
    setError(null)
  }, [serialized])

  const extensions = useMemo(
    () => [
      json(),
      tracecatSyntaxHighlighting,
      lintGutter(),
      linter(jsonLinter),
      history(),
      bracketMatching(),
      closeBrackets(),
      EditorView.theme({
        ".cm-content": { fontFamily: "monospace", fontSize: "13px" },
        ".cm-scroller": { maxHeight: "200px", overflow: "auto" },
      }),
    ],
    []
  )

  function handleChange(val: string) {
    isLocalEdit.current = true
    setDraft(val)
    const trimmed = val.trim()
    if (trimmed === "") {
      onChange(null)
      setError(null)
      onValidationChange?.(false)
      return
    }
    try {
      const parsed = JSON.parse(trimmed)
      onChange(parsed)
      setError(null)
      onValidationChange?.(false)
    } catch {
      setError("JSON 无效")
      onValidationChange?.(true)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <CodeMirror
        value={draft}
        onChange={handleChange}
        height="150px"
        theme={codeMirrorTheme}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          bracketMatching: false,
          closeBrackets: false,
          history: false,
          defaultKeymap: true,
          syntaxHighlighting: true,
          autocompletion: false,
        }}
        className="overflow-auto rounded-md border font-mono text-sm"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// --- Helpers ---

function isFieldValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string" && value.trim() === "") return true
  if (Array.isArray(value) && value.length === 0) return true
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  )
    return true
  // For URL fields: check both url and label
  if (
    typeof value === "object" &&
    value !== null &&
    "url" in value &&
    "label" in value
  ) {
    const urlObj = value as { url: string; label: string }
    if (!urlObj.url.trim() && !urlObj.label.trim()) return true
  }
  return false
}
