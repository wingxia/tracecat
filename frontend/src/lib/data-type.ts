import type { LucideIcon } from "lucide-react"
import {
  Braces,
  Calendar,
  CalendarClock,
  CircleDot,
  Hash,
  Link,
  ListTodo,
  ScrollText,
  SquareCheck,
  ToggleLeft,
  Type,
} from "lucide-react"
import type { CaseFieldKind, CaseFieldReadType } from "@/client"
import type { SqlTypeEnum } from "@/lib/tables"

export type SqlType = (typeof SqlTypeEnum)[number]

export interface TypeConfig {
  label: string
  icon: LucideIcon
}

export const SQL_TYPE_CONFIG: Record<SqlType, TypeConfig> = {
  TEXT: { label: "文本", icon: Type },
  INTEGER: { label: "整数", icon: Hash },
  NUMERIC: { label: "数字", icon: CircleDot },
  BOOLEAN: { label: "布尔值", icon: ToggleLeft },
  TIMESTAMPTZ: { label: "日期与时间", icon: CalendarClock },
  DATE: { label: "日期", icon: Calendar },
  JSONB: { label: "JSON", icon: Braces },
  SELECT: { label: "选择", icon: SquareCheck },
  MULTI_SELECT: { label: "多选", icon: ListTodo },
}

/** Display config overrides for case field kinds. */
export const CASE_FIELD_KIND_CONFIG: Record<CaseFieldKind, TypeConfig> = {
  LONG_TEXT: { label: "长文本", icon: ScrollText },
  URL: { label: "URL", icon: Link },
}

const CASE_FIELD_READ_TYPE_CONFIG: Record<CaseFieldReadType, TypeConfig> = {
  ...SQL_TYPE_CONFIG,
  UUID: { label: "UUID", icon: Hash },
}

/**
 * Get the display config for a field, preferring kind-specific config when available.
 */
export function getCaseFieldTypeConfig(
  type?: CaseFieldReadType | null,
  kind?: CaseFieldKind | null
): TypeConfig | undefined {
  if (kind) return CASE_FIELD_KIND_CONFIG[kind]
  if (!type) return undefined
  return CASE_FIELD_READ_TYPE_CONFIG[type]
}

export function getSqlTypeConfig(type?: SqlType | null) {
  if (!type) return undefined
  return SQL_TYPE_CONFIG[type]
}
