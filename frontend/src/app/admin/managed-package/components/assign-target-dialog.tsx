"use client"

import { useState } from "react"
import type { GitTagInfo } from "@/client"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { useAdminOrganizations } from "@/hooks/use-admin"
import { toastApiError } from "../managed-package-utils"
import { useAssignTarget, useTargetCandidates } from "../use-managed-package"

/** Props for {@link AssignTargetDialog}. */
export interface AssignTargetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: GitTagInfo[]
}

/** Assign a customer workspace as a target pinned to a tag. */
export function AssignTargetDialog({
  open,
  onOpenChange,
  tags,
}: AssignTargetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        {open && (
          <AssignTargetForm tags={tags} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AssignTargetForm({
  tags,
  onDone,
}: {
  tags: GitTagInfo[]
  onDone: () => void
}) {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [pinnedTag, setPinnedTag] = useState<string | null>(
    tags[0]?.name ?? null
  )
  const { organizations, isLoading: organizationsLoading } =
    useAdminOrganizations()
  const {
    candidates,
    isLoading: candidatesLoading,
    error: candidatesError,
  } = useTargetCandidates(organizationId)
  const assignTarget = useAssignTarget()

  const available = candidates.filter(
    (candidate) => !candidate.is_source && !candidate.target_id
  )

  async function handleAssign() {
    if (!workspaceId || !pinnedTag) {
      return
    }
    try {
      const target = await assignTarget.mutateAsync({ workspaceId, pinnedTag })
      toast({
        title: "已分配目标",
        description: `${target.workspace_name} 已固定到 ${target.pinned_tag}。预览并应用以部署该版本。`,
      })
      onDone()
    } catch (err) {
      toastApiError("分配目标失败", err)
    }
  }

  let workspacePlaceholder = "选择工作空间"
  if (!organizationId) {
    workspacePlaceholder = "请先选择组织"
  } else if (candidatesLoading) {
    workspacePlaceholder = "正在加载工作空间…"
  } else if (candidatesError) {
    workspacePlaceholder = "无法加载工作空间"
  } else if (available.length === 0) {
    workspacePlaceholder = "没有可用的工作空间"
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>分配目标</DialogTitle>
        <DialogDescription>
          将客户工作空间固定到指定版本。预览并应用部署后才会生效。
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>组织</Label>
            <Select
              value={organizationId ?? undefined}
              onValueChange={(value) => {
                setOrganizationId(value)
                setWorkspaceId(null)
              }}
              disabled={organizationsLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    organizationsLoading ? "正在加载组织…" : "选择组织"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(organizations ?? []).map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>工作空间</Label>
            <Select
              value={workspaceId ?? undefined}
              onValueChange={setWorkspaceId}
              disabled={!organizationId || available.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={workspacePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {available.map((candidate) => (
                  <SelectItem
                    key={candidate.workspace_id}
                    value={candidate.workspace_id}
                  >
                    {candidate.workspace_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              已隐藏源工作空间和现有目标。
            </p>
          </div>
          <div className="space-y-2">
            <Label>固定标签</Label>
            <Select
              value={pinnedTag ?? undefined}
              onValueChange={setPinnedTag}
              disabled={tags.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={tags.length === 0 ? "暂无标签" : "选择标签"}
                />
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.name} value={tag.name}>
                    <span className="font-mono">{tag.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button
          size="sm"
          onClick={handleAssign}
          disabled={!workspaceId || !pinnedTag || assignTarget.isPending}
        >
          {assignTarget.isPending ? "分配中…" : "分配"}
        </Button>
      </DialogFooter>
    </>
  )
}
