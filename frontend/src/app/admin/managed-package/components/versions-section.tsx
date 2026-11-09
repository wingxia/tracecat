"use client"

import { PlusIcon } from "lucide-react"
import { type FormEvent, useState } from "react"
import type {
  GitTagInfo,
  ManagedReleaseCandidateRead,
  ManagedTargetRead,
} from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { getApiErrorDetail } from "@/lib/errors"
import { formatTimestamp, RELEASE_TAG_PATTERN } from "../managed-package-utils"
import { useCutRelease, useReleaseCandidate } from "../use-managed-package"

const CUT_RELEASE_FORM_ID = "managed-package-cut-release-form"

/** Props for {@link VersionsSection}. */
export interface VersionsSectionProps {
  tags: GitTagInfo[]
  targets: ManagedTargetRead[]
  isLoading: boolean
  error: unknown
  hasSource: boolean
}

/** Lists release tags with how many targets pin each, and cuts new ones. */
export function VersionsSection({
  tags,
  targets,
  isLoading,
  error,
  hasSource,
}: VersionsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const pinnedCounts = new Map<string, number>()
  for (const target of targets) {
    pinnedCounts.set(
      target.pinned_tag,
      (pinnedCounts.get(target.pinned_tag) ?? 0) + 1
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">版本</h3>
          <p className="text-sm text-muted-foreground">
            源仓库中的发布标签，按时间从新到旧排列。
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialogOpen(true)}
          disabled={!hasSource}
        >
          <PlusIcon className="mr-1 size-3" />
          创建发布版本
        </Button>
      </div>

      <VersionsTable
        tags={tags}
        pinnedCounts={pinnedCounts}
        isLoading={isLoading}
        error={error}
        hasSource={hasSource}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="md">
          {dialogOpen && (
            <CutReleaseForm
              latestTag={tags[0]?.name ?? null}
              onDone={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function VersionsTable({
  tags,
  pinnedCounts,
  isLoading,
  error,
  hasSource,
}: {
  tags: GitTagInfo[]
  pinnedCounts: Map<string, number>
  isLoading: boolean
  error: unknown
  hasSource: boolean
}) {
  if (!hasSource) {
    return (
      <div className="text-sm text-muted-foreground">
        配置来源后即可查看版本。
      </div>
    )
  }
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">正在加载标签…</div>
  }
  if (error) {
    return (
      <div className="text-sm text-destructive">
        {getApiErrorDetail(error) ?? "加载标签失败。"}
      </div>
    )
  }
  if (tags.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        暂无标签，请创建首个发布版本。
      </div>
    )
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">标签</TableHead>
            <TableHead className="text-xs">提交</TableHead>
            <TableHead className="text-xs">日期</TableHead>
            <TableHead className="text-right text-xs">
              固定到此版本的目标
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tags.map((tag) => (
            <TableRow key={tag.name}>
              <TableCell className="font-mono text-xs">{tag.name}</TableCell>
              <TableCell>
                <code className="text-xs text-muted-foreground">
                  {tag.commit_sha.substring(0, 7)}
                </code>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatTimestamp(tag.date)}
              </TableCell>
              <TableCell className="text-right text-xs">
                {pinnedCounts.get(tag.name) ?? 0}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CutReleaseForm({
  latestTag,
  onDone,
}: {
  latestTag: string | null
  onDone: () => void
}) {
  const [tag, setTag] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const cutRelease = useCutRelease()
  const { candidate, isLoading: candidateIsLoading } = useReleaseCandidate({
    enabled: true,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = tag.trim()
    if (!RELEASE_TAG_PATTERN.test(value)) {
      setFormError("请使用 vX.Y.Z 格式，例如 v1.4.0。")
      return
    }
    // A release needs a published package to deploy.
    if (!candidate?.package) {
      return
    }
    setFormError(null)
    try {
      // Bind the tag to the commit shown above, not whatever HEAD is now.
      const created = await cutRelease.mutateAsync({
        tag: value,
        commitSha: candidate.commit_sha,
      })
      toast({
        title: "已创建发布版本",
        description: `已在 ${created.commit_sha.substring(0, 7)} 上创建标签 ${created.name}。`,
      })
      onDone()
    } catch (err) {
      setFormError(getApiErrorDetail(err) ?? "创建发布版本失败。")
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>创建发布版本</DialogTitle>
        <DialogDescription>
          为源仓库基准分支的最新提交打标签。部署标签后才会更新客户工作空间。
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <ReleaseCandidateSummary
          candidate={candidate}
          isLoading={candidateIsLoading}
        />
        <form
          id={CUT_RELEASE_FORM_ID}
          onSubmit={handleSubmit}
          className="space-y-2"
        >
          <Label htmlFor="managed-release-tag">标签名称</Label>
          <Input
            id="managed-release-tag"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="v1.0.0"
            className="font-mono text-xs"
            autoFocus
          />
          {latestTag && (
            <p className="text-xs text-muted-foreground">
              最新标签： <span className="font-mono">{latestTag}</span>
            </p>
          )}
          {formError && (
            <p className="whitespace-pre-wrap text-xs text-destructive">
              {formError}
            </p>
          )}
        </form>
      </DialogBody>
      <DialogFooter>
        <Button
          size="sm"
          type="submit"
          form={CUT_RELEASE_FORM_ID}
          disabled={
            cutRelease.isPending || tag.trim() === "" || !candidate?.package
          }
        >
          {cutRelease.isPending ? "正在创建标签…" : "创建发布版本"}
        </Button>
      </DialogFooter>
    </>
  )
}

/**
 * Shows exactly what a release would tag: the base branch commit and the
 * package published in it.
 */
function ReleaseCandidateSummary({
  candidate,
  isLoading,
}: {
  candidate: ManagedReleaseCandidateRead | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return <p className="mb-4 text-xs text-muted-foreground">正在读取源仓库…</p>
  }
  if (!candidate) {
    return (
      <p className="mb-4 text-xs text-destructive">
        无法读取源仓库的基准分支。
      </p>
    )
  }
  const pkg = candidate.package
  const existingTags = candidate.existing_tags ?? []
  const explicit = pkg?.explicit ?? []
  const implied = pkg?.implied ?? []
  const registry = pkg?.registry ?? []
  return (
    <div className="mb-4 space-y-2 rounded-md border px-3 py-2 text-xs">
      <p>
        <span className="text-muted-foreground">提交 </span>
        <code>{candidate.commit_sha.substring(0, 7)}</code>
        <span className="text-muted-foreground"> 于 </span>
        <span className="font-medium">{candidate.branch}</span>
        <span className="text-muted-foreground">
          {" "}
          由 {candidate.commit_author}, {formatTimestamp(candidate.commit_date)}
        </span>
      </p>
      <p className="text-muted-foreground">{candidate.commit_message}</p>
      {existingTags.length > 0 && (
        <p className="text-amber-700 dark:text-amber-400">
          此提交已发布为 {existingTags.join(", ")}。新标签将发布相同的软件包。
        </p>
      )}
      {pkg ? (
        <div className="space-y-1">
          <p>
            软件包： {explicit.length} 个已选择， {implied.length}{" "}
            个作为依赖包含
            {registry.length > 0 && `，${registry.length} 个自定义注册表仓库`}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {explicit.map((entry) => (
              <li
                key={`${entry.resource_type}:${entry.source_id}`}
                className="rounded border px-1.5 py-0.5 font-mono"
              >
                {entry.resource_type}/{entry.source_id}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-destructive">
          此提交尚未发布软件包。请先从源工作空间的 Git 同步页面发布。
        </p>
      )}
    </div>
  )
}
