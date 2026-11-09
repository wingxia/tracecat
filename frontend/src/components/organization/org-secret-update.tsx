"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { DialogProps } from "@radix-ui/react-dialog"
import { PlusCircle, SaveIcon, Trash2Icon } from "lucide-react"
import React, { type PropsWithChildren, useCallback } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import type { SecretReadMinimal, SecretUpdate } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useOrgSecrets } from "@/lib/hooks"

interface UpdateOrgSecretDialogProps
  extends PropsWithChildren<
    DialogProps & React.HTMLAttributes<HTMLDivElement>
  > {
  selectedSecret: SecretReadMinimal | null
  setSelectedSecret: (selectedSecret: SecretReadMinimal | null) => void
}

const updateOrgSecretSchema = z.object({
  name: z.string().optional(),
  description: z.string().max(255).optional(),
  environment: z.string().optional(),
  keys: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
})

export function UpdateOrgSecretDialog({
  selectedSecret,
  setSelectedSecret,
  children,
  className,
  ...props
}: UpdateOrgSecretDialogProps) {
  const { updateSecretById } = useOrgSecrets()
  const isSshKey = selectedSecret?.type === "ssh_key"

  const methods = useForm<SecretUpdate>({
    resolver: zodResolver(updateOrgSecretSchema),
    defaultValues: {
      name: "",
      description: "",
      environment: "",
      keys: [],
    },
  })
  const { control, register, reset } = methods

  React.useEffect(() => {
    if (selectedSecret) {
      const secretKeys =
        selectedSecret.type === "ssh_key"
          ? []
          : selectedSecret.keys.map((keyName) => ({
              key: keyName,
              value: "",
            }))
      reset({
        name: "",
        description: "",
        environment: "",
        keys: secretKeys,
      })
    }
  }, [selectedSecret, reset])

  const onSubmit = useCallback(
    async (values: SecretUpdate) => {
      if (!selectedSecret) {
        console.error("No secret selected")
        return
      }
      // Remove unset values from the params object
      // We consider empty strings as unset values
      const params = {
        name: values.name || undefined,
        description: values.description || undefined,
        environment: values.environment || undefined,
        keys: isSshKey ? undefined : values.keys,
      }
      console.log("Submitting edit secret", params)
      try {
        await updateSecretById({
          secretId: selectedSecret.id,
          params,
        })
      } catch (error) {
        console.error(error)
      }
      methods.reset()
      setSelectedSecret(null) // Only unset the selected secret after the form has been submitted
    },
    [selectedSecret, setSelectedSecret]
  )

  const onValidationFailed = (errors: unknown) => {
    console.error("Form validation failed", errors)
    toast({
      title: "表单校验失败",
      description: "编辑密钥时发生校验错误。",
    })
  }

  const { fields, append, remove } = useFieldArray<SecretUpdate>({
    control,
    name: "keys",
  })

  return (
    <Dialog {...props}>
      {children}
      <DialogContent size="lg" className={className}>
        <DialogHeader>
          <DialogTitle>编辑密钥</DialogTitle>
          <DialogDescription className="flex flex-col">
            {isSshKey ? (
              <span>SSH 密钥只能写入一次。要轮换密钥，请删除后重新创建。</span>
            ) : (
              <span>字段留空可保留现有值。更新时必须一次提交所有键。</span>
            )}
          </DialogDescription>
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
                        placeholder={selectedSecret?.name || "名称"}
                        {...register("name")}
                      />
                    </FormControl>
                    <FormMessage />
                    <span className="text-xs text-foreground/50">
                      {!methods.watch("name") && "名称保持不变。"}
                    </span>
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
                    <FormControl>
                      <Input
                        className="text-sm"
                        placeholder={selectedSecret?.description || "描述"}
                        {...register("description")}
                      />
                    </FormControl>
                    <FormMessage />
                    <span className="text-xs text-foreground/50">
                      {!methods.watch("description") && "描述保持不变。"}
                    </span>
                  </FormItem>
                )}
              />
              <FormField
                key="environment"
                control={control}
                name="environment"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm">描述</FormLabel>
                    <FormControl>
                      <Input
                        className="text-sm"
                        placeholder={selectedSecret?.environment || "环境"}
                        {...register("environment")}
                      />
                    </FormControl>
                    <FormMessage />
                    <span className="text-xs text-foreground/50">
                      {!methods.watch("environment") && "环境保持不变。"}
                    </span>
                  </FormItem>
                )}
              />
              {!isSshKey && (
                <>
                  <FormItem>
                    <FormLabel className="text-sm">键</FormLabel>

                    {fields.length > 0 &&
                      fields.map((keysItem, index) => (
                        <div
                          key={keysItem.id}
                          className="flex items-center justify-between"
                        >
                          <FormField
                            key={`keys.${index}.key`}
                            control={control}
                            name={`keys.${index}.key`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    id={`key-${index}`}
                                    className="text-sm"
                                    placeholder={"键"}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            key={`keys.${index}.value`}
                            control={control}
                            name={`keys.${index}.value`}
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex flex-col space-y-2">
                                  <FormControl>
                                    <Input
                                      id={`value-${index}`}
                                      className="text-sm"
                                      placeholder="••••••••••••••••"
                                      type="password"
                                      {...field}
                                    />
                                  </FormControl>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => remove(index)}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                  </FormItem>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ key: "", value: "" })}
                    className="w-full space-x-2 text-xs text-foreground/80"
                  >
                    <PlusCircle className="mr-2 size-4" />
                    添加条目
                  </Button>
                  {fields.length === 0 && (
                    <span className="text-xs text-foreground/50">
                      密钥将保持不变。
                    </span>
                  )}
                </>
              )}
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button size="sm" type="submit">
                  <SaveIcon className="mr-2 size-4" />
                  保存
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export const UpdateOrgSecretDialogTrigger = DialogTrigger
