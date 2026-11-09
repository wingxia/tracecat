"use client"

import { useEffect, useState } from "react"
import type { TierRead } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  useAdminOrganization,
  useAdminOrgTier,
  useAdminTiers,
} from "@/hooks/use-admin"

interface AdminOrgTierDialogProps {
  orgId: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AdminOrgTierDialog({
  orgId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: AdminOrgTierDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const dialogOpen = isControlled ? controlledOpen : internalOpen
  const setDialogOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const { organization } = useAdminOrganization(orgId)
  const { orgTier, isLoading, updateOrgTier, updatePending } =
    useAdminOrgTier(orgId)
  const { tiers } = useAdminTiers()

  useEffect(() => {
    if (dialogOpen) {
      setSelectedTierId(orgTier?.tier_id ?? null)
    }
  }, [dialogOpen, orgTier?.tier_id])

  const handleAssign = async () => {
    try {
      await updateOrgTier({ tier_id: selectedTierId })
      toast({
        title: "已分配套餐",
        description: "已更新组织套餐。",
      })
      setDialogOpen(false)
    } catch (error) {
      console.error("Failed to assign tier", error)
      toast({
        title: "分配套餐失败",
        description: "请重试。",
        variant: "destructive",
      })
    }
  }

  const currentTier = orgTier?.tier
  const hasOverrides =
    orgTier?.max_concurrent_workflows != null ||
    orgTier?.max_action_executions_per_workflow != null ||
    orgTier?.max_concurrent_actions != null ||
    orgTier?.api_rate_limit != null

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="md" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>套餐分配</DialogTitle>
          <DialogDescription>
            管理套餐分配，所属组织： {organization?.name ?? "组织"}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              加载中…
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium">当前套餐</h4>
                </div>
                {currentTier ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {currentTier.display_name}
                    </span>
                    {currentTier.is_default && (
                      <Badge variant="secondary">平台默认</Badge>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    未分配套餐，使用默认限制。
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium">分配套餐</h4>
                  <p className="text-xs text-muted-foreground">
                    选择要应用于此组织的套餐。
                  </p>
                </div>
                <Select
                  value={selectedTierId ?? undefined}
                  onValueChange={setSelectedTierId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={"选择套餐"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers?.map((tier: TierRead) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        <div className="flex items-center gap-2">
                          <span>{tier.display_name}</span>
                          {tier.is_default && (
                            <span className="text-xs text-muted-foreground">
                              （平台默认）
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {orgTier && (
                <>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium">覆盖设置</h4>
                      <p className="text-xs text-muted-foreground">
                        覆盖基础套餐设置的自定义限制。
                      </p>
                    </div>
                    {hasOverrides ? (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {orgTier.max_concurrent_workflows != null && (
                          <div>
                            <span className="text-muted-foreground">
                              最大并发工作流数：
                            </span>
                            <span className="ml-2">
                              {orgTier.max_concurrent_workflows}
                            </span>
                          </div>
                        )}
                        {orgTier.max_action_executions_per_workflow != null && (
                          <div>
                            <span className="text-muted-foreground">
                              每个工作流的最大动作数：
                            </span>
                            <span className="ml-2">
                              {orgTier.max_action_executions_per_workflow}
                            </span>
                          </div>
                        )}
                        {orgTier.max_concurrent_actions != null && (
                          <div>
                            <span className="text-muted-foreground">
                              最大并发动作数：
                            </span>
                            <span className="ml-2">
                              {orgTier.max_concurrent_actions}
                            </span>
                          </div>
                        )}
                        {orgTier.api_rate_limit != null && (
                          <div>
                            <span className="text-muted-foreground">
                              API 速率限制：
                            </span>
                            <span className="ml-2">
                              {orgTier.api_rate_limit}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        未配置覆盖设置。
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={
              updatePending ||
              selectedTierId == null ||
              selectedTierId === orgTier?.tier_id
            }
          >
            {updatePending ? "保存中…" : "保存更改"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
