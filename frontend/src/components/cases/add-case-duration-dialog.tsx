"use client"

import {
  buildDurationFilters,
  CaseDurationDialog,
  type CaseDurationFormValues,
} from "@/components/cases/case-duration-dialog"
import { toast } from "@/components/ui/use-toast"
import { createCaseDurationDefinition } from "@/lib/case-durations"
import { useMutation, useQueryClient } from "@/lib/query"
import { useWorkspaceId } from "@/providers/workspace-id"

interface AddCaseDurationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCaseDurationDialog({
  open,
  onOpenChange,
}: AddCaseDurationDialogProps) {
  const workspaceId = useWorkspaceId()
  const queryClient = useQueryClient()

  const { mutateAsync: handleCreate, isPending } = useMutation({
    mutationFn: async (values: CaseDurationFormValues) => {
      if (!workspaceId) {
        throw new Error("Workspace ID is required")
      }

      const startFilters = buildDurationFilters(
        values.start.eventType,
        values.start.filterValues,
        values.start
      )
      const endFilters = buildDurationFilters(
        values.end.eventType,
        values.end.filterValues,
        values.end
      )

      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        start_anchor: {
          event_type: values.start.eventType,
          selection: values.start.selection,
          ...(startFilters ? { filters: startFilters } : {}),
        },
        end_anchor: {
          event_type: values.end.eventType,
          selection: values.end.selection,
          ...(endFilters ? { filters: endFilters } : {}),
        },
      }

      await createCaseDurationDefinition(workspaceId, payload)
    },
    onSuccess: async () => {
      if (!workspaceId) {
        return
      }

      await queryClient.invalidateQueries({
        queryKey: ["case-duration-definitions", workspaceId],
      })

      toast({
        title: "已创建时长指标",
        description: "已成功添加事件时长定义。",
      })

      onOpenChange(false)
    },
    onError: (error: unknown) => {
      console.error("Failed to create case duration definition", error)
      toast({
        title: "创建时长指标出错",
        description:
          error instanceof Error
            ? error.message
            : "创建事件时长定义失败，请重试。",
        variant: "destructive",
      })
    },
  })

  const onSubmit = (values: CaseDurationFormValues) => {
    void handleCreate(values)
  }

  return (
    <CaseDurationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={"创建时长指标"}
      description={"使用匹配的事件变更定义时长指标。"}
      submitLabel={isPending ? "创建中…" : "创建时长指标"}
      isSubmitting={isPending}
      onSubmit={onSubmit}
    />
  )
}
