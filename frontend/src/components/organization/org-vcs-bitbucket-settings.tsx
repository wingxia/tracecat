"use client"

import { useState } from "react"
import { BitbucketTokenSetup } from "@/components/organization/org-vcs-bitbucket"
import { BitbucketDataCenterTokenSetup } from "@/components/organization/org-vcs-bitbucket-data-center"
import { BitbucketIcon } from "@/components/organization/vcs-icons"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useBitbucketTokenCredentialsStatus } from "@/hooks/use-bitbucket-credentials"
import { useBitbucketDataCenterTokenCredentialsStatus } from "@/hooks/use-bitbucket-data-center-credentials"

/** Present one provider while keeping both deployment credentials manageable. */
export function BitbucketSettings() {
  const [open, setOpen] = useState(false)
  const cloud = useBitbucketTokenCredentialsStatus()
  const dataCenter = useBitbucketDataCenterTokenCredentialsStatus()
  const statuses = [cloud, dataCenter]
  const configured = statuses.some((s) => s.credentialsStatus?.exists)
  let statusLabel = "未连接"
  if (statuses.some((s) => s.credentialsStatusIsLoading)) {
    statusLabel = "正在加载连接…"
  } else if (statuses.some((s) => s.credentialsStatusError)) {
    statusLabel = "无法加载全部连接"
  } else if (statuses.some((s) => s.credentialsStatus?.is_corrupted)) {
    statusLabel = "有连接需要处理"
  } else if (configured) {
    statusLabel = "已连接"
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <BitbucketIcon className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Bitbucket</p>
            <p className="text-xs text-muted-foreground">{statusLabel}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant={configured ? "outline" : "default"}
          onClick={() => setOpen(true)}
        >
          {configured || statuses.some((s) => s.credentialsStatusError)
            ? "管理"
            : "连接"}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm" className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bitbucket 连接</DialogTitle>
            <DialogDescription>
              连接仓库使用的 Bitbucket 服务，两种服务可同时配置。
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {open && (
              <div className="space-y-4">
                <BitbucketTokenSetup />
                <BitbucketDataCenterTokenSetup />
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}
