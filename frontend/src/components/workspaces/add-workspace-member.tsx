"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  ApiError,
  type UserSearchRead,
  usersSearchUser,
  type WorkspaceRead,
} from "@/client"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useWorkspaceMutations } from "@/hooks/use-workspace"
import { getApiErrorDetail } from "@/lib/errors"
import { useRbacRoles } from "@/lib/hooks"

/** Role granted on the workspace, matching direct membership creation. */
const DEFAULT_WORKSPACE_ROLE_SLUG = "workspace-editor"

const addMemberSchema = z.object({
  email: z.string().email("邮箱地址无效"),
})
type AddMemberValues = z.infer<typeof addMemberSchema>

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/**
 * Header button for adding workspace members. Always visible; users without
 * an invite scope get a neutral toast instead of the dialog.
 */
export function AddWorkspaceMember({
  workspace,
}: {
  workspace: WorkspaceRead
}) {
  const canAddWorkspaceMembers = useScopeCheck("workspace:member:invite")
  const canInviteOrgMembers = useScopeCheck("org:member:invite")
  const scopesLoading =
    canAddWorkspaceMembers === undefined || canInviteOrgMembers === undefined
  const canAddMembers =
    canAddWorkspaceMembers === true || canInviteOrgMembers === true
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    if (scopesLoading) {
      return
    }
    if (!canAddMembers) {
      toast({
        title: "权限不足",
        description:
          "你没有向此工作空间添加成员的权限，请联系工作空间或组织管理员。",
      })
      return
    }
    setOpen(true)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 bg-background"
        onClick={handleClick}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        添加成员
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm" className="w-[calc(100%-2rem)] max-w-lg">
          {/* Mounted only while open so its queries stay idle when closed. */}
          {open && (
            <AddWorkspaceMemberForm
              workspace={workspace}
              canInviteOrgMembers={canInviteOrgMembers === true}
              onOpenChange={setOpen}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function AddWorkspaceMemberForm({
  workspace,
  canInviteOrgMembers,
  onOpenChange,
}: {
  workspace: WorkspaceRead
  canInviteOrgMembers: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { addMember, inviteMember } = useWorkspaceMutations()
  const { roles, isLoading: rolesLoading } = useRbacRoles({
    enabled: canInviteOrgMembers,
  })
  const form = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: "" },
  })

  const inviteToOrganization = async (email: string) => {
    const workspaceRole = roles?.find(
      (role) => role.slug === DEFAULT_WORKSPACE_ROLE_SLUG
    )
    if (!workspaceRole) {
      form.setError("email", {
        message: "无法加载邀请此用户所需的工作空间编辑者角色。",
      })
      return
    }
    await inviteMember({
      email,
      grants: [{ workspace_id: workspace.id, role_id: workspaceRole.id }],
    })
    toast({
      title: "邀请已发送",
      description: `已邀请 ${email} 加入组织，并授予 ${workspace.name} 的访问权限。`,
    })
    onOpenChange(false)
  }

  const onSubmit = async ({ email }: AddMemberValues) => {
    try {
      let user: UserSearchRead | null = null
      try {
        user = await usersSearchUser({ email, workspaceId: workspace.id })
      } catch (error) {
        if (!isNotFound(error)) {
          throw error
        }
      }

      if (user) {
        try {
          await addMember({
            workspaceId: workspace.id,
            requestBody: { user_id: user.id },
          })
          toast({
            title: "已添加成员",
            description: `已将 ${email} 添加到 ${workspace.name}。`,
          })
          onOpenChange(false)
          return
        } catch (error) {
          // 404 means the account exists but is outside this organization.
          if (!isNotFound(error)) {
            throw error
          }
        }
      }

      if (!canInviteOrgMembers) {
        form.setError("email", {
          message: "此用户不在组织中，请联系组织管理员邀请。",
        })
        return
      }
      await inviteToOrganization(email)
    } catch (error) {
      console.error("Failed to add workspace member", error)
      form.setError("email", {
        message: getApiErrorDetail(error) ?? "无法完成请求。",
      })
    }
  }

  const isSubmitting = form.formState.isSubmitting
  const submitDisabled = isSubmitting || (canInviteOrgMembers && rolesLoading)

  return (
    <>
      <DialogHeader>
        <DialogTitle>添加工作空间成员</DialogTitle>
        <DialogDescription>
          {canInviteOrgMembers
            ? `向 ${workspace.name} 添加用户。尚未加入组织的用户会收到组织邀请，并获得此工作空间的编辑者角色。`
            : `将现有组织成员添加到 ${workspace.name}。`}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="user@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </DialogBody>
          <DialogFooter>
            <Button size="sm" type="submit" disabled={submitDisabled}>
              {isSubmitting ? "添加中…" : "添加成员"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  )
}
