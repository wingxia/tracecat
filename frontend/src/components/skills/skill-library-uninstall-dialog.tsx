"use client"

import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/**
 * Confirm uninstalling a library entry: one skill, or every skill in a group.
 *
 * @param props Dialog state, provider details, and the confirm handler.
 * @returns The confirmation dialog.
 */
export function SkillLibraryUninstallDialog({
  open,
  onOpenChange,
  providerName,
  skillCount,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerName: string
  skillCount: number
  pending: boolean
  onConfirm: () => Promise<void>
}) {
  const single = skillCount === 1
  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!pending) onOpenChange(isOpen)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {single
              ? `卸载 ${providerName}？`
              : `卸载所有 ${providerName} 技能？`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {single
              ? "此操作会从工作空间移除此技能。如果仍有智能体使用它，卸载将被拒绝，技能会保留。"
              : `此操作会从工作空间移除 ${skillCount} 个技能。如果仍有智能体使用其中任一技能，整个卸载操作将被拒绝，所有技能都会保留。`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              void onConfirm()
            }}
            variant="destructive"
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {single ? "卸载" : "全部卸载"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
