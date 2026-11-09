"use client"

import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { getApiErrorDetail } from "@/lib/errors"
import { toastApiError, UUID_PATTERN } from "../managed-package-utils"
import { useManagedSource } from "../use-managed-package"

/** Shows the source workspace and lets an admin point it at another one. */
export function SourceSection() {
  const { source, isLoading, error, setSource, setSourcePending } =
    useManagedSource()
  const [workspaceId, setWorkspaceId] = useState("")
  const [inputError, setInputError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = workspaceId.trim()
    if (!UUID_PATTERN.test(value)) {
      setInputError("请输入工作空间 ID（UUID）。")
      return
    }
    setInputError(null)
    try {
      await setSource(value)
      setWorkspaceId("")
      toast({
        title: "已更新来源",
        description: "现在从此工作空间发布软件包。",
      })
    } catch (err) {
      toastApiError("设置源失败", err)
    }
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">来源</h3>
        <p className="text-sm text-muted-foreground">
          软件包的源工作空间及其发布目标 Git 仓库。
        </p>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">正在加载来源…</div>
      )}
      {!isLoading && error && (
        <div className="text-sm text-destructive">
          {getApiErrorDetail(error) ?? "加载来源失败。"}
        </div>
      )}
      {!isLoading && !error && !source && (
        <div className="text-sm text-muted-foreground">
          尚未配置源工作空间。
        </div>
      )}
      {source && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 rounded-md border p-4 text-sm">
          <dt className="text-muted-foreground">工作空间 ID</dt>
          <dd className="font-mono text-xs leading-5">{source.workspace_id}</dd>
          <dt className="text-muted-foreground">组织 ID</dt>
          <dd className="font-mono text-xs leading-5">
            {source.organization_id}
          </dd>
          <dt className="text-muted-foreground">仓库</dt>
          <dd className="break-all font-mono text-xs leading-5">
            {source.git_repo_url}
          </dd>
          <dt className="text-muted-foreground">提供商</dt>
          <dd>{source.git_provider}</dd>
        </dl>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="managed-source-workspace-id">
          {source ? "更改源工作空间" : "源工作空间"}
        </Label>
        <div className="flex items-start gap-2">
          <Input
            id="managed-source-workspace-id"
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
            placeholder={"工作空间 ID"}
            className="max-w-md font-mono text-xs"
          />
          <Button
            type="submit"
            size="sm"
            className="h-9"
            disabled={setSourcePending || workspaceId.trim() === ""}
          >
            {setSourcePending ? "保存中…" : "保存"}
          </Button>
        </div>
        {inputError && <p className="text-xs text-destructive">{inputError}</p>}
        <p className="text-xs text-muted-foreground">
          工作空间必须已配置用于同步的 Git 仓库。
        </p>
      </form>
    </section>
  )
}
