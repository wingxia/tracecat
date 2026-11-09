import type { SyncResourceType } from "@/client"

export interface WorkspaceSyncResourceTypeMeta {
  label: string
  abbr: string
  root: string
  summary: string
}

/**
 * Display metadata per syncable resource type, in projection order. `root` is
 * the Git directory each type serializes to; `summary` names the sub-resources
 * that travel with it. Keep this as the frontend source of truth until the
 * preview API returns manifest resource roots directly.
 */
export const WORKSPACE_SYNC_RESOURCE_TYPE_META: Record<
  SyncResourceType,
  WorkspaceSyncResourceTypeMeta
> = {
  workflow: {
    label: "工作流",
    abbr: "WF",
    root: "workflows",
    summary: "定义、标签、表单、Webhook 和事件触发器",
  },
  agent_preset: {
    label: "智能体预设",
    abbr: "AG",
    root: "agent_presets",
    summary: "指令、模型、技能和子智能体",
  },
  skill: {
    label: "技能",
    abbr: "SK",
    root: "skills",
    summary: "清单和文件内容",
  },
  table: {
    label: "数据表",
    abbr: "TB",
    root: "tables",
    summary: "数据表元数据和列结构",
  },
  case_field: {
    label: "事件字段",
    abbr: "CF",
    root: "case_fields",
    summary: "类型、类别和选项",
  },
  case_tag: {
    label: "事件标签",
    abbr: "CT",
    root: "case_tags",
    summary: "名称和颜色",
  },
  case_dropdown: {
    label: "事件下拉字段",
    abbr: "CD",
    root: "case_dropdowns",
    summary: "选项、顺序和图标",
  },
  case_duration: {
    label: "事件时长指标",
    abbr: "CR",
    root: "case_durations",
    summary: "起止时间点",
  },
  variable: {
    label: "变量",
    abbr: "VR",
    root: "variables",
    summary: "键和标签，值已隐藏",
  },
  secret_metadata: {
    label: "密钥元数据",
    abbr: "SC",
    root: "secret_metadata",
    summary: "键名和类型，不会同步值",
  },
}

export const WORKSPACE_SYNC_RESOURCE_TYPE_ORDER = Object.keys(
  WORKSPACE_SYNC_RESOURCE_TYPE_META
) as SyncResourceType[]

export const WORKSPACE_SYNC_ROOT_TO_RESOURCE_TYPE: Record<
  string,
  SyncResourceType
> = Object.fromEntries(
  WORKSPACE_SYNC_RESOURCE_TYPE_ORDER.map((type) => [
    WORKSPACE_SYNC_RESOURCE_TYPE_META[type].root,
    type,
  ])
)

/**
 * Returns the human label for a sync resource type, preserving unknown resource
 * types for forward-compatible rendering.
 */
export function getWorkspaceSyncResourceLabel(resourceType: string): string {
  if (
    Object.prototype.hasOwnProperty.call(
      WORKSPACE_SYNC_RESOURCE_TYPE_META,
      resourceType
    )
  ) {
    return WORKSPACE_SYNC_RESOURCE_TYPE_META[resourceType as SyncResourceType]
      .label
  }
  return resourceType
}

/**
 * Returns the two-letter tile for a sync resource type, or the first two
 * letters of an unknown type.
 */
export function getWorkspaceSyncResourceAbbr(resourceType: string): string {
  if (
    Object.prototype.hasOwnProperty.call(
      WORKSPACE_SYNC_RESOURCE_TYPE_META,
      resourceType
    )
  ) {
    return WORKSPACE_SYNC_RESOURCE_TYPE_META[resourceType as SyncResourceType]
      .abbr
  }
  return resourceType.slice(0, 2).toUpperCase()
}
