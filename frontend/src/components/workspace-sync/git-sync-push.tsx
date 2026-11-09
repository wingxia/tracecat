"use client"

import {
  ArrowUpIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  GitPullRequestIcon,
  Loader2Icon,
} from "lucide-react"
import { useEffect, useState } from "react"
import type { GitBranchInfo, PullResourceDiff, VcsProvider } from "@/client"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ToastAction } from "@/components/ui/toast"
import { toast } from "@/components/ui/use-toast"
import {
  useWorkspaceSyncBranchTarget,
  writeLastPushBranch,
} from "@/components/workspace-sync/branch-target-selector"
import { ExportErrorMessage } from "@/components/workspace-sync/export-error"
import { GitSyncActionBar } from "@/components/workspace-sync/git-sync-action-bar"
import { GitSyncBranchPicker } from "@/components/workspace-sync/git-sync-branch-picker"
import {
  formatChangeCounts,
  GitSyncChangeList,
  GitSyncNotice,
  GitSyncPreviewButton,
  GitSyncPreviewEmpty,
} from "@/components/workspace-sync/git-sync-change-list"
import {
  PackageSummary,
  usePackageSelection,
} from "@/components/workspace-sync/package-picker"
import { PackagePublishSummary } from "@/components/workspace-sync/package-publish-overview"
import {
  getReviewRequestAbbreviation,
  getReviewRequestLabel,
  getWorkspaceSyncPushOutcome,
  type WorkspaceSyncPushMode,
} from "@/components/workspace-sync/push-target-policy"
import {
  useWorkspacePackage,
  WORKSPACE_SYNC_PACKAGE_QUERY_KEY,
} from "@/components/workspace-sync/use-workspace-package"
import { WorkspacePushExplanation } from "@/components/workspace-sync/workspace-push-explanation"
import { SyncOperationWaitCancelled } from "@/hooks/use-sync-operation"
import {
  useWorkspaceSyncExport,
  useWorkspaceSyncExportPreview,
} from "@/hooks/use-workspace-sync"
import { useQueryClient } from "@/lib/query"

interface GitSyncPushTabProps {
  workspaceId: string
  persistedGitUrl: string
  provider: VcsProvider
  repoBranches: GitBranchInfo[] | undefined
  baseBranch: string | undefined
  branchesIsLoading: boolean
  branchesError: unknown
  /** Changes when a pull lands, since the preview no longer matches. */
  syncRevision: number
}

/**
 * Push composer: the workspace goes into a branch, optionally opening a pull
 * request. The preview lists what is included so it can be skimmed.
 */
export function GitSyncPushTab({
  workspaceId,
  persistedGitUrl,
  provider,
  repoBranches,
  baseBranch,
  branchesIsLoading,
  branchesError,
  syncRevision,
}: GitSyncPushTabProps) {
  const { exportWorkspace, exportWorkspaceIsPending } =
    useWorkspaceSyncExport(workspaceId)
  const queryClient = useQueryClient()

  const [message, setMessage] = useState("导出工作空间配置")
  const [mode, setMode] = useState<WorkspaceSyncPushMode>("pull-request")
  const [previewRequested, setPreviewRequested] = useState(false)

  // Scoped to the repository so a reconnect never restores another repo's branch.
  const rememberScope = `${workspaceId}:${persistedGitUrl}`
  const { branch, isCreatingBranch, selectBranch, createBranch } =
    useWorkspaceSyncBranchTarget({
      branches: repoBranches,
      newBranchPrefix: "sync/workspace",
      rememberScope,
    })

  const targetBranch = branch.trim()
  // A new branch does not exist yet, so compare against the base branch.
  const compareRef = isCreatingBranch ? baseBranch : targetBranch || undefined
  // The managed resources source pushes its package. Its include file is read
  // from the same ref the push compares against.
  const {
    workspacePackage,
    isSource,
    workspacePackageIsFetching,
    workspacePackageError,
  } = useWorkspacePackage(workspaceId, {
    ref: compareRef,
    enabled: Boolean(compareRef),
  })
  const sourcePackage = isSource ? workspacePackage : undefined
  const {
    selected: packageSelection,
    setSelected: setPackageSelection,
    isChanged: packageIsChanged,
    packageInclude,
  } = usePackageSelection(sourcePackage)
  const packageIncludeKey = JSON.stringify(packageInclude)
  const outcome = getWorkspaceSyncPushOutcome({
    mode,
    targetBranch,
    defaultBranch: baseBranch,
    isCreatingBranch,
  })
  const {
    preview,
    previewOperationId,
    previewDiffCount,
    previewIsLoading,
    previewError,
    refetchPreview,
  } = useWorkspaceSyncExportPreview(workspaceId, {
    push: {
      message,
      branch: targetBranch,
      create_pr: outcome.createPr,
      pr_base_branch: baseBranch,
      include_schedules: false,
      // `null` keeps the include file already on the branch.
      ...(isSource ? { package_include: packageInclude } : {}),
    },
    compareRef,
    provider,
  })
  // Direct pushes to the sync base or repository default are off.
  const blockedBranch = getBlockedPushBranch({
    targetBranch,
    baseBranch,
    branches: repoBranches,
  })
  const isBlocked = blockedBranch !== undefined
  const reviewRequest = getReviewRequestLabel(provider)
  const reviewRequestShort = getReviewRequestAbbreviation(provider)
  const visiblePreview = previewRequested ? preview : undefined
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Pushes to the repository default are blocked by name, so stay off until
  // the branch list says which branch that is.
  const defaultKnown = repoBranches?.some((candidate) => candidate.is_default)
  const pushDisabled =
    !previewOperationId ||
    !previewRequested ||
    previewIsLoading ||
    // Wait for background package refetches so the push uses fresh data.
    workspacePackageIsFetching ||
    exportWorkspaceIsPending ||
    branchesIsLoading ||
    !baseBranch ||
    !defaultKnown ||
    isBlocked ||
    targetBranch === "" ||
    message.trim() === ""

  function resetPreview() {
    setPreviewRequested(false)
  }
  useEffect(() => {
    resetPreview()
  }, [
    compareRef,
    persistedGitUrl,
    provider,
    syncRevision,
    targetBranch,
    mode,
    message,
    packageIncludeKey,
  ])
  function handlePreview() {
    if (
      !compareRef ||
      workspacePackageIsFetching ||
      targetBranch === "" ||
      message.trim() === ""
    )
      return
    setPreviewRequested(true)
    refetchPreview()
  }

  async function handlePush() {
    try {
      if (pushDisabled || !previewOperationId) return
      const result = await exportWorkspace({ operationId: previewOperationId })
      writeLastPushBranch(rememberScope, targetBranch)
      // The new branch now exists, so later previews compare against it.
      if (isCreatingBranch) {
        selectBranch(targetBranch)
      }
      // The push changed the remote: drop the old preview and refetch the
      // branches and commits so a new branch is listed and can be restored.
      resetPreview()
      for (const key of [
        "workflow-sync-branches",
        "repository_commits",
        "workspace-sync-export-preview",
        WORKSPACE_SYNC_PACKAGE_QUERY_KEY,
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key, workspaceId] })
      }
      const prUrl = result.commit.pr_url
      toast({
        title: getPushToastTitle({
          isPackage: Boolean(sourcePackage),
          hasPr: Boolean(prUrl),
          targetBranch,
          reviewRequestShort,
        }),
        description: sourcePackage
          ? "客户工作空间尚未更改。合并后，请在“管理后台 › 托管工作空间”中创建发布版本并部署。"
          : (result.commit.message ?? result.commit.sha ?? undefined),
        action: prUrl ? (
          <ToastAction
            asChild
            altText={`打开${reviewRequest}`}
            className="gap-1.5"
          >
            <a href={prUrl} target="_blank" rel="noopener noreferrer">
              查看 {reviewRequestShort}
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </ToastAction>
        ) : undefined,
      })
    } catch (error) {
      if (error instanceof SyncOperationWaitCancelled) return
      toast({
        title: "推送失败",
        description: (
          <ExportErrorMessage error={error} workspaceId={workspaceId} />
        ),
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="px-4 py-3">
          {sourcePackage ? (
            <PackageSummary
              workspacePackage={sourcePackage}
              selected={packageSelection}
              isChanged={packageIsChanged}
              disabled={exportWorkspaceIsPending}
              onApply={setPackageSelection}
            />
          ) : (
            <WorkspacePushExplanation />
          )}
        </div>
        {workspacePackageError && (
          <GitSyncNotice tone="error">
            无法读取托管资源包：{" "}
            <ExportErrorMessage
              announce={false}
              error={workspacePackageError}
              workspaceId={workspaceId}
            />
          </GitSyncNotice>
        )}
        {sourcePackage?.warnings?.map((warning) => (
          <GitSyncNotice key={warning} tone="warning">
            {warning}
          </GitSyncNotice>
        ))}
        {isBlocked && (
          <GitSyncNotice tone="warning">
            直接推送到 {blockedBranch} 已禁用。请选择或创建其他分支。
          </GitSyncNotice>
        )}
        {previewError && (
          <GitSyncNotice tone="error">
            无法预览此次推送：{" "}
            <ExportErrorMessage
              announce={false}
              error={previewError}
              workspaceId={workspaceId}
            />
          </GitSyncNotice>
        )}
        {visiblePreview && sourcePackage && (
          <PackagePublishSummary
            diffs={visiblePreview.resource_diffs ?? []}
            compareRef={compareRef}
          />
        )}
        {visiblePreview ? (
          <GitSyncChangeList
            workspaceId={workspaceId}
            operationId={previewOperationId}
            diffCount={previewDiffCount}
            direction="push"
            summary={
              visiblePreview.resource_diffs?.length
                ? getPushPreviewSummary(
                    visiblePreview.resource_diffs,
                    compareRef
                  )
                : `与 ${compareRef ?? "此分支"} 相比有 ${previewDiffCount} 项更改`
            }
            resources={visiblePreview.resources ?? []}
            diffs={visiblePreview.resource_diffs ?? []}
            fileCount={visiblePreview.files.length}
          />
        ) : (
          <GitSyncPreviewEmpty
            description={
              sourcePackage
                ? `预览软件包相对于 ${compareRef ?? "此分支"} 的新增和移除内容。`
                : `预览此次推送相对于 ${compareRef ?? "此分支"} 包含的变更。`
            }
            isLoading={previewIsLoading}
            disabled={!compareRef || workspacePackageIsFetching}
            onPreview={() => void handlePreview()}
          />
        )}
      </div>

      <GitSyncActionBar label={"推送操作"}>
        <span className="text-xs text-muted-foreground">目标</span>
        <GitSyncBranchPicker
          branches={repoBranches}
          branch={targetBranch}
          isCreatingBranch={isCreatingBranch}
          baseBranch={baseBranch}
          isLoading={branchesIsLoading}
          hasError={Boolean(branchesError)}
          disabled={exportWorkspaceIsPending}
          placement="footer"
          className="w-80 shrink-0"
          onCreateBranch={createBranch}
          onSelectBranch={selectBranch}
        />
        <Input
          aria-label={"提交说明"}
          placeholder={"提交说明"}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="h-8 min-w-48 flex-1"
        />
        {visiblePreview && (
          <GitSyncPreviewButton
            hasPreview
            isLoading={previewIsLoading}
            disabled={!compareRef || workspacePackageIsFetching}
            onPreview={() => void handlePreview()}
          />
        )}
        <PushSplitButton
          label={getPushButtonLabel({
            isPackage: Boolean(sourcePackage),
            isBlocked,
            isPending: exportWorkspaceIsPending,
            createPr: outcome.createPr,
            targetBranch,
            reviewRequestShort,
          })}
          mode={mode}
          onModeChange={setMode}
          isPending={exportWorkspaceIsPending}
          disabled={pushDisabled}
          menuDisabled={isBlocked || exportWorkspaceIsPending}
          reviewRequest={reviewRequest}
          reviewRequestShort={reviewRequestShort}
          onPush={() => setConfirmOpen(true)}
        />
      </GitSyncActionBar>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定吗？</AlertDialogTitle>
            <AlertDialogDescription>
              {getPushConfirmation({
                isPackage: Boolean(sourcePackage),
                createPr: outcome.createPr,
                fileCount: previewDiffCount,
                targetBranch,
                baseBranch,
                reviewRequest,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={pushDisabled}
              onClick={() => void handlePush()}
            >
              {getPushButtonLabel({
                isPackage: Boolean(sourcePackage),
                isBlocked,
                isPending: false,
                createPr: outcome.createPr,
                targetBranch,
                reviewRequestShort,
              })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Primary push action with a chevron menu to choose between opening a pull
 * request and pushing only.
 */
function PushSplitButton({
  label,
  mode,
  onModeChange,
  isPending,
  disabled,
  menuDisabled,
  reviewRequest,
  reviewRequestShort,
  onPush,
}: {
  label: string
  mode: WorkspaceSyncPushMode
  onModeChange: (mode: WorkspaceSyncPushMode) => void
  isPending: boolean
  disabled: boolean
  menuDisabled: boolean
  reviewRequest: string
  reviewRequestShort: string
  onPush: () => void
}) {
  return (
    <div className="flex">
      <Button
        type="button"
        size="sm"
        onClick={onPush}
        disabled={disabled}
        className="shrink-0 gap-1.5 rounded-r-none"
      >
        <PushButtonIcon
          isPending={isPending}
          createPr={mode === "pull-request"}
        />
        {label}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            aria-label={"推送选项"}
            disabled={menuDisabled}
            className="rounded-l-none border-l border-primary-foreground/30 px-2"
          >
            <ChevronDownIcon className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-72">
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={(value) =>
              onModeChange(value as WorkspaceSyncPushMode)
            }
          >
            <DropdownMenuRadioItem value="pull-request" className="items-start">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">
                  推送并打开 {reviewRequestShort}
                </span>
                <span className="text-xs text-muted-foreground">
                  审核与合并将在此处进行： {reviewRequest}
                </span>
              </span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="direct" className="items-start">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">仅推送</span>
                <span className="text-xs text-muted-foreground">
                  提交到分支，不创建 {reviewRequest}
                </span>
              </span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function PushButtonIcon({
  isPending,
  createPr,
}: {
  isPending: boolean
  createPr: boolean
}) {
  if (isPending) {
    return <Loader2Icon className="size-4 animate-spin" />
  }
  if (createPr) {
    return <GitPullRequestIcon className="size-4" />
  }
  return <ArrowUpIcon className="size-4" />
}

function getBlockedPushBranch({
  targetBranch,
  baseBranch,
  branches,
}: {
  targetBranch: string
  baseBranch: string | undefined
  branches: GitBranchInfo[] | undefined
}): string | undefined {
  if (!targetBranch) {
    return undefined
  }
  if (targetBranch === baseBranch) {
    return baseBranch
  }
  const isRepositoryDefault = branches?.some(
    (candidate) => candidate.is_default && candidate.name === targetBranch
  )
  return isRepositoryDefault ? targetBranch : undefined
}

function getPushButtonLabel({
  isPackage,
  isBlocked,
  isPending,
  createPr,
  targetBranch,
  reviewRequestShort,
}: {
  isPackage: boolean
  isBlocked: boolean
  isPending: boolean
  createPr: boolean
  targetBranch: string
  reviewRequestShort: string
}): string {
  if (isPending) {
    return isPackage ? "发布中…" : "推送中…"
  }
  if (isBlocked) {
    return "选择其他分支"
  }
  // Keep the label stable; the preview above already shows what changes.
  const push = isPackage ? "发布软件包" : "推送"
  if (createPr) {
    return `${push}并创建 ${reviewRequestShort}`
  }
  return `${push}到 ${targetBranch}`
}

function getPushConfirmation({
  isPackage,
  createPr,
  fileCount,
  targetBranch,
  baseBranch,
  reviewRequest,
}: {
  isPackage: boolean
  createPr: boolean
  fileCount: number
  targetBranch: string
  baseBranch: string | undefined
  reviewRequest: string
}): string {
  const files = `${fileCount} 个已更改文件`
  const subject = isPackage ? `软件包（${files}）` : files
  const commit = `此操作会将${subject}提交到 ${targetBranch}`
  if (createPr) {
    return `${commit}，并创建合并到 ${baseBranch ?? "基础分支"} 的${reviewRequest}。`
  }
  return `${commit}，不创建${reviewRequest}。`
}

function getPushToastTitle({
  isPackage,
  hasPr,
  targetBranch,
  reviewRequestShort,
}: {
  isPackage: boolean
  hasPr: boolean
  targetBranch: string
  reviewRequestShort: string
}): string {
  if (isPackage && hasPr) {
    return `软件包 ${reviewRequestShort} 已就绪`
  }
  if (isPackage) {
    return `软件包已发布到 ${targetBranch}`
  }
  if (hasPr) {
    return `${reviewRequestShort} 已就绪`
  }
  return `已推送到 ${targetBranch}`
}

function getPushPreviewSummary(
  diffs: PullResourceDiff[],
  compareRef: string | undefined
): string {
  const ref = compareRef ?? "此分支"
  const counts = formatChangeCounts(diffs)
  return counts ? `与 ${ref} 相比，${counts}` : `与 ${ref} 相比没有更改`
}
