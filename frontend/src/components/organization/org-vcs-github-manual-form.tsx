"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { FileTextIcon, UploadCloudIcon } from "lucide-react"
import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  useCallback,
  useRef,
  useState,
} from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { AlertNotification } from "@/components/notifications"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useGitHubAppCredentials } from "@/lib/hooks"
import { cn } from "@/lib/utils"

const pemFileExtensionRegex = /\.pem$/i

const gitHubAppCredentialsSchema = z.object({
  app_id: z
    .string()
    .min(1, "应用 ID 不能为空")
    .regex(/^\d+$/, "应用 ID 必须为数字"),
  private_key: z
    .string()
    .min(1, "私钥不能为空")
    .refine(
      (val) =>
        val.includes("BEGIN RSA PRIVATE KEY") ||
        val.includes("BEGIN PRIVATE KEY"),
      "私钥必须是包含 BEGIN/END 标记的 PEM 格式"
    ),
  webhook_secret: z.string().optional(),
  client_id: z.string().optional(),
})

type GitHubAppCredentialsFormData = z.infer<typeof gitHubAppCredentialsSchema>

interface GitHubAppManualFormProps {
  onSuccess?: () => void
  existingAppId?: string
  hasStoredCredentials?: boolean
  className?: string
}

export function GitHubAppManualForm({
  onSuccess,
  existingAppId,
  hasStoredCredentials = false,
  className,
}: GitHubAppManualFormProps) {
  const { saveCredentials } = useGitHubAppCredentials()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [privateKeyFileName, setPrivateKeyFileName] = useState<string | null>(
    null
  )
  const [isPrivateKeyDragOver, setIsPrivateKeyDragOver] = useState(false)
  const privateKeyFileInputRef = useRef<HTMLInputElement | null>(null)
  const privateKeyReadIdRef = useRef(0)

  const form = useForm<GitHubAppCredentialsFormData>({
    resolver: zodResolver(gitHubAppCredentialsSchema),
    defaultValues: {
      app_id: existingAppId || "",
      private_key: "",
      webhook_secret: "",
      client_id: "",
    },
  })

  const resetPrivateKeyFileInput = useCallback(() => {
    if (privateKeyFileInputRef.current) {
      privateKeyFileInputRef.current.value = ""
    }
  }, [])

  const handlePrivateKeyFile = useCallback(
    (file: File | undefined) => {
      if (!file) {
        return
      }

      const readId = privateKeyReadIdRef.current + 1
      privateKeyReadIdRef.current = readId

      if (!pemFileExtensionRegex.test(file.name)) {
        setPrivateKeyFileName(null)
        form.setValue("private_key", "", {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        })
        form.setError("private_key", {
          type: "manual",
          message: "请上传 .pem 文件。",
        })
        resetPrivateKeyFileInput()
        return
      }

      setPrivateKeyFileName(null)
      form.setValue("private_key", "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      })

      const reader = new FileReader()
      reader.onload = () => {
        if (readId !== privateKeyReadIdRef.current) {
          return
        }

        const privateKey =
          typeof reader.result === "string" ? reader.result : ""

        form.clearErrors("private_key")
        form.setValue("private_key", privateKey, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
        setPrivateKeyFileName(file.name)
        resetPrivateKeyFileInput()
      }
      reader.onerror = () => {
        if (readId !== privateKeyReadIdRef.current) {
          return
        }

        setPrivateKeyFileName(null)
        form.setValue("private_key", "", {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        })
        form.setError("private_key", {
          type: "manual",
          message: "读取上传的 PEM 文件失败。",
        })
        resetPrivateKeyFileInput()
      }

      reader.readAsText(file)
      resetPrivateKeyFileInput()
    },
    [form, resetPrivateKeyFileInput]
  )

  const handlePrivateKeyInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handlePrivateKeyFile(event.target.files?.[0])
    },
    [handlePrivateKeyFile]
  )

  const handlePrivateKeyDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsPrivateKeyDragOver(false)
      handlePrivateKeyFile(event.dataTransfer.files?.[0])
      event.dataTransfer.clearData()
    },
    [handlePrivateKeyFile]
  )

  const handlePrivateKeyDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
      setIsPrivateKeyDragOver(true)
    },
    []
  )

  const handlePrivateKeyDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const relatedTarget = event.relatedTarget
      if (
        relatedTarget instanceof Node &&
        event.currentTarget.contains(relatedTarget)
      ) {
        return
      }
      setIsPrivateKeyDragOver(false)
    },
    []
  )

  const handlePrivateKeyDropzoneClick = useCallback(() => {
    privateKeyFileInputRef.current?.click()
  }, [])

  const handlePrivateKeyDropzoneKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return
      }
      event.preventDefault()
      handlePrivateKeyDropzoneClick()
    },
    [handlePrivateKeyDropzoneClick]
  )

  const onSubmit = async (data: GitHubAppCredentialsFormData) => {
    try {
      setIsSubmitting(true)

      await saveCredentials.mutateAsync({
        app_id: data.app_id,
        private_key: data.private_key,
        webhook_secret: data.webhook_secret || undefined,
        client_id: data.client_id || undefined,
      })

      const action = hasStoredCredentials ? "updated" : "registered"
      toast({
        title: `GitHub 应用已成功${action}`,
        description: `GitHub 应用凭据已${action}。`,
      })

      // Clear sensitive data from form
      privateKeyReadIdRef.current += 1
      form.setValue("private_key", "")
      setPrivateKeyFileName(null)
      resetPrivateKeyFileInput()
      if (data.webhook_secret) {
        form.setValue("webhook_secret", "")
      }

      onSuccess?.()
    } catch (error) {
      console.error("Failed to save GitHub App credentials:", error)
      toast({
        title: "错误",
        description:
          error instanceof Error ? error.message : "保存 GitHub 应用凭据失败",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const buttonLabel = hasStoredCredentials ? "保存更改" : "保存凭据"

  const containerClass = className ? `space-y-4 ${className}` : "space-y-4"

  return (
    <div className={containerClass}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
          <div className="space-y-8">
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="app_id"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>GitHub 应用 ID *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="123456"
                        className="max-w-md"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      在 GitHub → Settings → GitHub Apps 中查找
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="private_key"
                render={({ field, fieldState }) => {
                  return (
                    <FormItem className="space-y-2">
                      <FormLabel>私钥 *</FormLabel>
                      <input
                        ref={privateKeyFileInputRef}
                        type="file"
                        accept=".pem"
                        className="hidden"
                        onChange={handlePrivateKeyInputChange}
                      />
                      <div
                        data-testid="github-app-private-key-dropzone"
                        role="button"
                        tabIndex={0}
                        aria-label={"选择 GitHub 应用私钥 PEM 文件"}
                        onClick={handlePrivateKeyDropzoneClick}
                        onKeyDown={handlePrivateKeyDropzoneKeyDown}
                        onDrop={handlePrivateKeyDrop}
                        onDragEnter={handlePrivateKeyDragOver}
                        onDragOver={handlePrivateKeyDragOver}
                        onDragLeave={handlePrivateKeyDragLeave}
                        className={cn(
                          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed px-4 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
                          fieldState.invalid &&
                            "border-destructive/80 bg-destructive/5",
                          !fieldState.invalid &&
                            isPrivateKeyDragOver &&
                            "border-primary/60 bg-primary/5",
                          !fieldState.invalid &&
                            !isPrivateKeyDragOver &&
                            "border-muted-foreground/30 bg-muted/40 hover:border-muted-foreground/50"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-10 items-center justify-center rounded-full transition-colors",
                            isPrivateKeyDragOver
                              ? "bg-primary/10 text-primary"
                              : "bg-muted-foreground/10 text-muted-foreground"
                          )}
                        >
                          {privateKeyFileName ? (
                            <FileTextIcon className="size-5" />
                          ) : (
                            <UploadCloudIcon className="size-5" />
                          )}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          {privateKeyFileName ? (
                            <>
                              <p className="text-sm font-medium">
                                {privateKeyFileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                点击替换，或在下方粘贴
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-medium">
                                将 .pem 文件拖到此处，或{" "}
                                <span className="text-primary">点击浏览</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                也可以在下方粘贴
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <FormControl>
                        <Textarea
                          {...field}
                          onChange={(event) => {
                            privateKeyReadIdRef.current += 1
                            setPrivateKeyFileName(null)
                            form.clearErrors("private_key")
                            field.onChange(event)
                          }}
                          placeholder={`-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1Xq8z2vY3kHnPbW9pJ4rT5sU6wK
9bV3nHpQ7rTaB4eYhN2dWfL5mC8xR1oZ0gD7uF6iX3c
…
hQ4kR2bJ8nVwPzL0aXmS9tE1yU6sJ0oZ4eY7dWfL5mC
-----END RSA PRIVATE KEY-----`}
                          className="h-32 font-mono text-xs"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              <FormField
                control={form.control}
                name="webhook_secret"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Webhook 密钥（可选）</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder={"输入 Webhook 密钥"}
                        className="max-w-md"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      仅在 GitHub 中配置了 Webhook 密钥时需要
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>客户端 ID（可选）</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Iv1.abc123def456"
                        className="max-w-md"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      在 GitHub 中与应用 ID 一同显示
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || saveCredentials.isPending}
              className="min-w-32"
            >
              {isSubmitting || saveCredentials.isPending
                ? "保存中…"
                : buttonLabel}
            </Button>
          </div>
        </form>
      </Form>

      {saveCredentials.isError && (
        <AlertNotification
          level="error"
          message={
            saveCredentials.error instanceof Error
              ? saveCredentials.error.message
              : "保存 GitHub 应用凭据失败"
          }
        />
      )}
    </div>
  )
}
