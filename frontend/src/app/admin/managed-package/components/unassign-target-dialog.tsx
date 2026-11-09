"use client"

import type { ManagedRolloutRead, ManagedTargetRead } from "@/client"
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
import { Spinner } from "@/components/ui/spinner"
import { getApiErrorDetail } from "@/lib/errors"
import {
  APPLICABLE_ROLLOUT_STATUSES,
  resourceTypeLabel,
  toastApiError,
} from "../managed-package-utils"
import { useApplyRollouts, useTrackedRollouts } from "../use-managed-package"
import { DeleteWarningList } from "./rollout-preview-details"
import { RolloutStatusBadge } from "./status-badge"

/** Props for {@link UnassignTargetDialog}. */
export interface UnassignTargetDialogProps {
  /** The unassign rollout started for the target, or null when closed. */
  rolloutId: string | null
  target: ManagedTargetRead | null
  onOpenChange: (open: boolean) => void
}

/**
 * Confirms unassigning a target. Shows what the unassign preview found will
 * be deleted, then applies it on confirmation.
 */
export function UnassignTargetDialog({
  rolloutId,
  target,
  onOpenChange,
}: UnassignTargetDialogProps) {
  return (
    <Dialog open={rolloutId !== null} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>取消分配目标</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.organization_name} / ${target.workspace_name}. `
              : ""}
            取消分配会删除工作空间中的所有托管资源。
          </DialogDescription>
        </DialogHeader>
        {rolloutId && <UnassignContent rolloutId={rolloutId} />}
      </DialogContent>
    </Dialog>
  )
}

function UnassignContent({ rolloutId }: { rolloutId: string }) {
  const { rollouts, error, refetch } = useTrackedRollouts([rolloutId])
  const applyRollouts = useApplyRollouts()
  const rollout = rollouts[0]

  async function handleApply() {
    try {
      await applyRollouts.mutateAsync([rolloutId])
      await refetch()
    } catch (err) {
      toastApiError("取消分配目标失败", err)
    }
  }

  const canApply =
    rollout !== undefined && APPLICABLE_ROLLOUT_STATUSES.has(rollout.status)

  return (
    <>
      <DialogBody>
        {rollout && <UnassignPreview rollout={rollout} />}
        {!rollout && error && (
          <div className="space-y-2 text-sm">
            <p className="text-destructive">
              {getApiErrorDetail(error) ?? "无法加载预览。"}
            </p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              重试
            </Button>
          </div>
        )}
        {!rollout && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-3" />
            正在加载预览…
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleApply}
          disabled={!canApply || applyRollouts.isPending}
        >
          {applyRollouts.isPending ? "正在取消分配…" : "取消分配并删除"}
        </Button>
      </DialogFooter>
    </>
  )
}

function UnassignPreview({ rollout }: { rollout: ManagedRolloutRead }) {
  const preview = rollout.preview
  const deletions = (preview?.changes ?? []).filter(
    (change) => change.change === "deleted"
  )
  const warnings = preview?.delete_warnings ?? []
  const diagnostics = preview?.diagnostics ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">状态</span>
        <RolloutStatusBadge status={rollout.status} />
      </div>
      {rollout.status === "applied" && (
        <p className="text-sm">已取消分配目标并移除其托管资源。</p>
      )}
      {rollout.error && (
        <p className="whitespace-pre-wrap text-xs text-destructive">
          {rollout.error}
        </p>
      )}
      {preview && (
        <>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              待删除资源{" "}
              <span className="text-muted-foreground">
                ({deletions.length})
              </span>
            </h4>
            {deletions.length === 0 ? (
              <p className="text-xs text-muted-foreground">无</p>
            ) : (
              <ul className="divide-y rounded-md border text-xs">
                {deletions.map((change) => (
                  <li
                    key={`${change.resource_type}:${change.source_id}`}
                    className="flex gap-2 px-3 py-2"
                  >
                    <span className="text-muted-foreground">
                      {resourceTypeLabel(change.resource_type)}
                    </span>
                    <span className="font-medium">{change.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              删除警告{" "}
              <span className="text-muted-foreground">({warnings.length})</span>
            </h4>
            {warnings.length === 0 ? (
              <p className="text-xs text-muted-foreground">无</p>
            ) : (
              <DeleteWarningList warnings={warnings} />
            )}
          </div>
          {diagnostics.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {diagnostics.map((diagnostic) => (
                <li key={diagnostic}>{diagnostic}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
