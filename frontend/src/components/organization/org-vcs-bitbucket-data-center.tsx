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
  useBitbucketDataCenterTokenCredentials,
  useBitbucketDataCenterTokenCredentialsStatus,
  useDeleteBitbucketDataCenterTokenCredentials,
} from "@/hooks/use-bitbucket-data-center-credentials"

const bitbucketDataCenterTokenFormSchema = z.object({
  base_url: z
    .string()
    .trim()
    .url("输入实例的 HTTPS URL")
    .startsWith("https://"),
  token: z.string().trim().min(1, "令牌不能为空"),
})

type BitbucketDataCenterTokenFormData = z.infer<
  typeof bitbucketDataCenterTokenFormSchema
>

/** Configure organization credentials for Bitbucket Data Center workspace sync. */
export function BitbucketDataCenterTokenSetup() {
  const {
    credentialsStatus,
    credentialsStatusIsLoading,
    credentialsStatusError,
    refetchCredentialsStatus,
  } = useBitbucketDataCenterTokenCredentialsStatus()
  const { deleteCredentials } = useDeleteBitbucketDataCenterTokenCredentials()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  const isConfigured = credentialsStatus?.exists ?? false
  const isCorrupted = credentialsStatus?.is_corrupted ?? false

  let statusLabel = "未连接"
  if (isCorrupted) {
    statusLabel = "无法读取已存储的凭据，请重新输入 API 令牌以恢复连接。"
  } else if (isConfigured) {
    statusLabel = credentialsStatus?.base_url ?? "未知服务器"
  }

  async function handleDelete() {
    try {
      await deleteCredentials.mutateAsync()
      setDeleteDialogOpen(false)
      toast({
        title: "已删除 Bitbucket Data Center 凭据",
        description: "Bitbucket Data Center 工作空间同步已断开。",
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
        无法加载 Bitbucket Data Center 凭据。{" "}
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
            <p className="text-sm font-medium">Bitbucket Data Center</p>
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
                aria-label={"删除 Bitbucket Data Center 凭据"}
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

      <BitbucketDataCenterConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existingBaseUrl={credentialsStatus?.base_url ?? undefined}
        onFormSuccess={() => {
          setDialogOpen(false)
          refetchCredentialsStatus()
          toast({
            title: "已保存 Bitbucket Data Center 凭据",
            description: "Bitbucket Data Center 工作空间同步凭据已就绪。",
          })
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除 Bitbucket Data Center 凭据</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 Bitbucket Data Center
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

function BitbucketDataCenterConnectionDialog({
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
  const { saveCredentials } = useBitbucketDataCenterTokenCredentials()
  const { toast } = useToast()
  const form = useForm<BitbucketDataCenterTokenFormData>({
    resolver: zodResolver(bitbucketDataCenterTokenFormSchema),
    defaultValues: {
      base_url: existingBaseUrl ?? "",
      token: "",
    },
  })

  useEffect(() => {
    form.reset({
      base_url: existingBaseUrl ?? "",
      token: "",
    })
  }, [existingBaseUrl, form, open])

  async function onSubmit(values: BitbucketDataCenterTokenFormData) {
    try {
      await saveCredentials.mutateAsync(values)
      onFormSuccess()
    } catch (error) {
      toast({
        title: "错误",
        description:
          error instanceof Error
            ? error.message
            : "保存 Bitbucket Data Center 凭据失败",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bitbucket Data Center 工作空间同步凭据</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="base_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>实例 URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://bitbucket.example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      使用实例的 HTTPS URL；若配置了上下文路径，也请包含该路径。
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
                        placeholder={"HTTP 访问令牌"}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      使用具有仓库写入权限的 Data Center HTTP 访问令牌。{" "}
                      <a
                        className="underline"
                        href="https://confluence.atlassian.com/bitbucketserver/http-access-tokens-939515499.html"
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
