"use client"

import { DatabaseIcon, LoaderCircleIcon } from "lucide-react"
import { useEffect, useState } from "react"
import {
  adminMaintenanceGetCaseAgentSessionInteractionBackfill,
  adminMaintenanceStartCaseAgentSessionInteractionBackfill,
  type CaseAgentSessionInteractionBackfillResponse,
} from "@/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { toast } from "@/components/ui/use-toast"
import { useMutation, useQuery } from "@/lib/query"

export default function AdminMaintenancePage() {
  const [lastReport, setLastReport] =
    useState<CaseAgentSessionInteractionBackfillResponse>()
  const [operationId, setOperationId] = useState<string>()
  const [reportedOperationId, setReportedOperationId] = useState<string>()
  const { mutateAsync: startBackfill, isPending: isStarting } = useMutation({
    mutationFn: adminMaintenanceStartCaseAgentSessionInteractionBackfill,
  })
  const { data: operation } = useQuery({
    queryKey: ["admin", "maintenance", "case-agent-interactions", operationId],
    queryFn: () =>
      adminMaintenanceGetCaseAgentSessionInteractionBackfill({
        operationId: operationId as string,
      }),
    enabled: operationId !== undefined,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "completed" || status === "failed" ? false : 2000
    },
  })

  useEffect(() => {
    if (!operationId || reportedOperationId === operationId) {
      return
    }
    if (operation?.status === "completed" && operation.report) {
      setLastReport(operation.report)
      setReportedOperationId(operationId)
      toast({
        title: "回填完成",
        description: `已创建 ${operation.report.inserted} 条事件交互记录。`,
      })
    } else if (operation?.status === "failed") {
      setReportedOperationId(operationId)
      toast({
        title: "回填失败",
        description: "维护操作未完成。",
        variant: "destructive",
      })
    }
  }, [operation, operationId, reportedOperationId])

  async function handleRunBackfill() {
    try {
      const started = await startBackfill()
      setOperationId(started.operation_id)
      setLastReport(undefined)
      toast({
        title: "回填已启动",
        description: "维护操作正在后台运行。",
      })
    } catch (error) {
      console.error("Failed to start case agent interaction backfill", error)
      toast({
        title: "无法启动回填",
        description: "无法启动维护操作。",
        variant: "destructive",
      })
    }
  }

  const isRunning =
    isStarting ||
    (operationId !== undefined &&
      operation?.status !== "completed" &&
      operation?.status !== "failed")

  const skippedCount = lastReport
    ? Object.values(lastReport.skipped).reduce(
        (total, count) => total + count,
        0
      )
    : 0

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">维护</h2>
            <p className="text-base text-muted-foreground">
              执行整个平台的数据维护操作。
            </p>
          </div>
        </div>

        <Item variant="outline" className="p-6">
          <ItemMedia variant="icon">
            <DatabaseIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>事件智能体交互</ItemTitle>
            <ItemDescription className="line-clamp-none">
              从已保存的智能体会话历史中回填成功的事件和评论变更。忽略读取操作和失败的工具调用，可安全地重复运行。
            </ItemDescription>
            {isRunning ? (
              <p className="mt-2 text-sm text-muted-foreground">
                回填正在后台运行，可以离开此页面。
              </p>
            ) : lastReport ? (
              <p className="mt-2 text-sm text-muted-foreground">
                上次运行： {lastReport.inserted} 条已插入，{" "}
                {lastReport.existing} 条已存在， {skippedCount} 条已跳过，涉及{" "}
                {lastReport.sessions_scanned} 个会话。
              </p>
            ) : null}
          </ItemContent>
          <ItemActions>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={isRunning}>
                  {isRunning ? (
                    <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {isRunning ? "运行中…" : "运行回填"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>回填事件交互记录？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作会扫描所有工作空间的智能体会话历史，记录历史上成功的事件变更。大型部署可能需要几分钟。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRunBackfill}>
                    运行回填
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </ItemActions>
        </Item>
      </div>
    </div>
  )
}
