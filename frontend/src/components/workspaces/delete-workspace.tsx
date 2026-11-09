import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface ConfirmDeleteProps {
  workspaceName: string
  onDelete: () => void
}

export function ConfirmDelete({ workspaceName, onDelete }: ConfirmDeleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")

  const handleDelete = () => {
    if (confirmText === workspaceName) {
      onDelete()
      setIsOpen(false)
      setConfirmText("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">删除工作空间</Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>确定要删除此工作空间吗？</DialogTitle>
          <DialogDescription>
            此操作无法撤销，请输入“{workspaceName}
            ”以确认。
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`输入“${workspaceName}”以确认`}
          />
        </DialogBody>
        <DialogFooter>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== workspaceName}
          >
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
