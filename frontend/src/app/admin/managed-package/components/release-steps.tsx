"use client"

import { ArrowRightIcon } from "lucide-react"
import type {
  GitTagInfo,
  ManagedReleaseCandidateRead,
  ManagedTargetRead,
} from "@/client"

/** Whether a step's data is still loading, failed, or ready to show. */
export type ReleaseStepDataState = "loading" | "error" | "ready"

/** Props for {@link ReleaseSteps}. */
export interface ReleaseStepsProps {
  candidate: ManagedReleaseCandidateRead | undefined
  candidateState: ReleaseStepDataState
  tags: GitTagInfo[]
  tagsState: ReleaseStepDataState
  targets: ManagedTargetRead[]
  targetsState: ReleaseStepDataState
}

/** Text for a step whose data is not ready, or null when it is. */
function pendingDetail(state: ReleaseStepDataState): string | null {
  switch (state) {
    case "loading":
      return "加载中…"
    case "error":
      return "无法加载。"
    case "ready":
      return null
  }
}

/**
 * Shows the three separate steps that take a change to customers, and where
 * each one stands: what is published but not released, the latest release,
 * and how many targets run it.
 */
export function ReleaseSteps({
  candidate,
  candidateState,
  tags,
  tagsState,
  targets,
  targetsState,
}: ReleaseStepsProps) {
  const latest = tags[0]?.name
  const onLatest = latest
    ? targets.filter((target) => target.last_applied_tag === latest).length
    : 0
  let published = "请从源工作空间的 Git 同步页面推送。"
  if (candidate) {
    const sha = candidate.commit_sha.substring(0, 7)
    const existingTags = candidate.existing_tags ?? []
    published =
      existingTags.length > 0
        ? `${candidate.branch} @ ${sha} 已发布为 ${existingTags.join("、")}。`
        : `${candidate.branch} @ ${sha} 有未发布的更改。`
  }
  const release = latest
    ? `最新发布版本为 ${latest}。`
    : "暂无发布版本，请在下方创建。"
  const deploy = latest
    ? `${targets.length} 个目标中有 ${onLatest} 个运行 ${latest}。`
    : `已分配 ${targets.length} 个目标。`
  // Deploy needs both the tags and the targets.
  const deployState = tagsState === "ready" ? targetsState : tagsState
  const steps = [
    {
      title: "1. 发布内容",
      detail: pendingDetail(candidateState) ?? published,
    },
    { title: "2. 创建版本", detail: pendingDetail(tagsState) ?? release },
    { title: "3. 部署", detail: pendingDetail(deployState) ?? deploy },
  ]

  return (
    <ol className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
      {steps.map((step, index) => (
        <li key={step.title} className="contents">
          {index > 0 && (
            <ArrowRightIcon className="hidden size-4 self-center text-muted-foreground md:block" />
          )}
          <div className="space-y-1 rounded-md border px-3 py-2">
            <p className="text-sm font-medium">{step.title}</p>
            <p className="text-xs text-muted-foreground">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
