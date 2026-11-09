import type {
  GitTagInfo,
  ManagedReferenceKind,
  ManagedRolloutStatus,
  ManagedTargetStatus,
  SyncResourceType,
} from "@/client"
import { toast } from "@/components/ui/use-toast"
import { getApiErrorDetail } from "@/lib/errors"

/** Release tags must look like `v1.2.3`; the backend enforces the same rule. */
export const RELEASE_TAG_PATTERN = /^v\d+\.\d+\.\d+$/

/** Matches a canonical UUID string. */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Rollout statuses that mean background work is still running. */
export const ACTIVE_ROLLOUT_STATUSES: ReadonlySet<ManagedRolloutStatus> =
  new Set(["previewing", "applying"])

/**
 * Rollout statuses still worth showing after a reload: running, appliable,
 * or waiting on the administrator.
 */
export const RESUMABLE_ROLLOUT_STATUSES: ReadonlySet<ManagedRolloutStatus> =
  new Set([
    "previewing",
    "applying",
    "ready",
    "no_changes",
    "needs_references",
    "blocked",
  ])

/** Rollout statuses the apply endpoint will act on. */
export const APPLICABLE_ROLLOUT_STATUSES: ReadonlySet<ManagedRolloutStatus> =
  new Set(["ready", "no_changes"])

/** Badge styling for a rollout or target status. */
export type StatusTone = "neutral" | "success" | "warning" | "danger"

const ROLLOUT_STATUS_LABELS: Record<ManagedRolloutStatus, string> = {
  previewing: "Previewing",
  ready: "就绪",
  no_changes: "无更改",
  blocked: "受阻",
  needs_references: "需要引用",
  applying: "Applying",
  applied: "已应用",
  failed: "失败",
  stale: "Stale",
}

const ROLLOUT_STATUS_TONES: Record<ManagedRolloutStatus, StatusTone> = {
  previewing: "neutral",
  ready: "success",
  no_changes: "neutral",
  blocked: "danger",
  needs_references: "warning",
  applying: "neutral",
  applied: "success",
  failed: "danger",
  stale: "neutral",
}

const TARGET_STATUS_LABELS: Record<ManagedTargetStatus, string> = {
  pending: "待处理",
  up_to_date: "已是最新",
  blocked: "受阻",
  needs_references: "需要引用",
  failed: "失败",
}

const TARGET_STATUS_TONES: Record<ManagedTargetStatus, StatusTone> = {
  pending: "neutral",
  up_to_date: "success",
  blocked: "danger",
  needs_references: "warning",
  failed: "danger",
}

/** Label and tone for a rollout status. */
export function rolloutStatusDisplay(status: ManagedRolloutStatus): {
  label: string
  tone: StatusTone
} {
  return {
    label: ROLLOUT_STATUS_LABELS[status],
    tone: ROLLOUT_STATUS_TONES[status],
  }
}

/** Label and tone for a target's last rollout status. */
export function targetStatusDisplay(status: ManagedTargetStatus): {
  label: string
  tone: StatusTone
} {
  return {
    label: TARGET_STATUS_LABELS[status],
    tone: TARGET_STATUS_TONES[status],
  }
}

const REFERENCE_KIND_LABELS: Record<ManagedReferenceKind, string> = {
  model: "模型",
  mcp_integration: "MCP 集成",
  secret_store: "密钥存储",
}

/** Human label for a reference kind. */
export function referenceKindLabel(kind: ManagedReferenceKind): string {
  return REFERENCE_KIND_LABELS[kind]
}

/** Human label for a synced resource type, e.g. `agent_preset` -> "Agent preset". */
export function resourceTypeLabel(type: SyncResourceType): string {
  const words = type.replaceAll("_", " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Position of a tag in the newest-first tag list, or -1 when unknown.
 * A larger index means an older tag.
 */
export function tagAge(tags: GitTagInfo[], tagName: string | null): number {
  if (!tagName) {
    return -1
  }
  return tags.findIndex((tag) => tag.name === tagName)
}

/** Format an ISO timestamp for tables, or a dash when missing. */
export function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "-"
  }
  return new Date(value).toLocaleString("zh-CN")
}

/** Show a destructive toast with the API's error detail when there is one. */
export function toastApiError(title: string, error: unknown): void {
  console.error(title, error)
  toast({
    title,
    description: getApiErrorDetail(error) ?? "请重试。",
    variant: "destructive",
  })
}
