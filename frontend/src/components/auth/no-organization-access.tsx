"use client"

import { AlertCircle, LogOut } from "lucide-react"
import Link from "next/link"
import { CenteredSpinner } from "@/components/loading/spinner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuthActions } from "@/hooks/use-auth"
import { usePendingOrgInvitations } from "@/hooks/use-pending-org-invitations"

export function NoOrganizationAccess() {
  const { logout } = useAuthActions()
  const {
    pendingInvitations,
    pendingInvitationsIsLoading,
    pendingInvitationsError,
  } = usePendingOrgInvitations()

  if (pendingInvitationsIsLoading) {
    return <CenteredSpinner />
  }

  const invitations = pendingInvitations ?? []

  return (
    <main className="container flex size-full max-w-[520px] flex-col items-center justify-center p-4">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <AlertCircle className="mb-2 size-10 text-muted-foreground" />
          <CardTitle>尚无组织访问权限</CardTitle>
          <CardDescription>
            账号已通过身份验证，但尚未加入组织。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          {pendingInvitationsError ? (
            <p className="text-sm text-muted-foreground">
              无法加载待处理邀请。如果你有邀请链接，请直接打开。
            </p>
          ) : invitations.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                找到了此账号的待处理邀请。
              </p>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.token}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {invitation.organization_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        到期时间：{" "}
                        {new Date(invitation.expires_at).toLocaleDateString(
                          "zh-CN"
                        )}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/invitations/accept?token=${encodeURIComponent(invitation.token)}`}
                      >
                        审核
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              未找到此账号的待处理邀请。请联系组织管理员邀请此邮箱。
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => logout("/sign-in")}
          >
            <LogOut className="mr-2 size-4" />
            退出登录
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
