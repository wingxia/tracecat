"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { PlusIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { type AdminUserRead, ApiError } from "@/client"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { useAdminUsers } from "@/hooks/use-admin"
import { useAuth } from "@/hooks/use-auth"
import { getRelativeTime } from "@/lib/event-history"

const createUserFormSchema = z.object({
  email: z.string().email("邮箱地址无效"),
  password: z.string().min(12, "密码至少需要 12 个字符"),
  firstName: z.string().max(255, "名字过长"),
  lastName: z.string().max(255, "姓氏过长"),
  isSuperuser: z.boolean(),
})

type CreateUserFormValues = z.infer<typeof createUserFormSchema>

type UserActionType = "promote" | "demote" | "delete" | "reset-mfa"

const USER_ACTION_CONFIRM_LABELS: Record<UserActionType, string> = {
  promote: "提升",
  demote: "Demote",
  delete: "删除",
  "reset-mfa": "重置安全密钥",
}

export function AdminUsersTable() {
  const [selectedUser, setSelectedUser] = useState<AdminUserRead | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<UserActionType | null>(null)
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState("")
  const { user: currentUser } = useAuth()
  const {
    users,
    createUser,
    createPending,
    promoteToSuperuser,
    promotePending,
    demoteFromSuperuser,
    demotePending,
    deleteUser,
    deletePending,
    resetUserMfa,
    resetMfaPending,
  } = useAdminUsers()
  const createUserForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      isSuperuser: false,
    },
  })

  const superuserCount = users?.filter((u) => u.is_superuser).length ?? 0
  const canConfirmAction =
    actionType !== "delete" ||
    (selectedUser?.email
      ? deleteConfirmationEmail === selectedUser.email
      : false)

  const handleCreateUser = async (values: CreateUserFormValues) => {
    try {
      await createUser({
        email: values.email,
        password: values.password,
        first_name: values.firstName.trim() || null,
        last_name: values.lastName.trim() || null,
        is_superuser: values.isSuperuser,
      })
      toast({
        title: "已创建用户",
        description: `已成功创建 ${values.email}。`,
      })
      createUserForm.reset()
      setIsCreateDialogOpen(false)
    } catch (error) {
      let description = "创建用户失败，请重试。"
      if (error instanceof ApiError) {
        const body = error.body as { detail?: unknown }
        if (typeof body.detail === "string") {
          description = body.detail
        }
      }
      console.error("Failed to create user", error)
      toast({
        title: "创建用户失败",
        description,
        variant: "destructive",
      })
    }
  }

  const handleConfirmAction = async () => {
    if (!selectedUser || !actionType) return
    if (
      actionType === "delete" &&
      deleteConfirmationEmail !== selectedUser.email
    ) {
      return
    }

    try {
      if (actionType === "promote") {
        await promoteToSuperuser(selectedUser.id)
        toast({
          title: "已提升用户权限",
          description: `${selectedUser.email} 现为超级用户。`,
        })
      } else if (actionType === "demote") {
        await demoteFromSuperuser(selectedUser.id)
        toast({
          title: "已降低用户权限",
          description: `${selectedUser.email} 不再是超级用户。`,
        })
      } else if (actionType === "reset-mfa") {
        await resetUserMfa(selectedUser.id)
        toast({
          title: "已重置安全密钥",
          description: `如果要求多因素认证，${selectedUser.email} 必须注册新密钥。`,
        })
      } else {
        await deleteUser(selectedUser.id)
        toast({
          title: "已删除用户",
          description: `已删除 ${selectedUser.email} 并撤销其会话。`,
        })
      }
    } catch (error) {
      let description = `用户操作失败（${actionType}），请重试。`
      if (error instanceof ApiError) {
        const body = error.body as { detail?: unknown }
        if (typeof body.detail === "string") {
          description = body.detail
        }
      }
      console.error(`Failed to ${actionType} user`, error)
      toast({
        title: "操作失败",
        description,
        variant: "destructive",
      })
    } finally {
      setSelectedUser(null)
      setActionType(null)
      setDeleteConfirmationEmail("")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(isOpen) => {
            setIsCreateDialogOpen(isOpen)
            if (!isOpen) {
              createUserForm.reset()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusIcon className="mr-2 size-4" />
              创建用户
            </Button>
          </DialogTrigger>
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>创建用户</DialogTitle>
              <DialogDescription>
                创建平台用户，暂不将其加入组织。
              </DialogDescription>
            </DialogHeader>
            <Form {...createUserForm}>
              <form
                onSubmit={createUserForm.handleSubmit(handleCreateUser)}
                className="flex min-h-0 flex-1 flex-col"
              >
                <DialogBody>
                  <FormField
                    control={createUserForm.control}
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
                  <FormField
                    control={createUserForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>密码</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          初始密码至少需要 12 个字符。
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={createUserForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>名</FormLabel>
                          <FormControl>
                            <Input placeholder={"小明"} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createUserForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>姓</FormLabel>
                          <FormControl>
                            <Input placeholder={"张"} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={createUserForm.control}
                    name="isSuperuser"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>授予超级用户权限</FormLabel>
                          <FormDescription>
                            超级用户可以访问所有平台管理功能。
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </DialogBody>
                <DialogFooter>
                  <Button size="sm" type="submit" disabled={createPending}>
                    {createPending ? "创建中…" : "创建用户"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <AlertDialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedUser(null)
            setActionType(null)
            setDeleteConfirmationEmail("")
          }
        }}
      >
        <DataTable
          data={users ?? []}
          initialSortingState={[{ id: "email", desc: false }]}
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
                <div className="text-xs font-medium">
                  {row.getValue<AdminUserRead["email"]>("email")}
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
                  {row.getValue<AdminUserRead["first_name"]>("first_name") ||
                    "-"}
                </div>
              ),
              enableSorting: true,
              enableHiding: true,
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
                  {row.getValue<AdminUserRead["last_name"]>("last_name") || "-"}
                </div>
              ),
              enableSorting: true,
              enableHiding: true,
            },
            {
              accessorKey: "role",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"角色"}
                />
              ),
              cell: ({ row }) => (
                <div className="text-xs capitalize">
                  {row.getValue<AdminUserRead["role"]>("role")}
                </div>
              ),
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "is_superuser",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"超级用户"}
                />
              ),
              cell: ({ row }) => (
                <div className="text-xs">
                  {row.getValue<AdminUserRead["is_superuser"]>("is_superuser")
                    ? "是"
                    : "否"}
                </div>
              ),
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "is_active",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"已启用"}
                />
              ),
              cell: ({ row }) => (
                <div className="text-xs">
                  {row.getValue<AdminUserRead["is_active"]>("is_active")
                    ? "已启用"
                    : "已停用"}
                </div>
              ),
              enableSorting: true,
              enableHiding: false,
            },
            {
              accessorKey: "last_login_at",
              header: ({ column }) => (
                <DataTableColumnHeader
                  className="text-xs"
                  column={column}
                  title={"上次登录"}
                />
              ),
              cell: ({ row }) => {
                const lastLoginAt =
                  row.getValue<AdminUserRead["last_login_at"]>("last_login_at")
                if (!lastLoginAt) {
                  return <div className="text-xs text-muted-foreground">-</div>
                }
                const date = new Date(lastLoginAt)
                const ago = getRelativeTime(date)
                return (
                  <div className="text-xs text-muted-foreground">
                    <span>{date.toLocaleDateString("zh-CN")}</span>
                    <span className="ml-1">({ago})</span>
                  </div>
                )
              },
              enableSorting: true,
              enableHiding: false,
            },
            {
              id: "actions",
              enableHiding: false,
              cell: ({ row }) => {
                const rowUser = row.original
                const isSelf = currentUser?.id === rowUser.id
                const isLastSuperuser =
                  rowUser.is_superuser && superuserCount <= 1

                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="size-8 p-0">
                        <span className="sr-only">打开菜单</span>
                        <DotsHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() =>
                          navigator.clipboard.writeText(rowUser.id)
                        }
                      >
                        复制用户 ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {rowUser.is_superuser ? (
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-rose-500 focus:text-rose-600"
                            disabled={isSelf || isLastSuperuser}
                            onSelect={() => {
                              setSelectedUser(rowUser)
                              setActionType("demote")
                            }}
                          >
                            {isLastSuperuser
                              ? "无法降级最后一位超级用户"
                              : isSelf
                                ? "无法降级自己"
                                : "取消超级用户权限"}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      ) : (
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={() => {
                              setSelectedUser(rowUser)
                              setActionType("promote")
                            }}
                          >
                            提升为超级用户
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      )}
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={() => {
                            setSelectedUser(rowUser)
                            setActionType("reset-mfa")
                          }}
                        >
                          重置安全密钥
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-rose-500 focus:text-rose-600"
                          disabled={isSelf || isLastSuperuser}
                          onSelect={() => {
                            setSelectedUser(rowUser)
                            setActionType("delete")
                            setDeleteConfirmationEmail("")
                          }}
                        >
                          {isLastSuperuser
                            ? "无法删除最后一位超级用户"
                            : isSelf
                              ? "无法删除自己"
                              : "删除"}
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
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
            <AlertDialogTitle>
              {actionType === "promote"
                ? "提升为超级用户"
                : actionType === "demote"
                  ? "取消超级用户权限"
                  : actionType === "reset-mfa"
                    ? "重置安全密钥"
                    : "删除用户"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "promote" ? (
                <>
                  确定要将 {selectedUser?.email}{" "}
                  提升为超级用户吗？该用户将获得所有管理功能的完整访问权限。
                </>
              ) : actionType === "reset-mfa" ? (
                <>
                  移除此用户的所有安全密钥、通行密钥和恢复码：{" "}
                  {selectedUser?.email}{" "}
                  并退出其所有会话？用户丢失访问凭据时可执行此操作。若要求多因素认证，用户必须在下次登录时注册新密钥。
                </>
              ) : actionType === "demote" ? (
                <>
                  确定要取消 {selectedUser?.email}{" "}
                  的超级用户权限吗？该用户将失去管理功能的访问权限。
                </>
              ) : (
                <>
                  确定要永久删除 {selectedUser?.email}
                  吗？此操作将移除全局用户账号并撤销其所有会话。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionType === "delete" && selectedUser && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="delete-user-confirmation">
                输入用户邮箱以确认
              </Label>
              <Input
                id="delete-user-confirmation"
                value={deleteConfirmationEmail}
                onChange={(event) =>
                  setDeleteConfirmationEmail(event.target.value)
                }
                placeholder={selectedUser.email}
                disabled={deletePending}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant={actionType === "promote" ? "default" : "destructive"}
              disabled={
                promotePending ||
                demotePending ||
                deletePending ||
                resetMfaPending ||
                !canConfirmAction
              }
              onClick={handleConfirmAction}
            >
              {actionType && USER_ACTION_CONFIRM_LABELS[actionType]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const defaultToolbarProps: DataTableToolbarProps<AdminUserRead> = {
  filterProps: {
    placeholder: "按邮箱筛选用户…",
    column: "email",
  },
}
