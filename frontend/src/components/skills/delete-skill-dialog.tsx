"use client"

import type { SkillReadMinimal } from "@/client"
import { ConfirmDestructiveDialog } from "@/components/confirm-destructive-dialog"

type DeleteSkillDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill: SkillReadMinimal | null
  pending: boolean
  onConfirm: () => Promise<void> | void
}

/**
 * Confirmation dialog for deleting a skill. The user types the skill slug.
 */
export function DeleteSkillDialog({
  open,
  onOpenChange,
  skill,
  pending,
  onConfirm,
}: DeleteSkillDialogProps) {
  const slug = skill?.slug ?? ""
  return (
    <ConfirmDestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={"删除技能"}
      description={
        <>
          删除{" "}
          <span className="font-medium text-foreground">{skill?.name}</span>
          吗？此操作会从技能工作室及所有使用它的智能体（包括已保存版本）中移除该技能。恢复旧版智能体也不会找回此技能。此操作无法撤销。
        </>
      }
      identifier={{ label: "技能标识", value: slug }}
      confirmPhrase={slug}
      isPending={pending}
      onConfirm={onConfirm}
    />
  )
}
