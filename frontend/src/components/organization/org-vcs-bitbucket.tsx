"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Trash2Icon } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CenteredSpinner } from "@/components/loading/spinner"
import { BitbucketIcon } from "@/components/organization/vcs-icons"
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
  useBitbucketTokenCredentials,
  useBitbucketTokenCredentialsStatus,
  useDeleteBitbucketTokenCredentials,
} from "@/hooks/use-bitbucket-credentials"

const bitbucketTokenFormSchema = z.object({
  email: z.string().trim().email("输入 Atlassian 账号邮箱"),
  token: z.string().trim().min(1, "令牌不能为空"),
})

type BitbucketTokenFormData = z.infer<typeof bitbucketTokenFormSchema>

/** Configure organization credentials for Bitbucket Cloud workspace sync. */
export function BitbucketTokenSetup() {
  const {
    credentialsStatus,
    credentialsStatusIsLoading,
    credentialsStatusError,
    refetchCredentialsStatus,
  } = useBitbucketTokenCredentialsStatus()
  const { deleteCredentials } = useDeleteBitbucketTokenCredentials()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  const isConfigured = credentialsStatus?.exists ?? false
  const isCorrupted = credentialsStatus?.is_corrupted ?? false

  let statusLabel = "未连接"
  if (isCorrupted) {
    statusLabel = "无法读取已存储的凭据，请重新输入 API 令牌以恢复连接。"
  } else if (isConfigured) {
    statusLabel = `账号邮箱：${credentialsStatus?.email ?? "未知"}`
  }

  async function handleDelete() {
    try {
      await deleteCredentials.mutateAsync()
      setDeleteDialogOpen(false)
      toast({
        title: "已删除 Bitbucket 凭据",
        description: "Bitbucket 工作空间同步已断开。",
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

  if (credentialsStatusError) {
    return (
      <p className="text-sm text-destructive">
        无法加载 Bitbucket 凭据。{" "}
        <Button variant="link" onClick={() => refetchCredentialsStatus()}>
          重试
        </Button>
      </p>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <BitbucketIcon className="size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Bitbucket Cloud</p>
            <p className="text-xs text-muted-foreground">{statusLabel}</p>
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
                aria-label={"删除 Bitbucket 凭据"}
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

      <BitbucketConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existingEmail={credentialsStatus?.email ?? undefined}
        onFormSuccess={() => {
          setDialogOpen(false)
          refetchCredentialsStatus()
          toast({
            title: "已保存 Bitbucket 凭据",
            description: "Bitbucket 工作空间同步凭据已就绪。",
          })
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 Bitbucket 凭据</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 Bitbucket
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

function BitbucketConnectionDialog({
  open,
  onOpenChange,
  existingEmail,
  onFormSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingEmail?: string
  onFormSuccess: () => void
}) {
  const { saveCredentials } = useBitbucketTokenCredentials()
  const { toast } = useToast()
  const form = useForm<BitbucketTokenFormData>({
    resolver: zodResolver(bitbucketTokenFormSchema),
    defaultValues: {
      email: existingEmail ?? "",
      token: "",
    },
  })

  useEffect(() => {
    form.reset({
      email: existingEmail ?? "",
      token: "",
    })
  }, [existingEmail, form, open])

  async function onSubmit(values: BitbucketTokenFormData) {
    try {
      await saveCredentials.mutateAsync(values)
      onFormSuccess()
    } catch (error) {
      toast({
        title: "错误",
        description:
          error instanceof Error ? error.message : "保存 Bitbucket 凭据失败",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bitbucket 工作空间同步凭据</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>账号邮箱</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      使用与 API 令牌关联的 Atlassian 账号邮箱。
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
                        placeholder={"API 令牌"}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      创建具有仓库读写和拉取请求读写权限的 Bitbucket Cloud API
                      令牌。{" "}
                      <a
                        className="underline"
                        href="https://support.atlassian.com/bitbucket-cloud/docs/api-token-permissions/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        令牌权限
                      </a>
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
