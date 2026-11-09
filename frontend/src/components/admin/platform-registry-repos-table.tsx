"use client"

import { DotsHorizontalIcon, ReloadIcon } from "@radix-ui/react-icons"
import { useState } from "react"
import type { RepositoryStatus } from "@/client"
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableToolbarProps,
} from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import { useAdminRegistryStatus, useAdminRegistrySync } from "@/hooks/use-admin"
import { getApiErrorDetail } from "@/lib/errors"
import { getRelativeTime } from "@/lib/event-history"

export function PlatformRegistryReposTable() {
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const { status, isLoading, refetch } = useAdminRegistryStatus()
  const { syncRepository, syncPending } = useAdminRegistrySync()

  const handleSync = async (repositoryId: string, force = false) => {
    setSyncingId(repositoryId)
    try {
      await syncRepository({ repositoryId, force })
      toast({
        title: "同步完成",
        description: "仓库同步成功。",
      })
      refetch()
    } catch (error) {
      console.error("Failed to sync repository", error)
      const detail = getApiErrorDetail(error) ?? "同步仓库失败，请重试。"
      toast({
        title: "同步失败",
        description: detail,
        variant: "destructive",
      })
    } finally {
      setSyncingId(null)
    }
  }

  if (isLoading) {
    return <div className="text-muted-foreground">正在加载仓库…</div>
  }

  const repositories = status?.repositories ?? []

  return (
    <DataTable
      data={repositories}
      initialSortingState={[{ id: "name", desc: false }]}
      columns={[
        {
          accessorKey: "name",
          header: ({ column }) => (
            <DataTableColumnHeader
              className="text-xs"
              column={column}
              title={"名称"}
            />
          ),
          cell: ({ row }) => (
            <div className="text-xs font-medium">
              {row.getValue<RepositoryStatus["name"]>("name")}
            </div>
          ),
          enableSorting: true,
          enableHiding: false,
        },
        {
          accessorKey: "origin",
          header: ({ column }) => (
            <DataTableColumnHeader
              className="text-xs"
              column={column}
              title={"来源"}
            />
          ),
          cell: ({ row }) => (
            <div className="text-xs font-mono text-muted-foreground">
              {row.getValue<RepositoryStatus["origin"]>("origin")}
            </div>
          ),
          enableSorting: true,
          enableHiding: false,
        },
        {
          accessorKey: "commit_sha",
          header: ({ column }) => (
            <DataTableColumnHeader
              className="text-xs"
              column={column}
              title={"版本"}
            />
          ),
          cell: ({ row }) => {
            const commitSha =
              row.getValue<RepositoryStatus["commit_sha"]>("commit_sha")
            return (
              <div className="text-xs">
                {commitSha ? (
                  <Badge variant="outline" className="font-mono">
                    {commitSha.substring(0, 7)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">尚未同步</span>
                )}
              </div>
            )
          },
          enableSorting: false,
          enableHiding: false,
        },
        {
          accessorKey: "last_synced_at",
          header: ({ column }) => (
            <DataTableColumnHeader
              className="text-xs"
              column={column}
              title={"上次同步"}
            />
          ),
          cell: ({ row }) => {
            const lastSynced =
              row.getValue<RepositoryStatus["last_synced_at"]>("last_synced_at")
            if (!lastSynced) {
              return <div className="text-xs text-muted-foreground">从未</div>
            }
            const date = new Date(lastSynced)
            const ago = getRelativeTime(date)
            return (
              <div className="text-xs text-muted-foreground">
                <span>{date.toLocaleDateString("zh-CN")}</span>
                <span className="ml-1">({ago})</span>
              </div>
            )
          },
          enableSorting: true,
          enableHiding: false,
        },
        {
          id: "actions",
          enableHiding: false,
          cell: ({ row }) => {
            const repo = row.original
            const isSyncing = syncingId === repo.id && syncPending

            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="size-8 p-0">
                    <span className="sr-only">打开菜单</span>
                    {isSyncing ? (
                      <ReloadIcon className="size-4 animate-spin" />
                    ) : (
                      <DotsHorizontalIcon className="size-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => navigator.clipboard.writeText(repo.id)}
                  >
                    复制 ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleSync(repo.id, false)}
                    disabled={isSyncing}
                  >
                    同步仓库
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSync(repo.id, true)}
                    disabled={isSyncing}
                  >
                    强制同步（删除现有内容）
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          },
        },
      ]}
      toolbarProps={defaultToolbarProps}
    />
  )
}

const defaultToolbarProps: DataTableToolbarProps<RepositoryStatus> = {
  filterProps: {
    placeholder: "筛选仓库…",
    column: "name",
  },
}
