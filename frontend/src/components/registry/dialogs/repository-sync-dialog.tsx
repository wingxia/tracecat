"use client"

import { RefreshCcw } from "lucide-react"
import type {
  GitCommitInfo,
  RegistryRepositoriesSyncRegistryRepositoryData,
  RegistryRepositoryReadMinimal,
  tracecat__registry__repositories__schemas__RegistrySyncResponse,
} from "@/client"
import { Spinner } from "@/components/loading/spinner"
import { shortCommitSha } from "@/components/registry/utils"
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
import { toast } from "@/components/ui/use-toast"
import { getRelativeTime } from "@/lib/event-history"

/** Props for {@link SyncRepositoryDialog}. */
export interface SyncRepositoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedRepo: RegistryRepositoryReadMinimal | null
  syncRepo: (
    params: RegistryRepositoriesSyncRegistryRepositoryData
  ) => Promise<tracecat__registry__repositories__schemas__RegistrySyncResponse>
  syncRepoIsPending: boolean
  /** Sync this commit instead of the remote HEAD. */
  targetCommit?: GitCommitInfo | null
  /** SHA of the current version, or null when nothing has been synced. */
  currentCommitSha: string | null
}

/** Confirmation dialog for syncing a registry repository from its remote. */
export function SyncRepositoryDialog({
  open,
  onOpenChange,
  selectedRepo,
  syncRepo,
  syncRepoIsPending,
  targetCommit,
  currentCommitSha,
}: SyncRepositoryDialogProps) {
  const shortSha = targetCommit ? shortCommitSha(targetCommit.sha) : null

  const handleSync = async () => {
    if (!selectedRepo) {
      console.error("No repository selected")
      return
    }

    try {
      toast({
        title: "正在同步仓库",
        description: (
          <span className="flex flex-col space-y-2">
            <span className="flex items-center space-x-2">
              <Spinner className="size-3" />
              <span>
                正在同步仓库{" "}
                <b className="inline-block">{selectedRepo.origin}</b>
              </span>
            </span>
          </span>
        ),
      })
      await syncRepo({
        repositoryId: selectedRepo.id,
        requestBody: targetCommit
          ? { target_commit_sha: targetCommit.sha }
          : undefined,
      })
      toast({
        title: "仓库同步成功",
        description: (
          <span className="flex flex-col space-y-2">
            <span>
              已成功重新加载动作，来源为{" "}
              <b className="inline-block">{selectedRepo.origin}</b>
            </span>
            {shortSha && <span className="text-xs">，提交为 {shortSha}</span>}
          </span>
        ),
      })
    } catch (error) {
      console.error("Error syncing repository", error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {shortSha ? `同步提交 ${shortSha}` : "同步仓库"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="flex flex-col space-y-3">
              <span>
                {targetCommit
                  ? "即将同步此提交对应的仓库内容。"
                  : "即将拉取仓库的最新版本。"}
              </span>
              <span className="max-w-full rounded-md border px-3 py-2 font-mono text-sm font-semibold tracking-tight text-foreground break-all whitespace-normal">
                {selectedRepo?.origin}
              </span>
              {targetCommit && (
                <span className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm">
                  <span className="text-foreground">
                    {targetCommit.message.split("\n")[0]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {targetCommit.author} ·{" "}
                    {getRelativeTime(new Date(targetCommit.date))}
                  </span>
                </span>
              )}
              {currentCommitSha && (
                <span className="flex flex-wrap items-start gap-2 text-sm text-muted-foreground">
                  <span>当前 SHA：</span>
                  <span className="rounded bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground break-all whitespace-normal">
                    {currentCommitSha}
                  </span>
                </span>
              )}
              {selectedRepo?.last_synced_at && (
                <span className="text-sm text-muted-foreground">
                  <span>上次同步： </span>
                  <span>
                    {new Date(selectedRepo.last_synced_at).toLocaleString(
                      "zh-CN"
                    )}
                  </span>
                </span>
              )}
              <span>
                {targetCommit
                  ? "确定要继续吗？此操作会使用该提交中的版本重新加载所有现有动作。"
                  : "确定要继续吗？此操作会使用远程仓库的最新版本重新加载所有现有动作。"}
              </span>
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={handleSync} disabled={syncRepoIsPending}>
            <div className="flex items-center space-x-2">
              <RefreshCcw
                className={`size-4 ${syncRepoIsPending ? "animate-spin" : ""}`}
              />
              <span>{syncRepoIsPending ? "同步中…" : "同步"}</span>
            </div>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
