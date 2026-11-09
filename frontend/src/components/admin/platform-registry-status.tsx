"use client"

import type { AdminRegistryGetRegistryStatusResponse } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Item } from "@/components/ui/item"
import { getRelativeTime } from "@/lib/event-history"

type PlatformRegistryStatusProps = {
  status?: AdminRegistryGetRegistryStatusResponse
  isLoading: boolean
}

export function PlatformRegistryStatus({
  status,
  isLoading,
}: PlatformRegistryStatusProps) {
  if (isLoading) {
    return <div className="text-muted-foreground">加载中…</div>
  }

  return (
    <Item variant="outline" className="p-6">
      <div className="flex w-full items-start justify-between gap-6">
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">仓库总数</div>
          <div className="text-2xl font-semibold">
            {status?.total_repositories ?? 0}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">上次同步</div>
          <div className="text-lg">
            {status?.last_sync_at
              ? getRelativeTime(new Date(status.last_sync_at))
              : "从未"}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">状态</div>
          <Badge
            variant={status?.repositories?.length ? "default" : "secondary"}
          >
            {status?.repositories?.length ? "已启用" : "暂无仓库"}
          </Badge>
        </div>
      </div>
    </Item>
  )
}
