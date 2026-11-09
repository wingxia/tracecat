"use client"

import { GitBranchIcon, GitPullRequestIcon } from "lucide-react"
import type { VcsProvider } from "@/client"
import { ToggleTabs } from "@/components/ui/toggle-tabs"
import { cn } from "@/lib/utils"

export type WorkspaceSyncPushMode = "pull-request" | "direct"

interface WorkspaceSyncPushOutcomeOptions {
  mode: WorkspaceSyncPushMode
  targetBranch: string
  defaultBranch: string | undefined
  isCreatingBranch: boolean
}

export interface WorkspaceSyncPushOutcome {
  createPr: boolean
  isPullRequestBlocked: boolean
  targetIsDefault: boolean
  willCreatePr: boolean
}

interface WorkspaceSyncPushButtonLabelOptions {
  outcome: WorkspaceSyncPushOutcome
  isCreatingBranch: boolean
  isPending: boolean
  provider: VcsProvider
}

interface WorkspaceSyncPushMessageOptions {
  outcome: WorkspaceSyncPushOutcome
  defaultBranch: string | undefined
  allowDirectPush?: boolean
  provider: VcsProvider
}

interface WorkspaceSyncPushModeTabsProps {
  value: WorkspaceSyncPushMode
  onValueChange: (value: WorkspaceSyncPushMode) => void
  provider: VcsProvider
  size?: "sm" | "md" | "lg"
}

export function buildRandomSyncBranchName(prefix: string): string {
  return `${prefix.replace(/\/$/, "")}-${randomBranchToken()}`
}

export function getWorkspaceSyncPushOutcome({
  mode,
  targetBranch,
  defaultBranch,
}: WorkspaceSyncPushOutcomeOptions): WorkspaceSyncPushOutcome {
  const normalizedTargetBranch = targetBranch.trim()
  const targetIsDefault =
    Boolean(defaultBranch) && normalizedTargetBranch === defaultBranch
  const isPullRequestBlocked = mode === "pull-request" && targetIsDefault

  return {
    createPr: mode === "pull-request",
    isPullRequestBlocked,
    targetIsDefault,
    willCreatePr: mode === "pull-request" && !isPullRequestBlocked,
  }
}

export function getWorkspaceSyncPushButtonLabel({
  outcome,
  isCreatingBranch,
  isPending,
  provider,
}: WorkspaceSyncPushButtonLabelOptions): string {
  const reviewRequestAbbreviation = getReviewRequestAbbreviation(provider)
  if (isPending) {
    return "推送中…"
  }
  if (!outcome.createPr) {
    return "直接推送"
  }
  if (isCreatingBranch) {
    return `推送并创建 ${reviewRequestAbbreviation}`
  }
  return `更新分支并创建 ${reviewRequestAbbreviation}`
}

export function getWorkspaceSyncPushResultLabel({
  outcome,
  defaultBranch,
  provider,
}: WorkspaceSyncPushMessageOptions): string {
  if (outcome.willCreatePr) {
    return `${getReviewRequestAbbreviation(provider)} 合并到 ${defaultBranch ?? "默认分支"}`
  }
  if (outcome.isPullRequestBlocked) {
    return "选择非默认分支"
  }
  return "直接提交"
}

export function getWorkspaceSyncPushWarning({
  outcome,
  defaultBranch,
  allowDirectPush = true,
  provider,
}: WorkspaceSyncPushMessageOptions): string | null {
  const reviewRequestLabel = getReviewRequestLabel(provider)
  if (outcome.isPullRequestBlocked) {
    if (!allowDirectPush) {
      return `选择或创建非默认分支，以发起合并到 ${defaultBranch ?? "默认分支"} 的${reviewRequestLabel}。`
    }
    return `选择或创建非默认分支，以发起合并到 ${defaultBranch ?? "默认分支"} 的${reviewRequestLabel}，或切换到直接推送。`
  }
  if (!outcome.createPr && outcome.targetIsDefault) {
    return `此操作会直接提交到 ${defaultBranch ?? "默认分支"}，不创建${reviewRequestLabel}。`
  }
  if (!outcome.createPr) {
    return `此操作会直接提交到所选分支，不创建${reviewRequestLabel}。`
  }
  return null
}

export function getReviewRequestAbbreviation(provider: VcsProvider): string {
  return provider === "gitlab" ? "MR" : "PR"
}

export function getReviewRequestLabel(provider: VcsProvider): string {
  return provider === "gitlab" ? "merge request" : "pull request"
}

/**
 * Severity-styled advisory for the push composer. Renders nothing when there is
 * no warning to show.
 */
export function WorkspaceSyncPushWarning({
  warning,
  blocked,
  className,
}: {
  warning: string | null | undefined
  blocked: boolean
  className?: string
}) {
  if (!warning) {
    return null
  }
  return (
    <p
      className={cn(
        "text-[11px]",
        blocked ? "text-destructive" : "text-amber-700",
        className
      )}
    >
      {warning}
    </p>
  )
}

export function WorkspaceSyncPushModeTabs({
  value,
  onValueChange,
  provider,
  size = "sm",
}: WorkspaceSyncPushModeTabsProps) {
  const reviewRequestAbbreviation = getReviewRequestAbbreviation(provider)
  return (
    <ToggleTabs<WorkspaceSyncPushMode>
      value={value}
      onValueChange={onValueChange}
      size={size}
      showTooltips={false}
      options={[
        {
          value: "pull-request",
          content: (
            <span className="flex items-center gap-1.5">
              <GitPullRequestIcon className="size-3.5" />
              打开 {reviewRequestAbbreviation}
            </span>
          ),
        },
        {
          value: "direct",
          content: (
            <span className="flex items-center gap-1.5">
              <GitBranchIcon className="size-3.5" />
              直接推送
            </span>
          ),
        },
      ]}
    />
  )
}

function randomBranchToken(): string {
  const crypto = globalThis.crypto
  if (crypto?.getRandomValues) {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    )
  }
  return Math.random().toString(36).slice(2, 10)
}
