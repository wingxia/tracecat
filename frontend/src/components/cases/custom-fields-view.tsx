"use client"

import { DatabaseIcon } from "lucide-react"
import { casesDeleteField } from "@/client"
import { CustomFieldsTable } from "@/components/cases/custom-fields-table"
import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { toast } from "@/components/ui/use-toast"
import { useWorkspaceDetails } from "@/hooks/use-workspace"
import { invalidateCaseFieldQueries } from "@/lib/cases/invalidation"
import { useCaseFields } from "@/lib/hooks"
import { useMutation, useQueryClient } from "@/lib/query"
import { useWorkspaceId } from "@/providers/workspace-id"

export function CustomFieldsView() {
  const workspaceId = useWorkspaceId()
  const { workspace, workspaceLoading, workspaceError } = useWorkspaceDetails()
  const queryClient = useQueryClient()

  const { caseFields, caseFieldsIsLoading, caseFieldsError } =
    useCaseFields(workspaceId)

  const { mutateAsync: deleteCaseField, isPending: deleteCaseFieldIsPending } =
    useMutation({
      mutationFn: async (fieldId: string) => {
        return await casesDeleteField({
          workspaceId,
          fieldId,
        })
      },
      onSuccess: async () => {
        await invalidateCaseFieldQueries(queryClient, workspaceId)
        toast({
          title: "已删除字段",
          description: "已成功删除事件字段。",
        })
      },
      onError: (error) => {
        console.error("Failed to delete case field", error)
        toast({
          title: "删除字段出错",
          description: "删除事件字段失败，请重试。",
          variant: "destructive",
        })
      },
    })

  const handleDeleteField = async (fieldId: string) => {
    // Ensure caseFields exists before attempting to find a field
    if (!caseFields) {
      return
    }

    // Find the field to check if it's reserved
    const field = caseFields.find((f) => f.id === fieldId)

    // Don't allow deletion of reserved fields
    if (field && field.reserved) {
      return
    }

    await deleteCaseField(fieldId)
  }

  if (workspaceLoading || caseFieldsIsLoading) {
    return <CenteredSpinner />
  }

  if (workspaceError) {
    return (
      <AlertNotification level="error" message={"加载工作空间信息出错。"} />
    )
  }

  if (!workspace) {
    return <AlertNotification level="error" message={"未找到工作空间。"} />
  }

  if (caseFieldsError || !caseFields) {
    return (
      <AlertNotification
        level="error"
        message={`加载事件字段出错：${caseFieldsError?.message || "未知错误"}`}
      />
    )
  }

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-8 py-8">
        {caseFields.filter((field) => !field.reserved).length === 0 ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <DatabaseIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>尚未定义自定义字段</EmptyTitle>
              <EmptyDescription>
                使用顶部按钮添加第一个自定义字段
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-4">
            <CustomFieldsTable
              fields={caseFields}
              onDeleteField={handleDeleteField}
              isDeleting={deleteCaseFieldIsPending}
            />
          </div>
        )}
      </div>
    </div>
  )
}
