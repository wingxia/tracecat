"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
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
import { toast } from "@/components/ui/use-toast"
import { useAdminOrganizations } from "@/hooks/use-admin"
import { useAppInfo } from "@/lib/hooks"

const formSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100, "名称过长"),
  slug: z
    .string()
    .min(1, "标识不能为空")
    .max(50, "标识过长")
    .regex(/^[a-z0-9-]+$/, "标识只能包含小写字母、数字和连字符"),
})

type FormValues = z.infer<typeof formSchema>

export function CreateOrganizationDialog() {
  const [open, setOpen] = useState(false)
  const { appInfo, appInfoIsLoading } = useAppInfo()
  const multiTenantEnabled = appInfo?.ee_multi_tenant === true
  const createDisabled = appInfoIsLoading || !multiTenantEnabled
  const { createOrganization, createPending } = useAdminOrganizations({
    enabled: false,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  })

  const onSubmit = async (values: FormValues) => {
    if (!multiTenantEnabled) {
      toast({
        title: "已禁用组织创建",
        description: "启用多租户模式后才能创建组织。",
        variant: "destructive",
      })
      return
    }

    try {
      await createOrganization(values)
      toast({
        title: "已创建组织",
        description: `已成功创建 ${values.name}。`,
      })
      form.reset()
      setOpen(false)
    } catch (error) {
      console.error("Failed to create organization", error)
      toast({
        title: "创建组织失败",
        description: "请重试。",
        variant: "destructive",
      })
    }
  }

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
    form.setValue("slug", slug)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          disabled={createDisabled}
          title={createDisabled ? "启用多租户模式后才能创建组织。" : undefined}
        >
          <PlusIcon className="mr-2 size-4" />
          创建组织
        </Button>
      </DialogTrigger>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>创建组织</DialogTitle>
          <DialogDescription>在平台上创建新组织。</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={"示例公司"}
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          handleNameChange(e.target.value)
                        }}
                      />
                    </FormControl>
                    <FormDescription>组织的显示名称。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标识</FormLabel>
                    <FormControl>
                      <Input placeholder="acme-inc" {...field} />
                    </FormControl>
                    <FormDescription>
                      组织的唯一标识，用于 URL。
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
                disabled={createPending || createDisabled}
              >
                {createPending ? "创建中…" : "创建组织"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
