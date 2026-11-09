"use client"

import { RefreshCwIcon } from "lucide-react"
import { PlatformRegistryReposTable } from "@/components/admin/platform-registry-repos-table"
import { PlatformRegistryStatus } from "@/components/admin/platform-registry-status"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { useAdminRegistryStatus, useAdminRegistrySync } from "@/hooks/use-admin"

export default function AdminRegistryPage() {
  const { status, isLoading, refetch } = useAdminRegistryStatus()
  const { syncAllRepositories, syncAllPending } = useAdminRegistrySync()

  const handleSyncAll = async () => {
    try {
      await syncAllRepositories(false)
      toast({
        title: "同步完成",
        description: "所有仓库已成功同步。",
      })
      refetch()
    } catch (error) {
      console.error("Failed to sync repositories", error)
      toast({
        title: "同步失败",
        description: "同步仓库失败，请重试。",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <h2 className="text-2xl font-semibold tracking-tight">仓库</h2>
            <p className="text-base text-muted-foreground">
              平台注册表仓库及其同步状态。
            </p>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            <Button size="sm" onClick={handleSyncAll} disabled={syncAllPending}>
              <RefreshCwIcon
                className={`mr-2 size-4 ${syncAllPending ? "animate-spin" : ""}`}
              />
              {syncAllPending ? "同步中…" : "全部同步"}
            </Button>
          </div>
        </div>

        <PlatformRegistryStatus status={status} isLoading={isLoading} />
        <PlatformRegistryReposTable />
      </div>
    </div>
  )
}
