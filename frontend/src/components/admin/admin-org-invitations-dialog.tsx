"use client"

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EnvelopeClosedIcon,
  PlusIcon,
  ReloadIcon,
  TrashIcon,
} from "@radix-ui/react-icons"
import { useMemo, useState } from "react"
import type { AdminOrgInvitationCreate, AdminOrgInvitationRead } from "@/client"
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
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { useAdminOrgInvitations } from "@/hooks/use-admin"
import { getApiErrorDetail, type TracecatApiError } from "@/lib/errors"

type PlatformRoleSlug = NonNullable<AdminOrgInvitationCreate["role_slug"]>

const ROLE_OPTIONS: Array<{ label: string; value: PlatformRoleSlug }> = [
  { label: "组织所有者", value: "organization-owner" },
  { label: "组织管理员", value: "organization-admin" },
  { label: "组织成员", value: "organization-member" },
]

function invitationUrl(token: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin
  return `${origin}/invitations/accept?token=${encodeURIComponent(token)}`
}

function statusVariant(status: AdminOrgInvitationRead["status"]) {
  switch (status) {
    case "pending":
      return "default"
    case "accepted":
      return "secondary"
    case "revoked":
      return "outline"
    default:
      return "secondary"
  }
}

function formatStatus(status: AdminOrgInvitationRead["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

/** Dialog for platform admins to issue and revoke organization invitations. */
export function AdminOrgInvitationsDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [email, setEmail] = useState("")
  const [roleSlug, setRoleSlug] =
    useState<PlatformRoleSlug>("organization-owner")
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] =
    useState<AdminOrgInvitationRead | null>(null)
  const {
    invitations,
    isLoading,
    createInvitation,
    createPending,
    getInvitationToken,
    revokeInvitation,
    revokePending,
    resendInvitation,
    resendPending,
    goToNextPage,
    goToPreviousPage,
    hasNextPage,
    hasPreviousPage,
    currentPage,
  } = useAdminOrgInvitations(orgId, open)
  const showPagination = hasPreviousPage || hasNextPage || currentPage > 0

  const createdLink = useMemo(
    () => (createdToken ? invitationUrl(createdToken) : null),
    [createdToken]
  )

  async function copyToClipboard(text: string, description: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: "已复制", description })
    } catch {
      toast({
        title: "复制失败",
        description: "剪贴板访问被拒绝或不可用。",
        variant: "destructive",
      })
    }
  }

  async function copyInvitationLink(invitationId: string) {
    try {
      const { token } = await getInvitationToken(invitationId)
      await copyToClipboard(invitationUrl(token), "已复制邀请链接。")
    } catch {
      toast({
        title: "复制邀请链接失败",
        description: "无法加载邀请令牌。",
        variant: "destructive",
      })
    }
  }

  async function handleCreateInvitation() {
    try {
      const invitation = await createInvitation({
        email,
        role_slug: roleSlug,
      })
      setCreatedToken(invitation.token)
      setEmail("")
      setRoleSlug("organization-owner")
      toast({ title: "已创建邀请", description: invitation.email })
    } catch {
      toast({
        title: "创建邀请失败",
        description: "请检查邮箱、角色及现有待处理邀请。",
        variant: "destructive",
      })
    }
  }

  async function handleResendInvitation(invitation: AdminOrgInvitationRead) {
    try {
      await resendInvitation(invitation.id)
      toast({ title: "邀请邮件已加入发送队列", description: invitation.email })
    } catch (error) {
      const apiError = error as TracecatApiError
      if (apiError.status === 409) {
        toast({
          title: "你刚刚发送过邀请邮件",
          description: "请稍后重试。",
        })
        return
      }
      toast({
        title: "重新发送邀请失败",
        description: getApiErrorDetail(apiError) ?? undefined,
        variant: "destructive",
      })
    }
  }

  async function handleRevokeInvitation() {
    if (!revokeTarget) return
    try {
      await revokeInvitation(revokeTarget.id)
      toast({ title: "邀请已撤销", description: revokeTarget.email })
    } catch {
      toast({
        title: "撤销邀请失败",
        description: "只能撤销由平台创建且尚未处理的邀请。",
        variant: "destructive",
      })
    } finally {
      setRevokeTarget(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg" className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>组织邀请</DialogTitle>
            <DialogDescription>创建和管理由平台发起的邀请。</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 rounded-md border p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                  <Input
                    id="admin-org-invitation-email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="user@example.com"
                    type="email"
                    autoComplete="email"
                  />
                  <Select
                    value={roleSlug}
                    onValueChange={(value) =>
                      setRoleSlug(value as PlatformRoleSlug)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleCreateInvitation}
                    disabled={!email || createPending}
                  >
                    {createPending ? (
                      <ReloadIcon data-icon="inline-start" />
                    ) : (
                      <PlusIcon data-icon="inline-start" />
                    )}
                    创建邀请
                  </Button>
                </div>

                {createdLink && createdToken && (
                  <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3">
                    <Input
                      id="admin-org-invitation-link"
                      name="invitation_link"
                      readOnly
                      value={createdLink}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            invitationUrl(createdToken),
                            "已复制邀请链接。"
                          )
                        }
                      >
                        <CopyIcon data-icon="inline-start" />
                        复制链接
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(createdToken, "已复制邀请令牌。")
                        }
                      >
                        <CopyIcon data-icon="inline-start" />
                        复制令牌
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>邮箱</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>到期时间</TableHead>
                      <TableHead className="w-[220px] text-right">
                        动作
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-20 text-center text-muted-foreground"
                        >
                          正在加载邀请…
                        </TableCell>
                      </TableRow>
                    ) : invitations.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-20 text-center text-muted-foreground"
                        >
                          暂无平台创建的邀请
                        </TableCell>
                      </TableRow>
                    ) : (
                      invitations.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">
                            {invitation.email}
                          </TableCell>
                          <TableCell>{invitation.role_name}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(invitation.status)}>
                              {formatStatus(invitation.status)}
                            </Badge>
                            {invitation.last_emailed_at && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {`已向 ${new Date(
                                  invitation.last_emailed_at
                                ).toLocaleString("zh-CN")} 发送邮件`}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(invitation.expires_at).toLocaleDateString(
                              "zh-CN"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  copyInvitationLink(invitation.id)
                                }
                              >
                                <CopyIcon data-icon="inline-start" />
                                复制链接
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={
                                  invitation.status !== "pending" ||
                                  new Date(invitation.expires_at) <=
                                    new Date() ||
                                  resendPending
                                }
                                onClick={() =>
                                  handleResendInvitation(invitation)
                                }
                              >
                                <EnvelopeClosedIcon data-icon="inline-start" />
                                重新发送
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={invitation.status !== "pending"}
                                onClick={() => setRevokeTarget(invitation)}
                              >
                                <TrashIcon data-icon="inline-start" />
                                撤销
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {showPagination && (
                  <div className="flex items-center justify-between border-t px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      页 {currentPage + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!hasPreviousPage || isLoading}
                        onClick={goToPreviousPage}
                      >
                        <ChevronLeftIcon className="size-4" />
                        上一页
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!hasNextPage || isLoading}
                        onClick={goToNextPage}
                      >
                        下一页
                        <ChevronRightIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={() => setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撤销邀请</AlertDialogTitle>
            <AlertDialogDescription>
              撤销此用户的邀请： {revokeTarget?.email}
              ？此令牌将无法再用于访问组织。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={revokePending}
              onClick={handleRevokeInvitation}
            >
              撤销
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
