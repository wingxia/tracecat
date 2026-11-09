"use client"

import { ArrowUpRight, Timer } from "lucide-react"
import { useState } from "react"
import type { CaseDurationDefinitionUpdate } from "@/client"
import { CaseDurationsTable } from "@/components/cases/case-durations-table"
import { EntitlementRequiredEmptyState } from "@/components/entitlement-required-empty-state"
import { CenteredSpinner } from "@/components/loading/spinner"
import { AlertNotification } from "@/components/notifications"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { toast } from "@/components/ui/use-toast"
import { useEntitlements } from "@/hooks/use-entitlements"
import { useWorkspaceDetails } from "@/hooks/use-workspace"
import {
  deleteCaseDurationDefinition,
  updateCaseDurationDefinition,
} from "@/lib/case-durations"
import { useCaseDurationDefinitions } from "@/lib/hooks"
import { useMutation, useQueryClient } from "@/lib/query"
import { useWorkspaceId } from "@/providers/workspace-id"

export function CaseDurationsView() {
  const workspaceId = useWorkspaceId()
  const { workspace, workspaceLoading, workspaceError } = useWorkspaceDetails()
  const queryClient = useQueryClient()
  const { hasEntitlement, isLoading: entitlementsLoading } = useEntitlements()
  const caseAddonsEnabled = hasEntitlement("case_addons")

  const {
    caseDurationDefinitions,
    caseDurationDefinitionsIsLoading,
    caseDurationDefinitionsError,
  } = useCaseDurationDefinitions(workspaceId, caseAddonsEnabled)

  const { mutateAsync: handleDelete, isPending: deleteIsPending } = useMutation(
    {
      mutationFn: async (durationId: string) => {
        if (!workspaceId) {
          throw new Error("Workspace ID is required")
        }

        await deleteCaseDurationDefinition(workspaceId, durationId)
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ["case-duration-definitions", workspaceId],
        })
        toast({
          title: "已删除时长指标",
          description: "已成功移除事件时长定义。",
        })
      },
      onError: (error: unknown) => {
        console.error("Failed to delete case duration definition", error)
        toast({
          title: "删除时长指标出错",
          description:
            error instanceof Error
              ? error.message
              : "删除事件时长定义失败，请重试。",
          variant: "destructive",
        })
      },
    }
  )

  const [updatingDurationId, setUpdatingDurationId] = useState<string | null>(
    null
  )

  const { mutateAsync: handleUpdate, isPending: updateIsPending } = useMutation(
    {
      mutationFn: async ({
        durationId,
        payload,
      }: {
        durationId: string
        payload: CaseDurationDefinitionUpdate
      }) => {
        if (!workspaceId) {
          throw new Error("Workspace ID is required")
        }

        return await updateCaseDurationDefinition(
          workspaceId,
          durationId,
          payload
        )
      },
      onMutate: async ({ durationId }) => {
        setUpdatingDurationId(durationId)
      },
      onSuccess: async () => {
        if (!workspaceId) {
          return
        }

        await queryClient.invalidateQueries({
          queryKey: ["case-duration-definitions", workspaceId],
        })

        toast({
          title: "已更新时长指标",
          description: "已成功更新事件时长定义。",
        })
      },
      onError: (error: unknown) => {
        console.error("Failed to update case duration definition", error)
        toast({
          title: "更新时长指标出错",
          description:
            error instanceof Error
              ? error.message
              : "更新事件时长定义失败，请重试。",
          variant: "destructive",
        })
      },
      onSettled: () => {
        setUpdatingDurationId(null)
      },
    }
  )

  // Check feature flag loading first - fastest check
  if (entitlementsLoading) {
    return <CenteredSpinner />
  }

  // Show enterprise-only message if feature is not enabled
  // This shows immediately after feature flags load (~200ms)
  if (!caseAddonsEnabled) {
    return (
      <div className="size-full overflow-auto">
        <div className="container flex h-full max-w-[1000px] items-center justify-center py-8">
          <EntitlementRequiredEmptyState
            title={"仅限企业版"}
            description={"事件时长指标仅适用于企业版套餐。"}
          >
            <Button
              variant="link"
              asChild
              className="text-muted-foreground"
              size="sm"
            >
              <a
                href="https://tracecat.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                了解更多 <ArrowUpRight className="size-4" />
              </a>
            </Button>
          </EntitlementRequiredEmptyState>
        </div>
      </div>
    )
  }

  // Only check workspace and case durations loading if feature is enabled
  if (workspaceLoading || caseDurationDefinitionsIsLoading) {
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

  if (caseDurationDefinitionsError) {
    return (
      <AlertNotification
        level="error"
        message={`加载事件时长定义出错：${caseDurationDefinitionsError.message}`}
      />
    )
  }

  if (!caseDurationDefinitions || caseDurationDefinitions.length === 0) {
    return (
      <div className="size-full overflow-auto">
        <div className="container flex h-full max-w-[1000px] items-center justify-center py-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Timer className="size-6" />
              </EmptyMedia>
              <EmptyTitle>尚未定义时长指标</EmptyTitle>
              <EmptyDescription>
                使用顶部按钮添加第一个时长指标。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    )
  }

  return (
    <div className="size-full overflow-auto">
      <div className="flex h-full w-full flex-col space-y-8 p-8">
        <CaseDurationsTable
          durations={caseDurationDefinitions}
          onDeleteDuration={handleDelete}
          isDeleting={deleteIsPending}
          onUpdateDuration={async (durationId, payload) => {
            await handleUpdate({ durationId, payload })
          }}
          isUpdating={updateIsPending}
          updatingDurationId={updatingDurationId}
        />
      </div>
    </div>
  )
}
