import type { LucideIcon } from "lucide-react"
import {
  CircleCheck,
  Eye,
  FilePlus2,
  Flag,
  Flame,
  FormInput,
  GitCompare,
  List,
  MessageSquarePlus,
  MessageSquareX,
  PenSquare,
  RotateCcw,
  Tag,
  UserRound,
} from "lucide-react"

import type { CaseDurationAnchorSelection, CaseEventType } from "@/client"

import { PRIORITIES, SEVERITIES, STATUSES } from "./case-categories"

export interface CaseEventOption {
  value: CaseEventType
  label: string
  icon: LucideIcon
  description?: string
}

export const CASE_EVENT_OPTIONS: CaseEventOption[] = [
  {
    value: "case_created",
    label: "已创建事件",
    icon: FilePlus2,
  },
  {
    value: "case_updated",
    label: "已更新事件",
    icon: PenSquare,
  },
  {
    value: "case_closed",
    label: "已关闭事件",
    icon: CircleCheck,
  },
  {
    value: "case_reopened",
    label: "已重新打开事件",
    icon: RotateCcw,
  },
  {
    value: "case_viewed",
    label: "已查看事件",
    icon: Eye,
  },
  {
    value: "priority_changed",
    label: "优先级已更改",
    icon: Flag,
  },
  {
    value: "severity_changed",
    label: "严重程度已更改",
    icon: Flame,
  },
  {
    value: "status_changed",
    label: "状态已更改",
    icon: GitCompare,
  },
  {
    value: "assignee_changed",
    label: "负责人已更改",
    icon: UserRound,
  },
  {
    value: "tag_added",
    label: "已添加标签",
    icon: Tag,
  },
  {
    value: "tag_removed",
    label: "已移除标签",
    icon: Tag,
  },
  {
    value: "fields_changed",
    label: "自定义字段已更改",
    icon: FormInput,
  },
  {
    value: "dropdown_value_changed",
    label: "下拉选项值已更改",
    icon: List,
  },
  {
    value: "comment_created",
    label: "已添加评论",
    icon: MessageSquarePlus,
  },
  {
    value: "comment_deleted",
    label: "已删除评论",
    icon: MessageSquareX,
  },
  {
    value: "comment_reply_created",
    label: "已添加评论回复",
    icon: MessageSquarePlus,
  },
  {
    value: "comment_reply_deleted",
    label: "已删除评论回复",
    icon: MessageSquareX,
  },
]

export const CASE_EVENT_VALUES = CASE_EVENT_OPTIONS.map(
  (option) => option.value
) as [CaseEventType, ...CaseEventType[]]

export const CASE_DURATION_SELECTION_OPTIONS: Array<{
  value: CaseDurationAnchorSelection
  label: string
}> = [
  { value: "first", label: "首次出现" },
  { value: "last", label: "最近出现" },
]

type CaseEventFilterType = Extract<
  CaseEventType,
  "priority_changed" | "severity_changed" | "status_changed"
>

export interface CaseEventFilterOption {
  value: string
  label: string
}

export const CASE_EVENT_FILTER_OPTIONS = {
  priority_changed: {
    label: "优先级",
    options: Object.values(PRIORITIES).map(({ value, label }) => ({
      value,
      label,
    })),
  },
  severity_changed: {
    label: "严重程度",
    options: Object.values(SEVERITIES).map(({ value, label }) => ({
      value,
      label,
    })),
  },
  status_changed: {
    label: "状态",
    options: Object.values(STATUSES).map(({ value, label }) => ({
      value,
      label,
    })),
  },
} as const satisfies Record<
  CaseEventFilterType,
  {
    label: string
    options: CaseEventFilterOption[]
  }
>

export function isCaseEventFilterType(
  value: CaseEventType
): value is CaseEventFilterType {
  return value in CASE_EVENT_FILTER_OPTIONS
}

const CASE_TAG_EVENT_TYPES = [
  "tag_added",
  "tag_removed",
] as const satisfies readonly CaseEventType[]

export type CaseTagEventType = (typeof CASE_TAG_EVENT_TYPES)[number]

export function isCaseTagEventType(
  value: CaseEventType
): value is CaseTagEventType {
  return (CASE_TAG_EVENT_TYPES as readonly CaseEventType[]).includes(value)
}

export function isCaseFieldEventType(value: CaseEventType): boolean {
  return value === "fields_changed"
}

export function isCaseDropdownEventType(value: CaseEventType): boolean {
  return value === "dropdown_value_changed"
}

export function getCaseEventOption(value: CaseEventType): CaseEventOption {
  return (
    CASE_EVENT_OPTIONS.find((option) => option.value === value) || {
      value,
      label: value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      icon: FilePlus2,
    }
  )
}
