"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { DialogProps } from "@radix-ui/react-dialog"
import { PlusCircle, SaveIcon, Trash2Icon } from "lucide-react"
import React, { type PropsWithChildren, useCallback } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import type { VariableReadMinimal, VariableUpdate } from "@/client"
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
import { useManagedResources } from "@/hooks/use-managed-resources"
import { useWorkspaceVariables } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

interface EditVariableDialogProps
  extends PropsWithChildren<
    DialogProps & React.HTMLAttributes<HTMLDivElement>
  > {
  selectedVariable: VariableReadMinimal | null
  setSelectedVariable: (selectedVariable: VariableReadMinimal | null) => void
}

const updateVariableFormSchema = z.object({
  name: z.string().optional(),
  description: z.string().max(255).optional(),
  environment: z.string().optional(),
  values: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
    })
  ),
})

type UpdateVariableFormData = z.infer<typeof updateVariableFormSchema>

export function EditVariableDialog({
  selectedVariable,
  setSelectedVariable,
  children,
  className,
  ...props
}: EditVariableDialogProps) {
  const workspaceId = useWorkspaceId()
  const { updateVariableById } = useWorkspaceVariables(workspaceId, {
    listEnabled: false,
  })
  // A managed variable only accepts new values for its existing keys.
  const { isManaged, isLoading: managedLoading } =
    useManagedResources(workspaceId)
  const valuesOnly = isManaged("variable", selectedVariable?.id)

  const methods = useForm<UpdateVariableFormData>({
    resolver: zodResolver(updateVariableFormSchema),
    defaultValues: {
      name: "",
      description: "",
      environment: "",
      values: [],
    },
  })
  const { control, register, reset } = methods

  React.useEffect(() => {
    if (selectedVariable) {
      reset({
        name: "",
        description: "",
        environment: "",
        values: Object.entries(selectedVariable.values).map(([key, value]) => ({
          key,
          value:
            typeof value === "object" ? JSON.stringify(value) : String(value),
        })),
      })
    }
  }, [selectedVariable, reset])

  const onSubmit = useCallback(
    async (formValues: UpdateVariableFormData) => {
      if (!selectedVariable) {
        console.error("No variable selected")
        return
      }
      // Convert the array of {key, value} to a dict
      const valuesDict =
        formValues.values && formValues.values.length > 0
          ? Object.fromEntries(
              formValues.values.map(({ key, value }) => [key, value])
            )
          : undefined

      // Remove unset values from the params object
      // We consider empty strings as unset values
      const params: VariableUpdate = {
        name: formValues.name || undefined,
        description: formValues.description || undefined,
        environment: formValues.environment || undefined,
        values: valuesDict,
      }
      try {
        await updateVariableById({
          variableId: selectedVariable.id,
          params,
        })
      } catch (error) {
        console.error(error)
      }
      methods.reset()
      setSelectedVariable(null) // Only unset the selected variable after the form has been submitted
    },
    [selectedVariable, setSelectedVariable, updateVariableById, methods]
  )

  const onValidationFailed = (errors: unknown) => {
    console.error("Form validation failed", errors)
    toast({
      title: "表单校验失败",
      description: "编辑变量时发生校验错误。",
    })
  }

  const { fields, append, remove } = useFieldArray<UpdateVariableFormData>({
    control,
    name: "values",
  })

  return (
    <Dialog {...props}>
      {children}
      <DialogContent size="lg" className={className}>
        <DialogHeader>
          <DialogTitle>编辑变量</DialogTitle>
          <DialogDescription className="flex flex-col">
            <span>
              {valuesOnly
                ? "由 Tracecat 托管，仅可修改值。"
                : "字段留空可保留现有值，更新时必须一次提交所有值。"}
            </span>
          </DialogDescription>
        </DialogHeader>
        <Form {...methods}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={methods.handleSubmit(onSubmit, onValidationFailed)}
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
                        placeholder={selectedVariable?.name || "名称"}
                        disabled={valuesOnly}
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
                        placeholder={selectedVariable?.description || "描述"}
                        disabled={valuesOnly}
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
                    <FormLabel className="text-sm">环境</FormLabel>
                    <FormControl>
                      <Input
                        className="text-sm"
                        placeholder={selectedVariable?.environment || "环境"}
                        disabled={valuesOnly}
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
              <FormItem>
                <FormLabel className="text-sm">值</FormLabel>

                {fields.length > 0 &&
                  fields.map((valuesItem, index) => (
                    <div
                      key={valuesItem.id}
                      className="flex items-center justify-between"
                    >
                      <FormField
                        key={`values.${index}.key`}
                        control={control}
                        name={`values.${index}.key`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                id={`key-${index}`}
                                className="text-sm"
                                placeholder={"键"}
                                readOnly={valuesOnly}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        key={`values.${index}.value`}
                        control={control}
                        name={`values.${index}.value`}
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-col space-y-2">
                              <FormControl>
                                <Input
                                  id={`value-${index}`}
                                  className="text-sm"
                                  placeholder={"值"}
                                  type="text"
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
                        disabled={valuesOnly}
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
                disabled={valuesOnly}
                onClick={() => append({ key: "", value: "" })}
                className="w-full space-x-2 text-xs text-foreground/80"
              >
                <PlusCircle className="mr-2 size-4" />
                添加条目
              </Button>
              {fields.length === 0 && (
                <span className="text-xs text-foreground/50">
                  值将保持不变。
                </span>
              )}
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                {/* Wait for the managed lookup so locked fields are known. */}
                <Button size="sm" type="submit" disabled={managedLoading}>
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

export const EditVariableDialogTrigger = DialogTrigger
