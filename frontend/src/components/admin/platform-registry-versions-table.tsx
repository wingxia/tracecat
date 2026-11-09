"use client"

import type { Row } from "@tanstack/react-table"
import { CheckIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"
import { useCallback, useState } from "react"
import type { tracecat__admin__registry__schemas__RegistryVersionRead } from "@/client"
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableToolbarProps,
} from "@/components/data-table"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import {
  useAdminRegistryStatus,
  useAdminRegistrySync,
  useAdminRegistryVersions,
} from "@/hooks/use-admin"
import { getRelativeTime } from "@/lib/event-history"

type RegistryVersionRead =
  tracecat__admin__registry__schemas__RegistryVersionRead

export function PlatformRegistryVersionsTable() {
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [versionPendingDelete, setVersionPendingDelete] =
    useState<RegistryVersionRead | null>(null)
  const [selectedVersions, setSelectedVersions] = useState<
    RegistryVersionRead[]
  >([])
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState(0)
  const { versions, isLoading } = useAdminRegistryVersions()
  const { status } = useAdminRegistryStatus()
  const {
    promoteVersion,
    promotePending,
    deleteVersion,
    deletePending,
    backfillArtifacts,
    backfillArtifactsPending,
  } = useAdminRegistrySync()

  const handleSelectionChange = useCallback(
    (rows: Row<RegistryVersionRead>[]) => {
      const nextVersions = rows.map((row) => row.original)
      setSelectedVersions((currentVersions) => {
        if (
          currentVersions.length === nextVersions.length &&
          currentVersions.every(
            (version, index) => version.id === nextVersions[index]?.id
          )
        ) {
          return currentVersions
        }
        return nextVersions
      })
    },
    []
  )

  const handlePromote = async (version: RegistryVersionRead) => {
    setPromotingId(version.id)
    try {
      await promoteVersion({
        repositoryId: version.repository_id,
        versionId: version.id,
      })
      toast({
        title: "已提升版本",
        description: `版本 ${version.version} 已设为当前版本。`,
      })
    } catch (error) {
      console.error("Failed to promote version", error)
      toast({
        title: "提升版本失败",
        description: "请重试。",
        variant: "destructive",
      })
    } finally {
      setPromotingId(null)
    }
  }

  const handleBackfillSelected = async () => {
    if (selectedVersions.length === 0) return

    try {
      const result = await backfillArtifacts({
        version_ids: selectedVersions.map((version) => version.id),
      })
      toast({
        title: "已启动构建产物回填",
        description: `工作流 ${result.workflow_id} 已将 ${result.requested_count} 个版本${result.requested_count === 1 ? "" : ""}加入队列。`,
      })
      setSelectedVersions([])
      setClearSelectionTrigger((value) => value + 1)
    } catch (error) {
      console.error("Failed to start artifact backfill", error)
      toast({
        title: "启动构建产物回填失败",
        description: "请重试。",
        variant: "destructive",
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!versionPendingDelete) return

    setDeletingId(versionPendingDelete.id)
    try {
      await deleteVersion({
        repositoryId: versionPendingDelete.repository_id,
        versionId: versionPendingDelete.id,
      })
      toast({
        title: "已删除版本",
        description: `已移除版本 ${versionPendingDelete.version}。`,
      })
      setSelectedVersions((versions) =>
        versions.filter((version) => version.id !== versionPendingDelete.id)
      )
      setClearSelectionTrigger((value) => value + 1)
      setVersionPendingDelete(null)
    } catch (error) {
      console.error("Failed to delete version", error)
      toast({
        title: "删除版本失败",
        description: "只能删除未被工作流使用的非当前版本。",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const selectedMissingCount = selectedVersions.filter(
    (version) => !(version.artifacts_ready ?? false)
  ).length

  if (isLoading) {
    return <div className="text-muted-foreground">正在加载版本…</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {selectedVersions.length > 0
            ? `已选择 ${selectedVersions.length} 个，其中 ${selectedMissingCount} 个缺少构建产物`
            : "未选择版本"}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBackfillSelected}
          disabled={selectedVersions.length === 0 || backfillArtifactsPending}
        >
          <RefreshCwIcon className="mr-1 size-3" />
          {backfillArtifactsPending ? "启动中…" : "回填构建产物"}
        </Button>
      </div>
      <DataTable
        data={versions ?? []}
        getRowId={(version) => version.id}
        initialSortingState={[{ id: "created_at", desc: true }]}
        columns={[
          {
            id: "select",
            header: ({ table }) => (
              <Checkbox
                aria-label={"选择可见版本"}
                checked={
                  table.getIsAllPageRowsSelected()
                    ? true
                    : table.getIsSomePageRowsSelected()
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={(value) =>
                  table.toggleAllPageRowsSelected(!!value)
                }
              />
            ),
            cell: ({ row }) => (
              <Checkbox
                aria-label={`选择版本 ${row.original.version}`}
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                onClick={(event) => event.stopPropagation()}
              />
            ),
            enableSorting: false,
            enableHiding: false,
          },
          {
            accessorKey: "version",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"版本"}
              />
            ),
            cell: ({ row }) => {
              const version = row.original
              return (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono">{version.version}</span>
                  {(version.is_current ?? false) && (
                    <span className="flex items-center">
                      <span className="sr-only">当前</span>
                      <span
                        aria-hidden="true"
                        className="flex size-1.5 rounded-full bg-[hsl(var(--success)/0.55)]"
                      />
                    </span>
                  )}
                </div>
              )
            },
            enableSorting: true,
            enableHiding: false,
          },
          {
            accessorKey: "repository_id",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"仓库"}
              />
            ),
            cell: ({ row }) => {
              const repoId = row.getValue<string>("repository_id")
              const repo = status?.repositories?.find((r) => r.id === repoId)
              return (
                <div className="text-xs text-muted-foreground">
                  {repo?.name ?? repoId.substring(0, 8)}
                </div>
              )
            },
            enableSorting: true,
            enableHiding: false,
          },
          {
            accessorKey: "commit_sha",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"提交"}
              />
            ),
            cell: ({ row }) => (
              <code className="text-xs text-muted-foreground">
                {row.getValue<string | null>("commit_sha")?.substring(0, 7) ??
                  "-"}
              </code>
            ),
            enableSorting: false,
            enableHiding: true,
          },
          {
            accessorKey: "artifacts_ready",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"构建产物"}
              />
            ),
            cell: ({ row }) => {
              const version = row.original
              return (
                <Badge
                  variant={
                    (version.artifacts_ready ?? false) ? "secondary" : "outline"
                  }
                  className="font-normal"
                >
                  {(version.artifacts_ready ?? false) ? "就绪" : "缺失"}
                </Badge>
              )
            },
            enableSorting: true,
            enableHiding: false,
          },
          {
            accessorKey: "in_use",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"使用情况"}
              />
            ),
            cell: ({ row }) => {
              const version = row.original
              return (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      (version.in_use ?? false) ? "secondary" : "outline"
                    }
                    className="font-normal"
                  >
                    {(version.in_use ?? false) ? "使用中" : "未使用"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {version.workflow_definition_count ?? 0} 定义
                  </span>
                </div>
              )
            },
            enableSorting: true,
            enableHiding: false,
          },
          {
            accessorKey: "created_at",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"创建时间"}
              />
            ),
            cell: ({ row }) => {
              const createdAt = row.getValue<string>("created_at")
              const date = new Date(createdAt)
              return (
                <div className="text-xs text-muted-foreground">
                  {getRelativeTime(date)}
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
              const version = row.original
              const isPromoting = promotingId === version.id && promotePending
              const isDeleting = deletingId === version.id && deletePending
              const canDelete =
                !(version.is_current ?? false) && !(version.in_use ?? false)

              if (version.is_current ?? false) return null

              return (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePromote(version)}
                    disabled={isPromoting || isDeleting}
                  >
                    {isPromoting ? (
                      "提升中…"
                    ) : (
                      <>
                        <CheckIcon className="mr-1 size-3" />
                        提升
                      </>
                    )}
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVersionPendingDelete(version)}
                      disabled={isDeleting || isPromoting}
                      className="text-destructive hover:text-destructive"
                    >
                      {isDeleting ? (
                        "删除中…"
                      ) : (
                        <>
                          <Trash2Icon className="mr-1 size-3" />
                          删除
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )
            },
          },
        ]}
        toolbarProps={defaultToolbarProps}
        showSelectedRows
        onSelectionChange={handleSelectionChange}
        clearSelectionTrigger={clearSelectionTrigger}
      />
      <AlertDialog
        open={versionPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setVersionPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除注册表版本？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久移除版本 {versionPendingDelete?.version}
              。只能删除未被工作流使用的非当前版本。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const defaultToolbarProps: DataTableToolbarProps<RegistryVersionRead> = {
  filterProps: {
    placeholder: "筛选版本…",
    column: "version",
  },
}
