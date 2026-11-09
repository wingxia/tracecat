"use client"

import { AlertCircle, CheckCircle2, Clock, UserPlus, UserX } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import TracecatIcon from "public/icon.png"
import { Suspense } from "react"
import {
  invitationsAcceptInvitation,
  invitationsGetInvitationByToken,
} from "@/client"
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
import { toast } from "@/components/ui/use-toast"
import { useAuth, useAuthActions } from "@/hooks/use-auth"
import { useMutation, useQuery, useQueryClient } from "@/lib/query"

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") ?? null
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, userIsLoading } = useAuth()
  const { logout } = useAuthActions()

  // Fetch invitation details
  const {
    data: invitation,
    isLoading: invitationIsLoading,
    error: invitationError,
  } = useQuery({
    queryKey: ["invitation", token],
    queryFn: async () => {
      if (!token) {
        throw new Error("未提供邀请令牌")
      }
      return await invitationsGetInvitationByToken({ token })
    },
    enabled: !!token,
    retry: false,
  })

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error("缺少邀请令牌")
      }
      return await invitationsAcceptInvitation({
        requestBody: { token },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] })
      toast({
        title: "已接受邀请",
        description: `你已加入 ${invitation?.organization_name}`,
      })
      router.push("/workspaces")
    },
    onError: (error: Error) => {
      toast({
        title: "接受邀请失败",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // No token provided
  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <AlertCircle className="mb-4 size-12 text-destructive" />
          <CardTitle>邀请无效</CardTitle>
          <CardDescription>未提供邀请令牌，请检查链接后重试。</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href="/">前往首页</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Loading states
  if (invitationIsLoading || userIsLoading) {
    return <CenteredSpinner />
  }

  // Invitation not found or error
  if (invitationError || !invitation) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <AlertCircle className="mb-4 size-12 text-destructive" />
          <CardTitle>未找到邀请</CardTitle>
          <CardDescription>
            此邀请可能已过期或被撤销，请联系组织管理员获取新邀请。
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href="/">前往首页</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Invitation already accepted
  if (invitation.status === "accepted") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="mb-4 size-12 text-green-500" />
          <CardTitle>邀请已接受</CardTitle>
          <CardDescription>此邀请已被接受。</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/workspaces">前往工作空间</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Invitation revoked
  if (invitation.status === "revoked") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <AlertCircle className="mb-4 size-12 text-destructive" />
          <CardTitle>邀请已撤销</CardTitle>
          <CardDescription>
            此邀请已被撤销，请联系组织管理员获取新邀请。
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href="/">前往首页</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Check if invitation is expired
  const expiresAt = new Date(invitation.expires_at)
  const isExpired = expiresAt < new Date()

  if (isExpired) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Clock className="mb-4 size-12 text-muted-foreground" />
          <CardTitle>邀请已过期</CardTitle>
          <CardDescription>
            此邀请的过期时间为 {expiresAt.toLocaleDateString("zh-CN")}
            。请联系组织管理员获取新邀请。
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href="/">前往首页</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // User not authenticated - show sign in prompt
  if (!user) {
    const returnUrl = `/invitations/accept?token=${token}`
    const signInPath = `/sign-in?returnUrl=${encodeURIComponent(returnUrl)}&org=${encodeURIComponent(invitation.organization_slug)}`
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Image src={TracecatIcon} alt="Tracecat" className="mb-4 size-16" />
          <CardTitle>你收到了邀请！</CardTitle>
          <CardDescription>
            {invitation.inviter_name ? (
              <>
                <strong>{invitation.inviter_name}</strong> 邀请你加入{" "}
                <strong>{invitation.organization_name}</strong>.
              </>
            ) : (
              <>
                你受邀加入 <strong>{invitation.organization_name}</strong>.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">组织</span>
                <span className="font-medium">
                  {invitation.organization_name}
                </span>
              </div>
              {invitation.inviter_email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">邀请人</span>
                  <span className="font-medium">
                    {invitation.inviter_email}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">到期时间</span>
                <span className="font-medium">
                  {expiresAt.toLocaleDateString("zh-CN")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button asChild className="w-full">
            <Link href={signInPath}>登录并接受</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // User authenticated but email doesn't match
  if (invitation.email_matches === false) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <UserX className="mb-4 size-12 text-destructive" />
          <CardTitle>账号不匹配</CardTitle>
          <CardDescription>
            此邀请发送到了另一个邮箱，请退出并使用正确的账号登录。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">组织</span>
                <span className="font-medium">
                  {invitation.organization_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">当前登录账号</span>
                <span className="font-medium">{user.email}</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button
            className="w-full"
            onClick={() => {
              const returnUrl = `/invitations/accept?token=${token}`
              logout(
                `/sign-in?returnUrl=${encodeURIComponent(returnUrl)}&org=${encodeURIComponent(invitation.organization_slug)}`
              )
            }}
          >
            使用其他账号登录
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/workspaces">前往工作空间</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // User authenticated - show accept button
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <UserPlus className="mb-4 size-12 text-primary" />
        <CardTitle>加入 {invitation.organization_name}</CardTitle>
        <CardDescription>
          {invitation.inviter_name ? (
            <>
              <strong>{invitation.inviter_name}</strong> 邀请你加入此组织。
            </>
          ) : (
            <>你受邀加入此组织。</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">组织</span>
              <span className="font-medium">
                {invitation.organization_name}
              </span>
            </div>
            {invitation.inviter_email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">邀请人</span>
                <span className="font-medium">{invitation.inviter_email}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">到期时间</span>
              <span className="font-medium">
                {expiresAt.toLocaleDateString("zh-CN")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <Button
          className="w-full"
          onClick={() => acceptMutation.mutate()}
          disabled={acceptMutation.isPending}
        >
          {acceptMutation.isPending ? "接受中…" : "接受邀请"}
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/workspaces">拒绝</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function AcceptInvitationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<CenteredSpinner />}>
        <AcceptInvitationContent />
      </Suspense>
    </div>
  )
}
