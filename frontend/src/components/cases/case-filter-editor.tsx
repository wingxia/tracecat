"use client"

import { useState } from "react"
import {
  type CaseDropdownDefinitionRead,
  type CaseQuery,
  type CaseTagRead,
  casesListCaseFilterFields,
  type Filter,
  type WorkspaceMember,
} from "@/client"
import { $CaseFilterMetadata } from "@/client/schemas.gen"
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
import { useQuery } from "@/lib/query"
import { useWorkspaceId } from "@/providers/workspace-id"
import { FilterNode } from "./case-filter-node"
import { CaseFilterSummary } from "./case-filter-summary"
import {
  conditionCount,
  filterValueCount,
  hasInvalidRangeChoice,
  newCondition,
} from "./case-filter-utils"

/** Edit the generated server filter tree, keeping drafts separate from applied queries. */
export function CaseFilterEditor({
  value,
  onChange,
  members,
  tags,
  dropdowns,
}: {
  value: CaseQuery["filters"]
  onChange: (value: CaseQuery["filters"]) => void
  members?: WorkspaceMember[]
  tags?: CaseTagRead[]
  dropdowns?: CaseDropdownDefinitionRead[]
}) {
  const workspaceId = useWorkspaceId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Filter | null>(null)
  const metadata = useQuery({
    queryKey: ["cases", "filter-fields", workspaceId],
    queryFn: () => casesListCaseFilterFields({ workspaceId }),
    enabled: open || Boolean(value),
  })
  const choiceLabels: Record<string, Record<string, string>> = {
    assignee_id: Object.fromEntries(
      (members ?? []).map((member) => [member.user_id, member.email])
    ),
    tags: Object.fromEntries((tags ?? []).map((tag) => [tag.ref, tag.name])),
    ...Object.fromEntries(
      (dropdowns ?? []).map((dropdown) => [
        `dropdowns.${dropdown.ref}`,
        Object.fromEntries(
          (dropdown.options ?? []).map((option) => [option.ref, option.label])
        ),
      ])
    ),
  }
  const fields = (metadata.data?.fields ?? []).map((field) => {
    if (field.field === "assignee_id")
      return { ...field, choices: members?.map((member) => member.user_id) }
    if (field.field === "tags")
      return { ...field, choices: tags?.map((tag) => tag.ref) }
    const dropdown = dropdowns?.find(
      (item) => `dropdowns.${item.ref}` === field.field
    )
    if (dropdown)
      return {
        ...field,
        label: dropdown.name,
        choices: (dropdown.options ?? []).map((option) => option.ref),
      }
    return field
  })
  const maxValues =
    metadata.data?.max_values ??
    $CaseFilterMetadata.properties.max_values.default
  const tooManyValues = draft ? filterValueCount(draft) > maxValues : false
  const invalidRangeChoice = draft
    ? hasInvalidRangeChoice(draft, fields)
    : false
  const invalidDraft = tooManyValues || invalidRangeChoice
  return (
    <>
      {value && (
        <CaseFilterSummary node={value} onChange={onChange} fields={fields} />
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-6 text-xs"
        onClick={() => {
          setDraft(value ?? { and: [newCondition()] })
          setOpen(true)
        }}
      >
        条件{value ? ` (${conditionCount(value)})` : ""}
      </Button>
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => onChange(null)}
        >
          清除条件
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>事件筛选条件</DialogTitle>
            <DialogDescription>
              匹配所有条件或任一条件，这些条件还会与快捷筛选组合使用。
            </DialogDescription>
          </DialogHeader>
          <form
            id="case-conditions"
            className="contents"
            onSubmit={(event) => {
              event.preventDefault()
              if (!metadata.data || invalidDraft) return
              onChange(draft)
              setOpen(false)
            }}
          >
            <DialogBody className="space-y-4">
              <p className="text-xs text-muted-foreground">
                未设置的标量字段不匹配比较或排除条件。选择“包含未设置值”以匹配缺失值。数据载荷的相等比较区分文本、数字和布尔值。使用点分隔的键，如
                payload.metadata.product.vendor_name。对于数据载荷，“未设置”指路径不存在；显式
                JSON null 视为已存在。
              </p>
              {tooManyValues && (
                <p role="alert" className="text-xs text-destructive">
                  所有条件合计最多包含 {maxValues} 个值。请移除部分值后再应用。
                </p>
              )}
              {invalidRangeChoice && (
                <p role="alert" className="text-xs text-destructive">
                  应用前请选择可用的比较值。
                </p>
              )}
              {metadata.isLoading && <p className="text-xs">正在加载字段…</p>}
              {metadata.error && (
                <p role="alert" className="text-xs text-destructive">
                  无法加载筛选字段，请重新打开以重试。
                </p>
              )}
              {draft && metadata.data && (
                <FilterNode
                  node={draft}
                  onChange={setDraft}
                  onRemove={() => setDraft(null)}
                  fields={fields}
                  choiceLabels={choiceLabels}
                  depth={1}
                  maxDepth={
                    metadata.data.max_depth ??
                    $CaseFilterMetadata.properties.max_depth.default
                  }
                  canAdd={
                    conditionCount(draft) <
                    (metadata.data.max_conditions ??
                      $CaseFilterMetadata.properties.max_conditions.default)
                  }
                />
              )}
              {!draft && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft({ and: [newCondition()] })}
                >
                  添加条件
                </Button>
              )}
            </DialogBody>
            <DialogFooter>
              <Button
                type="submit"
                size="sm"
                disabled={!metadata.data || invalidDraft}
              >
                应用条件
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
