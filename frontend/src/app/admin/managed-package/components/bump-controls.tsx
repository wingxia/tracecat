"use client"

import { useState } from "react"
import type { GitTagInfo, ManagedTargetRead } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { tagAge } from "../managed-package-utils"

/** Props for {@link BumpControls}. */
export interface BumpControlsProps {
  selectedTargets: ManagedTargetRead[]
  tags: GitTagInfo[]
  isPending: boolean
  onPreview: (tag: string) => void
  onClearSelection: () => void
}

/** Pick a tag for the selected targets and start a preview rollout. */
export function BumpControls({
  selectedTargets,
  tags,
  isPending,
  onPreview,
  onClearSelection,
}: BumpControlsProps) {
  const [tag, setTag] = useState<string | null>(tags[0]?.name ?? null)
  // Fall back to the latest tag when the picked one is no longer listed.
  const tagExists = tags.some((option) => option.name === tag)
  const chosenTag = tagExists ? tag : (tags[0]?.name ?? null)
  const chosenAge = tagAge(tags, chosenTag)

  const rollbackCount = selectedTargets.filter((target) => {
    const currentAge = tagAge(
      tags,
      target.last_applied_tag ?? target.pinned_tag
    )
    return currentAge >= 0 && chosenAge > currentAge
  }).length

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">
          {selectedTargets.length} 个目标
          {selectedTargets.length === 1 ? "" : ""} 已选择
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={chosenTag ?? undefined}
            onValueChange={setTag}
            disabled={tags.length === 0}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder={"选择标签"} />
            </SelectTrigger>
            <SelectContent>
              {tags.map((option, index) => (
                <SelectItem key={option.name} value={option.name}>
                  <span className="font-mono">{option.name}</span>
                  {index === 0 && (
                    <span className="ml-2 text-muted-foreground">最新</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => chosenTag && onPreview(chosenTag)}
            disabled={!chosenTag || isPending}
          >
            {isPending ? "启动中…" : "预览"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClearSelection}>
            清除
          </Button>
        </div>
      </div>
      {rollbackCount > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {chosenTag} 版本早于 {rollbackCount} 个已选目标中
          {rollbackCount === 1 ? " 已" : " 已"} 应用的版本。应用后将回滚
          {rollbackCount === 1 ? " 该目标" : " 这些目标"} 。
        </p>
      )}
    </div>
  )
}
