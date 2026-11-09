"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useAdminOrganization } from "@/hooks/use-admin"

const formSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(100, "名称过长"),
  slug: z
    .string()
    .min(1, "标识不能为空")
    .max(50, "标识过长")
    .regex(/^[a-z0-9-]+$/, "标识只能包含小写字母、数字和连字符"),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface AdminOrganizationEditDialogProps {
  orgId: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AdminOrganizationEditDialog({
  orgId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: AdminOrganizationEditDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const dialogOpen = isControlled ? controlledOpen : internalOpen
  const setDialogOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }
  const { organization, isLoading, updateOrganization, updatePending } =
    useAdminOrganization(orgId)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      is_active: true,
    },
  })

  useEffect(() => {
    if (organization && dialogOpen) {
      form.reset({
        name: organization.name,
        slug: organization.slug,
        is_active: organization.is_active,
      })
    }
  }, [organization, form, dialogOpen])

  const onSubmit = async (values: FormValues) => {
    try {
      await updateOrganization(values)
      toast({
        title: "已更新组织",
        description: "已保存更改。",
      })
      setDialogOpen(false)
    } catch (error) {
      console.error("Failed to update organization", error)
      toast({
        title: "更新组织失败",
        description: "请重试。",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent size="md" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑组织</DialogTitle>
          <DialogDescription>
            更新组织详情
            {organization ? `（${organization.name}）。` : "."}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">加载中…</div>
        ) : !organization ? (
          <div className="py-8 text-center text-muted-foreground">
            未找到组织。
          </div>
        ) : (
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
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        组织的唯一标识，用于 URL。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">已启用</FormLabel>
                      <FormDescription className="ml-4">
                        用户无法访问已停用的组织。
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </DialogBody>
              <DialogFooter>
                <Button size="sm" type="submit" disabled={updatePending}>
                  {updatePending ? "保存中…" : "保存更改"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
