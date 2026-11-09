"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { GitlabIcon, Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CenteredSpinner } from "@/components/loading/spinner"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
  useDeleteGitLabTokenCredentials,
  useGitLabTokenCredentials,
  useGitLabTokenCredentialsStatus,
} from "@/lib/hooks"

const gitLabTokenFormSchema = z.object({
  base_url: z
    .string()
    .trim()
    .url("请输入有效的 URL")
    .default("https://gitlab.com"),
  token: z.string().trim().min(1, "令牌不能为空"),
})

type GitLabTokenFormData = z.infer<typeof gitLabTokenFormSchema>

export function GitLabTokenSetup() {
  const {
    credentialsStatus,
    credentialsStatusIsLoading,
    refetchCredentialsStatus,
  } = useGitLabTokenCredentialsStatus()
  const { deleteCredentials } = useDeleteGitLabTokenCredentials()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  const isConfigured = credentialsStatus?.exists ?? false
  const isCorrupted = credentialsStatus?.is_corrupted ?? false

  async function handleDelete() {
    try {
      await deleteCredentials.mutateAsync()
      setDeleteDialogOpen(false)
      toast({
        title: "已删除 GitLab 凭据",
        description: "GitLab 工作空间同步已断开。",
      })
    } catch (error) {
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
          <GitlabIcon className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">GitLab</p>
            <p className="text-xs text-muted-foreground">
              {isCorrupted
                ? "已保存的凭据无法读取，请重新输入 GitLab 令牌以连接。"
                : isConfigured
                  ? (credentialsStatus?.base_url ?? "未知服务器")
                  : "未连接"}
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

      <GitLabConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existingBaseUrl={credentialsStatus?.base_url ?? undefined}
        onFormSuccess={() => {
          setDialogOpen(false)
          refetchCredentialsStatus()
          toast({
            title: "已保存 GitLab 凭据",
            description: "GitLab 工作空间同步凭据已就绪。",
          })
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 GitLab 凭据</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 GitLab
              令牌凭据吗？重新连接凭据前，工作空间同步将停止工作。
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

function GitLabConnectionDialog({
  open,
  onOpenChange,
  existingBaseUrl,
  onFormSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingBaseUrl?: string
  onFormSuccess: () => void
}) {
  const { saveCredentials } = useGitLabTokenCredentials()
  const { toast } = useToast()
  const form = useForm<GitLabTokenFormData>({
    resolver: zodResolver(gitLabTokenFormSchema),
    defaultValues: {
      base_url: existingBaseUrl ?? "https://gitlab.com",
      token: "",
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }
    form.reset({
      base_url: existingBaseUrl ?? "https://gitlab.com",
      token: "",
    })
  }, [existingBaseUrl, form, open])

  async function onSubmit(values: GitLabTokenFormData) {
    try {
      await saveCredentials.mutateAsync(values)
      onFormSuccess()
    } catch (error) {
      toast({
        title: "错误",
        description:
          error instanceof Error ? error.message : "保存 GitLab 凭据失败",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>GitLab 工作空间同步凭据</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="base_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>基础 URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://gitlab.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      不使用 GitLab.com 时，请填写自建 GitLab 的 URL。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>凭据令牌</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="off"
                        placeholder="glpat-..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      使用同时具有 api 和 write_repository 权限范围的 GitLab
                      项目或用户组访问令牌。通过持久 Git 同步推送前，请替换仅有
                      api 权限的旧令牌。Tracecat 将此令牌保存为工作空间同步的
                      GitLab 凭据；长期同步建议优先使用它，而非个人访问令牌。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={saveCredentials.isPending}>
                  {saveCredentials.isPending ? "保存中…" : "保存"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
