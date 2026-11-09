"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { DialogProps } from "@radix-ui/react-dialog"
import { KeyRoundIcon } from "lucide-react"
import React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { SecretCreate } from "@/client"
import { sshKeyRegex } from "@/components/ssh-keys/ssh-key-utils"
import { SshPrivateKeyField } from "@/components/ssh-keys/ssh-private-key-field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
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
import { toast } from "@/components/ui/use-toast"

interface FieldConfig {
  defaultValue?: string
  disabled?: boolean
}

interface CreateSSHKeyDialogProps
  extends DialogProps,
    React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  /** Saves the key. The dialog closes only after this resolves. */
  handler: (params: SecretCreate) => void | Promise<void>
  fieldConfig?: {
    name?: FieldConfig
    description?: FieldConfig
    environment?: FieldConfig
  }
  /** Dialog heading. Defaults to "Create SSH key". */
  title?: string
  /** Copy under the heading. */
  description?: string
  /** Submit button label. Defaults to "Create SSH key". */
  submitLabel?: string
}
const createSSHKeySchema = z.object({
  name: z.string().default(""),
  description: z.string().max(255).default(""),
  environment: z
    .string()
    .nullable()
    .transform((val) => val || "default"), // "default" if null or empty
  private_key: z
    .string()
    .min(1, "SSH 私钥不能为空")
    .refine(
      (key) => sshKeyRegex.test(key),
      "SSH 私钥格式无效，必须使用包含正确头尾标记的 PEM 格式。"
    ),
})
type CreateSSHKeyForm = z.infer<typeof createSSHKeySchema>

export function CreateSSHKeyDialog({
  children,
  className,
  handler,
  fieldConfig,
  title = "创建 SSH 密钥",
  description = "创建用于访问私有动作注册表的新 SSH 密钥。",
  submitLabel = "创建 SSH 密钥",
  open,
  onOpenChange,
}: CreateSSHKeyDialogProps) {
  // Uncontrolled by default; pass `open` + `onOpenChange` to drive it from a menu item.
  const [internalOpen, setInternalOpen] = React.useState(false)
  const showDialog = open ?? internalOpen
  const setShowDialog = onOpenChange ?? setInternalOpen

  const methods = useForm<CreateSSHKeyForm>({
    mode: "onChange",
    resolver: zodResolver(createSSHKeySchema),
    defaultValues: {
      name: fieldConfig?.name?.defaultValue || "",
      description: fieldConfig?.description?.defaultValue || "",
      environment: fieldConfig?.environment?.defaultValue || "",
      private_key: "",
    },
  })
  const {
    control,
    register,
    formState: { isSubmitting },
  } = methods

  const onSubmit = async (values: CreateSSHKeyForm) => {
    const { private_key, ...rest } = values
    const secret: SecretCreate = {
      type: "ssh_key",
      keys: [{ key: "PRIVATE_KEY", value: private_key }],
      ...rest,
    }
    try {
      await handler(secret)
    } catch (error) {
      // Keep the dialog open so the user can retry.
      console.error(error)
      return
    }
    methods.reset()
    setShowDialog(false)
  }
  const onValidationFailed = () => {
    console.error("Form validation failed")
    toast({
      title: "表单校验失败",
      description: "添加新密钥时发生校验错误。",
    })
  }
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      {children}
      <DialogContent size="md" className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <div className="flex text-sm leading-relaxed text-muted-foreground">
            <span>{description}</span>
          </div>
        </DialogHeader>
        <Form {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit, onValidationFailed)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <FormField
                key="name"
                control={control}
                name="name"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm">名称</FormLabel>
                    <FormControl>
                      <Input
                        className="text-sm"
                        placeholder={"名称（蛇形命名）"}
                        disabled={fieldConfig?.name?.disabled}
                        {...register("name")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                key="description"
                control={control}
                name="description"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm">描述</FormLabel>
                    <FormDescription className="text-sm">
                      此密钥的描述。
                    </FormDescription>
                    <FormControl>
                      <Input
                        className="text-sm"
                        placeholder={"描述"}
                        disabled={fieldConfig?.description?.disabled}
                        {...register("description")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                key="environment"
                control={control}
                name="environment"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm">环境</FormLabel>
                    <FormDescription className="text-sm">
                      工作流的目标执行环境。
                    </FormDescription>
                    <FormControl>
                      <Input
                        className="text-sm"
                        placeholder={"默认环境：“default”"}
                        disabled={fieldConfig?.environment?.disabled}
                        {...register("environment")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SshPrivateKeyField
                control={control}
                register={register}
                name="private_key"
              />
            </DialogBody>
            <DialogFooter>
              <Button size="sm" type="submit" disabled={isSubmitting}>
                <KeyRoundIcon className="mr-2 size-4" />
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export const CreateSSHKeyDialogTrigger = DialogTrigger
