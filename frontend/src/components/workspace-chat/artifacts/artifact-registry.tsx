"use client"

import {
  Bell,
  BlocksIcon,
  ClipboardListIcon,
  FileText,
  KeyRound,
  LayersIcon,
  ListVideoIcon,
  MousePointerClickIcon,
  Table2Icon,
  WorkflowIcon,
} from "lucide-react"
import type { ComponentType } from "react"
import { formKeys } from "@/hooks/use-forms"
import { tableSearchKey } from "@/hooks/use-table-search"
import { invalidateCaseActivityQueries } from "@/lib/cases/invalidation"
import { caseHref } from "@/lib/cases/urls"
import type { QueryClient } from "@/lib/query"
import type { WorkspaceChatArtifact } from "@/types/workspace-chat-artifacts"

export type ArtifactIconComponent = ComponentType<{ className?: string }>

type ArtifactQueryInvalidator = (
  queryClient: QueryClient,
  workspaceId: string,
  artifact: WorkspaceChatArtifact
) => void

export type ArtifactConfig = {
  label: string
  singularLabel: string
  icon: ArtifactIconComponent
  href?: (artifact: WorkspaceChatArtifact, workspaceId: string) => string
  invalidateQueries?: ArtifactQueryInvalidator
}

export const ARTIFACT_REGISTRY = {
  alert: {
    label: "告警",
    singularLabel: "Alert",
    icon: Bell,
  },
  case: {
    label: "事件",
    singularLabel: "事件",
    icon: LayersIcon,
    href: (artifact, workspaceId) => caseHref(workspaceId, artifact.id),
    invalidateQueries: (queryClient, workspaceId, artifact) => {
      invalidateCaseActivityQueries(queryClient, artifact.id, workspaceId)
      queryClient.invalidateQueries({
        queryKey: ["cases", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["cases", "paginated"],
        exact: false,
      })
    },
  },
  workflow: {
    label: "工作流",
    singularLabel: "工作流",
    icon: WorkflowIcon,
    href: (artifact, workspaceId) =>
      `/workspaces/${workspaceId}/workflows/${artifact.id}`,
    invalidateQueries: (queryClient, _workspaceId, artifact) => {
      // Workflow lists carry a 5-min stale time; refresh them so a chat-created
      // workflow shows up in dashboards and workflow/subflow pickers immediately.
      queryClient.invalidateQueries({ queryKey: ["workflows"] })
      queryClient.invalidateQueries({ queryKey: ["workflow", artifact.id] })
    },
  },
  run: {
    label: "运行记录",
    singularLabel: "运行",
    icon: ListVideoIcon,
    href: (artifact, workspaceId) =>
      artifact.type === "run"
        ? `/workspaces/${workspaceId}/workflows/${artifact.workflowId}/executions/${artifact.id}`
        : "#",
  },
  table: {
    label: "数据表",
    singularLabel: "数据表",
    icon: Table2Icon,
    href: (artifact, workspaceId) =>
      `/workspaces/${workspaceId}/tables/${artifact.id}`,
    invalidateQueries: (queryClient, workspaceId, artifact) => {
      queryClient.invalidateQueries({
        queryKey: ["table", workspaceId, artifact.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["tables", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["rows", artifact.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["rows", "paginated", artifact.id, workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: tableSearchKey(workspaceId, artifact.id),
      })
    },
  },
  agent: {
    label: "智能体",
    singularLabel: "智能体",
    icon: MousePointerClickIcon,
    href: (artifact, workspaceId) =>
      `/workspaces/${workspaceId}/agents/${artifact.id}`,
    invalidateQueries: (queryClient, workspaceId, artifact) => {
      queryClient.invalidateQueries({
        queryKey: ["agent-preset", workspaceId, artifact.id],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-presets", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-directory-items", workspaceId],
      })
      queryClient.invalidateQueries({
        queryKey: ["agent-preset-versions", workspaceId, artifact.id],
      })
    },
  },
  form: {
    label: "表单",
    singularLabel: "表单",
    icon: ClipboardListIcon,
    href: (artifact, workspaceId) =>
      `/workspaces/${workspaceId}/forms/${artifact.id}`,
    invalidateQueries: (queryClient, workspaceId, artifact) => {
      queryClient.invalidateQueries({
        queryKey: formKeys.detail(workspaceId, artifact.id),
      })
      queryClient.invalidateQueries({ queryKey: formKeys.list(workspaceId) })
    },
  },
  integration: {
    label: "集成",
    singularLabel: "Integration",
    icon: BlocksIcon,
  },
  secret: {
    label: "密钥",
    singularLabel: "Secret",
    icon: KeyRound,
  },
  generic: {
    label: "结果",
    singularLabel: "结果",
    icon: FileText,
  },
} satisfies Record<WorkspaceChatArtifact["type"], ArtifactConfig>

const UNKNOWN_ARTIFACT_CONFIG: ArtifactConfig = {
  label: "结果",
  singularLabel: "结果",
  icon: FileText,
}

/** Return display metadata for a Workspace chat artifact. */
export function getArtifactConfig(
  artifact: WorkspaceChatArtifact
): ArtifactConfig {
  return (
    ARTIFACT_REGISTRY[artifact.type as keyof typeof ARTIFACT_REGISTRY] ??
    UNKNOWN_ARTIFACT_CONFIG
  )
}

/** Return the full-page href for an artifact when one exists. */
export function getArtifactHref(
  artifact: WorkspaceChatArtifact,
  workspaceId: string
): string | undefined {
  return getArtifactConfig(artifact).href?.(artifact, workspaceId)
}

/** Invalidate embedded artifact queries after an artifact stream event. */
export function invalidateArtifactQueries(
  queryClient: QueryClient,
  workspaceId: string,
  artifact: WorkspaceChatArtifact
): void {
  getArtifactConfig(artifact).invalidateQueries?.(
    queryClient,
    workspaceId,
    artifact
  )
}
