"use client"

import type { ManagedRolloutRead, ManagedTargetRead } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { APPLICABLE_ROLLOUT_STATUSES } from "../managed-package-utils"
import { RolloutStatusBadge } from "./status-badge"

/** Props for {@link RolloutProgress}. */
export interface RolloutProgressProps {
  rollouts: ManagedRolloutRead[]
  targetsById: Map<string, ManagedTargetRead>
  isActive: boolean
  applyPending: boolean
  onApply: (rolloutIds: string[]) => void
  onShowDetails: (rolloutId: string) => void
  onMatchReferences: (target: ManagedTargetRead) => void
  onDismiss: () => void
}

function summarize(rollout: ManagedRolloutRead): string {
  const preview = rollout.preview
  if (!preview) {
    return "-"
  }
  const parts = [`${preview.changes?.length ?? 0} changes`]
  const conflicts = preview.conflicts?.length ?? 0
  if (conflicts > 0) {
    parts.push(`${conflicts} conflicts`)
  }
  const references = preview.references?.length ?? 0
  if (references > 0) {
    parts.push(`${references} 个未解决的引用`)
  }
  const deleteWarnings = preview.delete_warnings?.length ?? 0
  if (deleteWarnings > 0) {
    parts.push(`${deleteWarnings} 条删除警告`)
  }
  return parts.join(", ")
}

/** Live status of the rollouts started from this page, with the apply step. */
export function RolloutProgress({
  rollouts,
  targetsById,
  isActive,
  applyPending,
  onApply,
  onShowDetails,
  onMatchReferences,
  onDismiss,
}: RolloutProgressProps) {
  const applicable = rollouts.filter((rollout) =>
    APPLICABLE_ROLLOUT_STATUSES.has(rollout.status)
  )

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-medium">部署记录</h4>
          <p className="text-xs text-muted-foreground">
            {isActive
              ? "预览和应用操作在后台运行，此列表会自动刷新。"
              : "打开部署记录，查看变更后再应用。"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Dismissing stops polling, so wait until every rollout settles
              and the targets table gets the final state. */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            disabled={isActive}
          >
            关闭
          </Button>
          <Button
            size="sm"
            onClick={() => onApply(applicable.map((rollout) => rollout.id))}
            disabled={applicable.length === 0 || applyPending}
          >
            {applyPending ? "应用中…" : `应用就绪目标（${applicable.length}）`}
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">工作空间</TableHead>
              <TableHead className="text-xs">标签</TableHead>
              <TableHead className="text-xs">状态</TableHead>
              <TableHead className="text-xs">摘要</TableHead>
              <TableHead className="text-xs" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rollouts.map((rollout) => {
              const target = rollout.target_id
                ? targetsById.get(rollout.target_id)
                : undefined
              return (
                <TableRow key={rollout.id}>
                  <TableCell className="text-xs">
                    {target ? (
                      <>
                        <span className="text-muted-foreground">
                          {target.organization_name} /{" "}
                        </span>
                        {target.workspace_name}
                      </>
                    ) : (
                      <span className="font-mono">{rollout.workspace_id}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {rollout.tag ?? "-"}
                  </TableCell>
                  <TableCell>
                    <RolloutStatusBadge status={rollout.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {rollout.error ? (
                      <span className="text-destructive">{rollout.error}</span>
                    ) : (
                      summarize(rollout)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {rollout.status === "needs_references" && target && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onMatchReferences(target)}
                        >
                          引用
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onShowDetails(rollout.id)}
                      >
                        详情
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
