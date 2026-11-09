"use client"

import { useState } from "react"
import type { GitTagInfo, ManagedTargetRead } from "@/client"
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
import { tagAge, toastApiError } from "../managed-package-utils"
import { useUpdateTargetPin } from "../use-managed-package"

/** Props for {@link ChangePinDialog}. */
export interface ChangePinDialogProps {
  target: ManagedTargetRead | null
  tags: GitTagInfo[]
  onOpenChange: (open: boolean) => void
}

/** Move a target's pinned tag. A rollout is still needed to apply it. */
export function ChangePinDialog({
  target,
  tags,
  onOpenChange,
}: ChangePinDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        {target && (
          <ChangePinForm
            target={target}
            tags={tags}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ChangePinForm({
  target,
  tags,
  onDone,
}: {
  target: ManagedTargetRead
  tags: GitTagInfo[]
  onDone: () => void
}) {
  const [pinnedTag, setPinnedTag] = useState(target.pinned_tag)
  const updatePin = useUpdateTargetPin()
  const isRollback =
    tagAge(tags, pinnedTag) > tagAge(tags, target.pinned_tag) &&
    tagAge(tags, target.pinned_tag) >= 0

  async function handleSave() {
    try {
      await updatePin.mutateAsync({ targetId: target.id, pinnedTag })
      toast({
        title: "已更新固定版本",
        description: `${target.workspace_name} 已固定到 ${pinnedTag}。预览并应用以部署该版本。`,
      })
      onDone()
    } catch (err) {
      toastApiError("更新固定版本失败", err)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>更改固定版本</DialogTitle>
        <DialogDescription>
          {target.organization_name} / {target.workspace_name}
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <div className="space-y-2">
          <Label>固定标签</Label>
          <Select value={pinnedTag} onValueChange={setPinnedTag}>
            <SelectTrigger>
              <SelectValue placeholder={"选择标签"} />
            </SelectTrigger>
            <SelectContent>
              {tags.map((tag) => (
                <SelectItem key={tag.name} value={tag.name}>
                  <span className="font-mono">{tag.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isRollback && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              此标签早于当前固定版本，应用后将回滚目标。
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            更改固定版本不会立即生效。预览并应用部署后才会更新工作空间。
          </p>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updatePin.isPending || pinnedTag === target.pinned_tag}
        >
          {updatePin.isPending ? "保存中…" : "保存"}
        </Button>
      </DialogFooter>
    </>
  )
}
