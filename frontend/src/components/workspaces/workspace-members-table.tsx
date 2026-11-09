"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { useState } from "react"
import type { WorkspaceMember, WorkspaceRead } from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableToolbarProps,
} from "@/components/data-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"
import {
  useWorkspaceMembers,
  useWorkspaceMutations,
} from "@/hooks/use-workspace"
import { getApiErrorDetail } from "@/lib/errors"

export function WorkspaceMembersTable({
  workspace,
}: {
  workspace: WorkspaceRead
}) {
  const canRemoveMembers = useScopeCheck("workspace:member:remove")
  const [selectedUser, setSelectedUser] = useState<WorkspaceMember | null>(null)
  const { removeMember } = useWorkspaceMutations()
  const { members, membersLoading, membersError } = useWorkspaceMembers(
    workspace.id
  )

  return (
    <AlertDialog
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedUser(null)
        }
      }}
    >
      <DataTable
        data={members}
        isLoading={membersLoading}
        error={membersError}
        columns={[
          {
            accessorKey: "email",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"邮箱"}
              />
            ),
            cell: ({ row }) => (
              <div className="text-xs">
                {row.getValue<WorkspaceMember["email"]>("email")}
              </div>
            ),
            enableSorting: true,
            enableHiding: false,
          },
          {
            accessorKey: "first_name",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"名"}
              />
            ),
            cell: ({ row }) => (
              <div className="text-xs">
                {row.getValue<WorkspaceMember["first_name"]>("first_name") ||
                  "-"}
              </div>
            ),
            enableSorting: true,
            enableHiding: false,
          },
          {
            accessorKey: "last_name",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"姓"}
              />
            ),
            cell: ({ row }) => (
              <div className="text-xs">
                {row.getValue<WorkspaceMember["last_name"]>("last_name") || "-"}
              </div>
            ),
            enableSorting: true,
            enableHiding: false,
          },
          {
            accessorKey: "role_name",
            header: ({ column }) => (
              <DataTableColumnHeader
                className="text-xs"
                column={column}
                title={"角色"}
              />
            ),
            cell: ({ row }) => (
              <div className="flex items-center gap-2 text-xs">
                <span className="capitalize">
                  {row.getValue<string>("role_name")}
                </span>
                {row.original.via_group && (
                  <span className="text-muted-foreground">通过用户组</span>
                )}
              </div>
            ),
            enableSorting: true,
            enableHiding: false,
          },

          {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="size-8 p-0">
                      <span className="sr-only">打开菜单</span>
                      <DotsHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() =>
                        navigator.clipboard.writeText(row.original.user_id)
                      }
                    >
                      复制用户 ID
                    </DropdownMenuItem>

                    {canRemoveMembers && (
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-rose-500 focus:text-rose-600"
                          onClick={() => {
                            setSelectedUser(row.original)
                            console.debug("Selected user", row.original)
                          }}
                        >
                          从工作空间移除
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            },
          },
        ]}
        toolbarProps={defaultToolbarProps}
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>移除用户</AlertDialogTitle>
          <AlertDialogDescription>
            确定要从工作空间移除此用户吗？此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              if (selectedUser) {
                console.log("Removing member", selectedUser)
                try {
                  await removeMember(selectedUser.user_id)
                } catch (error) {
                  const description =
                    getApiErrorDetail(error) ?? "无法完成请求。"
                  console.error("Failed to remove member", error)
                  toast({
                    title: "移除成员失败",
                    description,
                    variant: "destructive",
                  })
                }
              }
              setSelectedUser(null)
            }}
          >
            确认
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const defaultToolbarProps: DataTableToolbarProps<WorkspaceMember> = {
  filterProps: {
    placeholder: "按邮箱筛选用户…",
    column: "email",
  },
}
