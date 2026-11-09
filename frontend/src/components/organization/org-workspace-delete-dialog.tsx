"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface OrgWorkspaceDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceName: string
  onConfirm: () => void | Promise<void>
  isDeleting?: boolean
}

export function OrgWorkspaceDeleteDialog({
  open,
  onOpenChange,
  workspaceName,
  onConfirm,
  isDeleting = false,
}: OrgWorkspaceDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const isConfirmValid = confirmText === workspaceName

  const handleConfirm = async () => {
    if (isConfirmValid) {
      try {
        await onConfirm()
        setConfirmText("")
      } catch (error) {
        console.error("Failed to delete workspace:", error)
        // Keep dialog open and confirmText intact so user can retry
      }
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>删除工作空间</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              确定要删除工作空间 <strong>{workspaceName}</strong>
              吗？此操作无法撤销。
            </p>
            <p>此操作将永久删除：</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>此工作空间中的所有工作流</li>
              <li>所有数据表及数据</li>
              <li>所有事件及事件数据</li>
              <li>所有凭据和集成</li>
              <li>所有成员访问权限</li>
            </ul>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                输入 <strong>{workspaceName}</strong> 以确认：
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={"输入工作空间名称"}
                disabled={isDeleting}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "删除中…" : "删除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
