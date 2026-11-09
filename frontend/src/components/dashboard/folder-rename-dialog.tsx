"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { FolderDirectoryItem } from "@/client"
import { Spinner } from "@/components/loading/spinner"
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
import { useFolders } from "@/lib/hooks"
import { useWorkspaceId } from "@/providers/workspace-id"

const renameFolderSchema = z.object({
  name: z
    .string()
    .min(1, "名称不能为空")
    .max(100, "名称不能超过 100 个字符")
    .regex(
      /^[a-zA-Z0-9_\-\s]+$/,
      "名称只能包含字母、数字、空格、下划线和连字符"
    ),
})

type RenameFolderSchema = z.infer<typeof renameFolderSchema>

export function FolderRenameDialog({
  open,
  onOpenChange,
  selectedFolder,
  setSelectedFolder,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedFolder: FolderDirectoryItem | null
  setSelectedFolder: (selectedFolder: FolderDirectoryItem | null) => void
}) {
  const workspaceId = useWorkspaceId()
  const { updateFolder, updateFolderIsPending } = useFolders(workspaceId, {
    enabled: open,
  })

  const form = useForm<RenameFolderSchema>({
    resolver: zodResolver(renameFolderSchema),
    defaultValues: {
      name: selectedFolder?.name || "",
    },
  })

  // Update form when selectedFolder changes
  useEffect(() => {
    if (selectedFolder) {
      form.reset({
        name: selectedFolder.name,
      })
    }
  }, [selectedFolder, form])

  const onSubmit = async (data: RenameFolderSchema) => {
    if (!selectedFolder) return

    try {
      await updateFolder({
        folderId: selectedFolder.id,
        name: data.name,
      })
      setSelectedFolder(null)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to rename folder:", error)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedFolder(null)
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>重命名文件夹</DialogTitle>
          <DialogDescription>输入文件夹的新名称。</DialogDescription>
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
                    <FormLabel className="flex items-center gap-2 text-xs">
                      名称
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>文件夹的新名称。</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button size="sm" type="submit" disabled={updateFolderIsPending}>
                {updateFolderIsPending ? (
                  <Spinner />
                ) : (
                  <Pencil className="mr-2 size-4" />
                )}
                重命名文件夹
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export const RenameFolderDialogTrigger = DialogTrigger
