"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { useAdminOrganization, useAdminOrgDomains } from "@/hooks/use-admin"

interface AdminOrgDomainsDialogProps {
  orgId: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface ApiErrorLike {
  body?: {
    detail?: unknown
  }
}

function getErrorDetail(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const apiError = error as ApiErrorLike
    if (typeof apiError.body?.detail === "string") {
      return apiError.body.detail
    }
  }
  return fallback
}

export function AdminOrgDomainsDialog({
  orgId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: AdminOrgDomainsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [newDomain, setNewDomain] = useState("")
  const [setPrimaryOnCreate, setSetPrimaryOnCreate] = useState(false)
  const isControlled = controlledOpen !== undefined
  const dialogOpen = isControlled ? controlledOpen : internalOpen
  const setDialogOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  const { organization } = useAdminOrganization(orgId)
  const {
    domains,
    isLoading,
    createDomain,
    createPending,
    updateDomain,
    updatePending,
    deleteDomain,
    deletePending,
  } = useAdminOrgDomains(orgId)

  useEffect(() => {
    if (!dialogOpen) {
      setNewDomain("")
      setSetPrimaryOnCreate(false)
    }
  }, [dialogOpen])

  const hasDomains = (domains?.length ?? 0) > 0
  const isBusy = createPending || updatePending || deletePending

  const sortedDomains = useMemo(() => domains ?? [], [domains])

  const handleAddDomain = async () => {
    const domain = newDomain.trim()
    if (!domain) {
      return
    }

    try {
      await createDomain({
        domain,
        is_primary: setPrimaryOnCreate,
      })
      toast({
        title: "已添加域名",
        description: `已分配 ${domain}。`,
      })
      setNewDomain("")
      setSetPrimaryOnCreate(false)
    } catch (error) {
      toast({
        title: "添加域名失败",
        description: getErrorDetail(error, "请重试。"),
        variant: "destructive",
      })
    }
  }

  const handleSetPrimary = async (domainId: string, domain: string) => {
    try {
      await updateDomain({
        domainId,
        data: { is_primary: true },
      })
      toast({
        title: "已更新主域名",
        description: `${domain} 现为主域名。`,
      })
    } catch (error) {
      toast({
        title: "设置主域名失败",
        description: getErrorDetail(error, "请重试。"),
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (
    domainId: string,
    domain: string,
    isCurrentlyActive: boolean
  ) => {
    const nextActive = !isCurrentlyActive
    try {
      await updateDomain({
        domainId,
        data: { is_active: nextActive },
      })
      toast({
        title: nextActive ? "已启用域名" : "已停用域名",
        description: `${domain} 已${nextActive ? "启用" : "停用"}。`,
      })
    } catch (error) {
      toast({
        title: "更新域名失败",
        description: getErrorDetail(error, "请重试。"),
        variant: "destructive",
      })
    }
  }

  const handleDeleteDomain = async (domainId: string, domain: string) => {
    try {
      await deleteDomain(domainId)
      toast({
        title: "已删除域名",
        description: `已移除 ${domain}。`,
      })
    } catch (error) {
      toast({
        title: "删除域名失败",
        description: getErrorDetail(error, "请重试。"),
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="md" className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>组织域名</DialogTitle>
          <DialogDescription>
            管理域名，所属组织： {organization?.name ?? "组织"}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={newDomain}
                  onChange={(event) => setNewDomain(event.target.value)}
                  placeholder="example.com"
                  disabled={isBusy}
                />
                <Button
                  onClick={handleAddDomain}
                  disabled={isBusy || newDomain.trim().length === 0}
                >
                  {createPending ? "添加中…" : "添加域名"}
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={setPrimaryOnCreate}
                  onCheckedChange={(checked) =>
                    setSetPrimaryOnCreate(checked === true)
                  }
                  disabled={isBusy}
                />
                设为主域名
              </label>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>域名</TableHead>
                    <TableHead>规范化域名</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>验证</TableHead>
                    <TableHead className="text-right">动作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={5}>
                        加载中…
                      </TableCell>
                    </TableRow>
                  ) : !hasDomains ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={5}>
                        未分配域名。
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedDomains.map((domain) => (
                      <TableRow key={domain.id}>
                        <TableCell className="font-medium">
                          {domain.domain}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {domain.normalized_domain}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {domain.is_primary ? (
                              <Badge variant="secondary">主要</Badge>
                            ) : null}
                            {domain.is_active ? (
                              <Badge variant="outline">已启用</Badge>
                            ) : (
                              <Badge variant="outline">已停用</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {domain.verification_method}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={
                                isBusy || domain.is_primary || !domain.is_active
                              }
                              onClick={() =>
                                handleSetPrimary(domain.id, domain.domain)
                              }
                            >
                              设为主要
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isBusy}
                              onClick={() =>
                                handleToggleActive(
                                  domain.id,
                                  domain.domain,
                                  domain.is_active
                                )
                              }
                            >
                              {domain.is_active ? "停用" : "启用"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700"
                              disabled={isBusy}
                              onClick={() =>
                                handleDeleteDomain(domain.id, domain.domain)
                              }
                            >
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
