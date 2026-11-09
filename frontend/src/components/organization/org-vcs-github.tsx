"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  GithubIcon,
  Trash2Icon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CenteredSpinner } from "@/components/loading/spinner"
import { GitHubAppManualForm } from "@/components/organization/org-vcs-github-manual-form"
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
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  useDeleteGitHubAppCredentials,
  useGitHubAppCredentialsStatus,
  useGitHubAppManifest,
} from "@/lib/hooks"

const gitHubAppFormSchema = z.object({
  organizationName: z
    .string()
    .min(1, "组织名称不能为空")
    .max(100, "组织名称必须少于 100 个字符"),
  githubHost: z
    .string()
    .url("请输入有效的 URL")
    .refine(
      (url) => {
        try {
          const urlObj = new URL(url)
          if (urlObj.protocol !== "https:") {
            return false
          }
          const allowedHosts = ["github.com", "www.github.com"]
          const isGitHubEnterprise =
            urlObj.hostname.endsWith(".github.com") ||
            urlObj.hostname.match(/^github\.[a-zA-Z0-9.-]+$/)
          return allowedHosts.includes(urlObj.hostname) || isGitHubEnterprise
        } catch {
          return false
        }
      },
      {
        message:
          "必须是有效的 HTTPS GitHub URL（github.com 或 GitHub Enterprise）",
      }
    )
    .default("https://github.com"),
})

type GitHubAppFormData = z.infer<typeof gitHubAppFormSchema>

export function GitHubAppSetup() {
  const { manifest } = useGitHubAppManifest()
  const {
    credentialsStatus,
    credentialsStatusIsLoading,
    refetchCredentialsStatus,
  } = useGitHubAppCredentialsStatus()
  const { deleteCredentials } = useDeleteGitHubAppCredentials()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.has("setup_success")) {
      toast({
        title: "GitHub 应用配置成功！",
        description: "GitHub 应用已创建并安装。",
      })
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const isConfigured = credentialsStatus?.exists ?? false
  const isCorrupted = credentialsStatus?.is_corrupted ?? false

  const handleFormSuccess = () => {
    setDialogOpen(false)
    refetchCredentialsStatus()
    toast({
      title: "GitHub 应用配置成功！",
      description: "GitHub 应用凭据已保存。",
    })
  }

  const handleDelete = async () => {
    try {
      await deleteCredentials.mutateAsync()
      setDeleteDialogOpen(false)
      toast({
        title: "已删除 GitHub 应用凭据",
        description: "Git 同步已断开。",
      })
    } catch (error) {
      console.error("Failed to delete GitHub App credentials:", error)
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "删除凭据失败",
        variant: "destructive",
      })
    }
  }

  if (credentialsStatusIsLoading) {
    return <CenteredSpinner />
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          {isCorrupted ? (
            <AlertTriangleIcon className="size-5 text-amber-500" />
          ) : isConfigured ? (
            <CheckCircle2Icon className="size-5 text-green-500" />
          ) : (
            <GithubIcon className="size-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">GitHub</p>
            <p className="text-xs text-muted-foreground">
              {isCorrupted ? (
                "已保存的凭据无法读取，请重新输入 GitHub 应用凭据以连接。"
              ) : isConfigured ? (
                <>
                  应用 ID： {credentialsStatus?.app_id}
                  {credentialsStatus?.has_webhook_secret
                    ? ` · Webhook 密钥：${credentialsStatus.webhook_secret_preview}`
                    : " · Webhook 密钥：未设置"}
                  {credentialsStatus?.client_id
                    ? ` · 客户端 ID：${credentialsStatus.client_id}`
                    : " · 客户端 ID：未设置"}
                </>
              ) : (
                "未连接"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                {isCorrupted ? "重新连接" : "更新"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              连接
            </Button>
          )}
        </div>
      </div>

      <GitHubConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        manifest={manifest}
        onFormSuccess={handleFormSuccess}
        hasStoredCredentials={isConfigured}
        existingAppId={
          isConfigured ? credentialsStatus?.app_id || undefined : undefined
        }
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 GitHub 应用凭据</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 GitHub 应用凭据吗？此操作将禁用与 Git
              仓库的工作流同步。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCredentials.isPending}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteCredentials.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteCredentials.isPending ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function GitHubConnectionDialog({
  open,
  onOpenChange,
  manifest,
  onFormSuccess,
  hasStoredCredentials,
  existingAppId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  manifest: { manifest: Record<string, unknown> } | undefined
  onFormSuccess: () => void
  hasStoredCredentials: boolean
  existingAppId?: string
}) {
  const { toast } = useToast()

  const form = useForm<GitHubAppFormData>({
    resolver: zodResolver(gitHubAppFormSchema),
    defaultValues: {
      organizationName: "My Organization",
      githubHost: "https://github.com",
    },
  })

  const onSubmit = async (data: GitHubAppFormData) => {
    if (!manifest?.manifest) {
      toast({
        title: "错误",
        description: "没有可提交的应用清单",
        variant: "destructive",
      })
      return
    }

    try {
      const urlObj = new URL(data.githubHost)
      if (urlObj.protocol !== "https:") {
        throw new Error("必须使用 HTTPS")
      }
    } catch {
      toast({
        title: "GitHub 主机无效",
        description: "请使用有效的 HTTPS GitHub URL",
        variant: "destructive",
      })
      return
    }

    const formEl = document.createElement("form")
    formEl.method = "POST"
    formEl.target = "_blank"

    const targetUrl = new URL(
      `/organizations/${encodeURIComponent(data.organizationName)}/settings/apps/new`,
      data.githubHost
    )
    formEl.action = targetUrl.toString()

    const manifestInput = document.createElement("input")
    manifestInput.type = "hidden"
    manifestInput.name = "manifest"
    manifestInput.setAttribute("value", JSON.stringify(manifest.manifest))
    formEl.appendChild(manifestInput)

    if (data.githubHost !== "https://github.com") {
      const orgInput = document.createElement("input")
      orgInput.type = "hidden"
      orgInput.name = "organization"
      orgInput.setAttribute("value", data.organizationName)
      formEl.appendChild(orgInput)
    }

    document.body.appendChild(formEl)
    formEl.submit()
    document.body.removeChild(formEl)

    toast({
      title: "正在跳转到 GitHub",
      description: "正在新标签页中打开 GitHub 应用创建页面",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {hasStoredCredentials ? "更新 GitHub 应用" : "连接 GitHub 应用"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" disableUnderline>
                创建应用
              </TabsTrigger>
              <TabsTrigger value="existing" disableUnderline>
                使用现有应用
              </TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="space-y-4 pt-2">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>组织名称</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={"我的组织"} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="githubHost"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>GitHub 主机 URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://github.com" />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          使用 GitHub Enterprise 时，请输入实例 URL
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="gap-2"
                    disabled={!manifest?.manifest}
                  >
                    <ExternalLinkIcon className="size-4" />
                    创建 GitHub 应用
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="existing" className="pt-2">
              <GitHubAppManualForm
                onSuccess={onFormSuccess}
                existingAppId={existingAppId}
                hasStoredCredentials={hasStoredCredentials}
              />
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
