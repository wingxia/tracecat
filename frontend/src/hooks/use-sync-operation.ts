import { useEffect, useRef } from "react"
import { type SyncOperationRead, workflowsGetSyncOperation } from "@/client"
import { useQuery } from "@/lib/query"
import {
  expireSyncOperation,
  isTransientSyncError,
  syncOperationPollInterval,
} from "@/lib/workspace-sync-operations"

/** An accepted job is still durable even when its status cannot be read. */
export class SyncOperationPollingError extends Error {
  constructor() {
    super(
      "无法读取同步进度，已接受的操作可能仍在运行。请重新打开 Git 同步以查看状态。"
    )
    this.name = "SyncOperationPollingError"
  }
}

/** Leaving the view detaches its waiter while the accepted operation continues. */
export class SyncOperationWaitCancelled extends Error {
  constructor() {
    super("同步将在后台继续")
    this.name = "SyncOperationWaitCancelled"
  }
}

/** Poll one durable phase while this view is mounted; leaving never cancels the job. */
export function useSyncOperationWaiter(workspaceId: string) {
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  return async function waitForOperation(
    id: string
  ): Promise<SyncOperationRead> {
    let failures = 0
    while (mounted.current) {
      let operation: SyncOperationRead
      try {
        operation = await workflowsGetSyncOperation({
          workspaceId,
          operationId: id,
        })
        if (!mounted.current) throw new SyncOperationWaitCancelled()
        failures = 0
      } catch (error) {
        if (!mounted.current) throw new SyncOperationWaitCancelled()
        if (!isTransientSyncError(error)) throw error
        if (++failures > 3) throw new SyncOperationPollingError()
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * 2 ** (failures - 1))
        )
        continue
      }
      if (!["queued", "running", "applying"].includes(operation.status))
        return operation
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
    throw new SyncOperationWaitCancelled()
  }
}

/** Observe an accepted job; retries only read the same operation. */
export function useSyncOperation(workspaceId: string, operationId?: string) {
  return useQuery({
    queryKey: ["sync-operation", workspaceId, operationId],
    queryFn: async () =>
      expireSyncOperation(
        await workflowsGetSyncOperation({
          workspaceId,
          operationId: operationId!,
        })
      ),
    enabled: Boolean(operationId),
    retry: (count, error) => isTransientSyncError(error) && count < 3,
    refetchInterval: (query) =>
      syncOperationPollInterval(query.state.data, query.state.error),
  })
}
