"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { BracesIcon, ChevronDownIcon, UserCircle2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { workflowsCreateWorkflow } from "@/client"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useWorkspaceId } from "@/providers/workspace-id"

const formSchema = z.object({
  file: z.instanceof(File).refine((file) => file.size <= 5000000, {
    message: "文件大小必须小于 5MB。",
  }),
})

type FormValues = z.infer<typeof formSchema>
export function WorkspaceManagementButton() {
  const router = useRouter()
  const workspaceId = useWorkspaceId()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  })
  const handleCreateWorkflow = async () => {
    try {
      const response = await workflowsCreateWorkflow({ workspaceId })
      router.push(`/workflows/${response.id}`)
    } catch (error) {
      console.error("Error creating workflow:", error)
    }
  }

  const onSubmit = async (data: FormValues) => {
    try {
      const response = await workflowsCreateWorkflow({
        workspaceId,
        formData: {
          file: new Blob([data.file], { type: "application/yaml" }),
        },
      })
      router.push(`/workflows/${response.id}`)
    } catch (error) {
      console.error("Error creating workflow:", error)
    }
  }

  return (
    <Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            role="combobox"
            className="items-center space-x-2 bg-emerald-500 text-white shadow-sm hover:bg-emerald-500"
          >
            <span>管理工作空间</span>
            <ChevronDownIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 text-xs" align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={async () => await handleCreateWorkflow()}
            >
              添加成员
              <DropdownMenuShortcut>
                <UserCircle2Icon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DialogTrigger asChild>
              <DropdownMenuItem>
                从 YAML 导入
                <DropdownMenuShortcut>
                  <BracesIcon className="size-4" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            </DialogTrigger>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent size="sm" className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>从文件导入工作流</DialogTitle>
          <DialogDescription>从 YAML 文件导入工作流。</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>文件</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        className="min-h-9 py-2"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            field.onChange(file)
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>上传文件（最大 5MB）</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button size="sm" type="submit">
                上传
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
