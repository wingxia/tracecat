"use client"

import { ConfirmDestructiveDialog } from "@/components/confirm-destructive-dialog"

/**
 * Confirmation dialog for deleting an agent. The user types the agent slug.
 */
export function AgentPresetDeleteDialog({
  open,
  onOpenChange,
  presetName,
  presetSlug,
  isDeleting,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
  presetName: string
  presetSlug: string
  isDeleting: boolean
  onConfirm: () => Promise<void> | void
}) {
  return (
    <ConfirmDestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={"删除智能体"}
      description={<AgentDeleteDescription name={presetName} />}
      identifier={{ label: "智能体标识", value: presetSlug }}
      confirmPhrase={presetSlug}
      confirmLabel={"删除"}
      isPending={isDeleting}
      onConfirm={onConfirm}
    />
  )
}

export function AgentDeleteDescription({ name }: { name: string }) {
  return (
    <>
      永久删除 <span className="font-medium text-foreground">{name}</span>
      吗？此操作还会从所有使用它的智能体（包括已保存版本）中移除该子智能体。恢复旧版本也不会找回此子智能体。此操作无法撤销。
    </>
  )
}
