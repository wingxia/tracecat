"use client"

import { useEffect, useMemo, useState } from "react"
import type {
  WorkflowExecutionResetPointRead,
  WorkflowExecutionResetReapplyType,
} from "@/client"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ResetWorkflowRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  executionCount: number
  resetPoints: WorkflowExecutionResetPointRead[]
  resetPointsLoading: boolean
  isSubmitting: boolean
  onSubmit: (input: {
    eventId?: number | null
    reason?: string | null
    reapplyType: WorkflowExecutionResetReapplyType
  }) => Promise<void>
}

export function ResetWorkflowRunDialog({
  open,
  onOpenChange,
  executionCount,
  resetPoints,
  resetPointsLoading,
  isSubmitting,
  onSubmit,
}: ResetWorkflowRunDialogProps) {
  const [eventIdText, setEventIdText] = useState("")
  const [selectedPoint, setSelectedPoint] = useState("start")
  const [reason, setReason] = useState("")
  const [reapplyType, setReapplyType] =
    useState<WorkflowExecutionResetReapplyType>("all_eligible")

  useEffect(() => {
    if (!open) {
      setEventIdText("")
      setSelectedPoint("start")
      setReason("")
      setReapplyType("all_eligible")
    }
  }, [open])

  const resettablePoints = useMemo(
    () => resetPoints.filter((point) => point.is_resettable),
    [resetPoints]
  )

  const useResetPointSelect =
    executionCount === 1 && resettablePoints.length > 0

  const helperText = useMemo(() => {
    if (useResetPointSelect) {
      return "从工作流历史中选择起点或指定的重置位置。"
    }
    if (!eventIdText.trim()) {
      return "留空则从起点重置。"
    }
    return "将使用此执行事件之前或当时最近的可重置位置。"
  }, [eventIdText, useResetPointSelect])

  const handleSubmit = async () => {
    let parsedEventId: number | null = null
    if (useResetPointSelect) {
      if (selectedPoint !== "start") {
        const eventId = Number(selectedPoint)
        if (!Number.isInteger(eventId) || eventId <= 0) {
          return
        }
        parsedEventId = eventId
      }
    } else {
      const trimmedEventId = eventIdText.trim()
      if (trimmedEventId) {
        const candidateEventId = Number(trimmedEventId)
        if (!Number.isInteger(candidateEventId) || candidateEventId <= 0) {
          return
        }
        parsedEventId = candidateEventId
      }
    }

    await onSubmit({
      eventId: parsedEventId,
      reason: reason.trim() || null,
      reapplyType,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>重置工作流运行</DialogTitle>
          <DialogDescription>
            {executionCount === 1
              ? "从起点或指定执行事件重置所选工作流运行。"
              : `从起点或指定执行事件重置所选的 ${executionCount} 次工作流运行。`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-id">
                {useResetPointSelect ? "重置位置" : "执行事件 ID"}
              </Label>
              {useResetPointSelect ? (
                <Select value={selectedPoint} onValueChange={setSelectedPoint}>
                  <SelectTrigger id="event-id">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">开始</SelectItem>
                    {resettablePoints.map((point) => (
                      <SelectItem
                        key={point.event_id}
                        value={String(point.event_id)}
                      >
                        执行事件 {point.event_id} -{" "}
                        {point.event_type.replaceAll("_", " ").toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="event-id"
                  type="number"
                  min={1}
                  placeholder={"开始"}
                  value={eventIdText}
                  onChange={(event) => setEventIdText(event.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">{helperText}</p>
              {resetPointsLoading ? (
                <p className="text-xs text-muted-foreground">
                  正在加载重置位置…
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reapply-type">重新应用类型</Label>
              <Select
                value={reapplyType}
                onValueChange={(value: WorkflowExecutionResetReapplyType) =>
                  setReapplyType(value)
                }
              >
                <SelectTrigger id="reapply-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_eligible">
                    所有符合条件的事件
                  </SelectItem>
                  <SelectItem value="signal_only">仅信号</SelectItem>
                  <SelectItem value="none">无</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">原因</Label>
              <Input
                id="reason"
                placeholder={"原因（可选）"}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            重置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
