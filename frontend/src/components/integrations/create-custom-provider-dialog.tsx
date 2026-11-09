"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { MultiTagCommandInput } from "@/components/tags-input"
import { Button, type ButtonProps } from "@/components/ui/button"
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCreateCustomProvider } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useWorkspaceId } from "@/providers/workspace-id"

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: "名称至少需要 3 个字符" })
    .max(120, { message: "名称不能超过 120 个字符" }),
  description: z
    .string()
    .trim()
    .max(512, { message: "描述不能超过 512 个字符" })
    .optional()
    .or(z.literal("")),
  grant_type: z.enum(["authorization_code", "client_credentials"]),
  client_id: z
    .string()
    .trim()
    .min(1, { message: "客户端 ID 不能为空" })
    .max(512, { message: "客户端 ID 不能超过 512 个字符" }),
  client_secret: z
    .string()
    .trim()
    .max(16384, { message: "客户端密钥过长" })
    .optional()
    .or(z.literal("")),
  authorization_endpoint: z
    .string()
    .trim()
    .url({ message: "请输入有效的 HTTPS URL" })
    .refine((value) => value.toLowerCase().startsWith("https://"), {
      message: "授权端点必须使用 HTTPS",
    }),
  token_endpoint: z
    .string()
    .trim()
    .url({ message: "请输入有效的 HTTPS URL" })
    .refine((value) => value.toLowerCase().startsWith("https://"), {
      message: "令牌端点必须使用 HTTPS",
    }),
  scopes: z.array(z.string().trim().min(1)).optional(),
})

type CustomProviderFormValues = z.infer<typeof formSchema>

const DEFAULT_VALUES: CustomProviderFormValues = {
  name: "",
  description: "",
  grant_type: "authorization_code",
  client_id: "",
  client_secret: "",
  authorization_endpoint: "",
  token_endpoint: "",
  scopes: [],
}

const GRANT_OPTIONS = [
  {
    value: "authorization_code" as const,
    title: "委托访问",
    description: "用户通过 OAuth 登录授权访问。",
  },
  {
    value: "client_credentials" as const,
    title: "客户端凭据",
    description: "使用令牌进行服务器间访问。",
  },
]

export function CreateCustomProviderDialog({
  triggerProps,
  onOpenChange,
  open: controlledOpen,
  hideTrigger = false,
}: {
  triggerProps?: ButtonProps
  onOpenChange?: (open: boolean) => void
  open?: boolean
  hideTrigger?: boolean
}) {
  const workspaceId = useWorkspaceId()
  const { createCustomProvider, createCustomProviderIsPending } =
    useCreateCustomProvider(workspaceId)
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const { className: triggerClassName, ...restTriggerProps } =
    triggerProps ?? {}

  const form = useForm<CustomProviderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const grantType = form.watch("grant_type")

  const resetForm = () => {
    form.reset(DEFAULT_VALUES)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const onSubmit = async (values: CustomProviderFormValues) => {
    await createCustomProvider({
      name: values.name,
      description: values.description?.trim() || undefined,
      grant_type: values.grant_type,
      client_id: values.client_id,
      client_secret: values.client_secret?.trim() || undefined,
      authorization_endpoint: values.authorization_endpoint,
      token_endpoint: values.token_endpoint,
      scopes: values.scopes ?? [],
    })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className={cn("h-7 bg-background", triggerClassName)}
            {...restTriggerProps}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            添加自定义 OAuth 提供商
          </Button>
        </DialogTrigger>
      )}
      <DialogContent size="lg" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加自定义 OAuth 提供商</DialogTitle>
          <DialogDescription>
            使用客户端凭据或委托授权配置自定义 OAuth 提供商。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>提供商名称</FormLabel>
                    <FormControl>
                      <Input placeholder={"我的安全平台"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea placeholder={"此提供商的可选描述"} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      显示在此工作空间的集成列表中。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grant_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>授权类型</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={"选择授权类型"}>
                            {field.value
                              ? GRANT_OPTIONS.find(
                                  (opt) => opt.value === field.value
                                )?.title
                              : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {GRANT_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              textValue={option.title}
                            >
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium">
                                  {option.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {option.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription className="text-xs">
                      选择 Tracecat 向此提供商进行身份验证的方式。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>客户端 ID</FormLabel>
                      <FormControl>
                        <Input placeholder={"客户端 ID"} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="client_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        客户端密钥{" "}
                        {grantType === "authorization_code" && (
                          <span className="text-xs text-muted-foreground">
                            （可选）
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={"客户端密钥"}
                          type="password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="authorization_endpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>授权端点</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/oauth2/authorize"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="token_endpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>令牌端点</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/oauth2/token"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scopes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>权限范围</FormLabel>
                    <FormControl>
                      <MultiTagCommandInput
                        value={field.value ?? []}
                        onChange={field.onChange}
                        suggestions={[]}
                        searchKeys={["label", "value"]}
                        allowCustomTags
                        placeholder={"添加权限范围"}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      提供默认请求的 OAuth 权限范围。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button
                size="sm"
                type="submit"
                className="gap-2"
                disabled={createCustomProviderIsPending}
              >
                {createCustomProviderIsPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                保存提供商
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
