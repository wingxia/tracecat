"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  BracesIcon,
  ChevronDownIcon,
  FolderIcon,
  Plus,
  PlusCircleIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import YAML from "yaml"
import { z } from "zod"
import { ApiError } from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { getApiErrorDetail, type TracecatApiError } from "@/lib/errors"
import { useFolders, useWorkflowManager } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

const importFormSchema = z.object({
  file: z.instanceof(File).refine((file) => file.size <= 5000000, {
    message: "文件大小必须小于 5MB。",
  }),
  use_workflow_id: z.boolean().default(false),
})

type ImportFormValues = z.infer<typeof importFormSchema>

function ImportWorkflowDialog({
  open,
  onOpenChange,
  workspaceId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
}) {
  const router = useRouter()
  const [validationErrors, setValidationErrors] = useState<string | null>(null)
  const { createWorkflow } = useWorkflowManager(undefined, {
    listEnabled: false,
  })

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema),
    defaultValues: {
      use_workflow_id: false,
    },
  })

  const onSubmit = async (data: ImportFormValues) => {
    try {
      const { file, use_workflow_id } = data
      const contentType = file.type
      const response = await createWorkflow({
        workspaceId,
        formData: {
          file: new Blob([file], { type: contentType }),
          use_workflow_id,
        },
      })
      router.push(`/workspaces/${workspaceId}/workflows/${response.id}`)
    } catch (error) {
      if (error instanceof ApiError) {
        const apiError = error as TracecatApiError
        switch (apiError.status) {
          case 400:
            console.error("Bad request:", apiError)
            form.setError("file", {
              message: "上传的工作流 YAML / JSON 无效。",
            })

            setValidationErrors(
              YAML.stringify(YAML.parse(String(apiError.body.detail)))
            )
            break
          case 409:
            console.error("Conflict:", apiError)
            form.setError("file", {
              message:
                "已存在相同 ID 的工作流。请取消勾选“使用文件中的工作流 ID”、删除现有工作流、移除文件中的 ID，或上传使用其他 ID 的文件。",
            })
            break
          default:
            console.error("Unexpected error:", apiError)
        }
      } else {
        console.error("Unexpected error:", error)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>从文件导入工作流</DialogTitle>
          <DialogDescription>
            从 YAML 或 JSON 文件导入工作流。
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Form {...form}>
            <form
              id={IMPORT_WORKFLOW_FORM_ID}
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8"
            >
              <FormField
                control={form.control}
                name="file"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YAML / JSON</FormLabel>
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

              <FormField
                control={form.control}
                name="use_workflow_id"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>使用文件中的工作流 ID</FormLabel>
                      <FormDescription>
                        勾选后使用 YAML/JSON 文件提供的工作流 ID，否则生成新
                        ID。
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          {validationErrors && (
            <div className="flex h-36 flex-col space-y-2 overflow-auto rounded-md border border-rose-500 bg-rose-100 p-2 font-mono text-xs text-rose-600">
              <span className="font-semibold">校验错误</span>
              <Separator className="bg-rose-400" />
              <pre>{validationErrors}</pre>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button size="sm" type="submit" form={IMPORT_WORKFLOW_FORM_ID}>
            上传
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const folderFormSchema = z.object({
  name: z.string().min(1, "文件夹名称不能为空"),
})

type FolderFormValues = z.infer<typeof folderFormSchema>

function CreateFolderDialog({
  open,
  onOpenChange,
  workspaceId,
  currentFolderPath,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  currentFolderPath: string | null
}) {
  const { createFolder } = useFolders(workspaceId, { enabled: open })

  const form = useForm<FolderFormValues>({
    resolver: zodResolver(folderFormSchema),
    defaultValues: {
      name: "",
    },
  })

  const handleCreateFolder = async (data: FolderFormValues) => {
    try {
      await createFolder({
        name: data.name.trim(),
        parent_path: currentFolderPath || "/",
      })
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.log("Error creating folder:", error)
      const detail = getApiErrorDetail(error)
      form.setError("name", {
        message: detail ?? "文件夹已存在或发生其他错误。",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>创建文件夹</DialogTitle>
          <DialogDescription>创建文件夹来整理工作流。</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleCreateFolder)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>文件夹名称</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={"输入文件夹名称"}
                        {...field}
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button size="sm" type="submit">
                创建文件夹
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// Main Create Workflow Button Component
const IMPORT_WORKFLOW_FORM_ID = "import-workflow-form"

export function CreateWorkflowButton({
  view,
  currentFolderPath,
}: {
  view: "default" | "folders"
  currentFolderPath: string | null
}) {
  const router = useRouter()
  const workspaceId = useWorkspaceId()
  const canCreateWorkflow = useScopeCheck("workflow:create")
  const { createWorkflow, moveWorkflow } = useWorkflowManager(undefined, {
    listEnabled: false,
  })
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)

  if (canCreateWorkflow !== true) {
    return null
  }

  const handleCreateWorkflow = async () => {
    try {
      const response = await createWorkflow({ workspaceId })
      await moveWorkflow({
        workflowId: response.id,
        workspaceId,
        requestBody: {
          folder_path: currentFolderPath,
        },
      })

      router.push(`/workspaces/${workspaceId}/workflows/${response.id}`)
    } catch (error) {
      console.log("Error creating workflow:", error)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 bg-background">
            <Plus className="mr-1 h-3.5 w-3.5" />
            创建
            <ChevronDownIcon className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="
            [&_[data-radix-collection-item]]:flex
            [&_[data-radix-collection-item]]:items-center
            [&_[data-radix-collection-item]]:gap-2
          "
        >
          <DropdownMenuItem onSelect={handleCreateWorkflow}>
            <PlusCircleIcon className="size-4 text-foreground/80" />
            <div className="flex flex-col text-xs">
              <span>工作流</span>
              <span className="text-xs text-muted-foreground">从头开始</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setImportDialogOpen(true)}>
            <BracesIcon className="size-4 text-foreground/80" />
            <div className="flex flex-col text-xs">
              <span>从 YAML / JSON 导入</span>
              <span className="text-xs text-muted-foreground">
                导入工作流文件
              </span>
            </div>
          </DropdownMenuItem>
          {view === "folders" && (
            <DropdownMenuItem onSelect={() => setFolderDialogOpen(true)}>
              <FolderIcon className="size-4 text-foreground/80" />
              <div className="flex flex-col text-xs">
                <span>文件夹</span>
                <span className="text-xs text-muted-foreground">
                  工作流分组
                </span>
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportWorkflowDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        workspaceId={workspaceId}
      />

      <CreateFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        workspaceId={workspaceId}
        currentFolderPath={currentFolderPath}
      />
    </>
  )
}
