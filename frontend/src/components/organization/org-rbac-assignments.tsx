"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import {
  FolderIcon,
  GlobeIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import type { GroupRoleAssignmentReadWithDetails } from "@/client"
import {
  RbacDetailRow,
  RbacListContainer,
  RbacListEmpty,
  RbacListHeader,
  RbacListItem,
} from "@/components/organization/rbac-list-item"
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
import { Badge } from "@/components/ui/badge"
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useRbacAssignments,
  useRbacGroups,
  useRbacRoles,
  useWorkspaceManager,
} from "@/lib/hooks"
import { rolesForAssignmentEdit, rolesForScope } from "@/lib/rbac"

export function OrgRbacAssignments() {
  const [selectedAssignment, setSelectedAssignment] =
    useState<GroupRoleAssignmentReadWithDetails | null>(null)
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<
    string | null
  >(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const {
    assignments,
    isLoading,
    error,
    createAssignment,
    createAssignmentIsPending,
    updateAssignment,
    updateAssignmentIsPending,
    deleteAssignment,
    deleteAssignmentIsPending,
  } = useRbacAssignments()

  const { roles } = useRbacRoles()

  const filteredAssignments = useMemo(() => {
    if (!searchQuery.trim()) return assignments ?? []
    const query = searchQuery.toLowerCase()
    return (assignments ?? []).filter(
      (a) =>
        a.group_name.toLowerCase().includes(query) ||
        a.role_name.toLowerCase().includes(query) ||
        a.workspace_name?.toLowerCase().includes(query)
    )
  }, [assignments, searchQuery])

  const handleCreateAssignment = async (
    groupId: string,
    roleId: string,
    workspaceId: string | null
  ) => {
    await createAssignment({
      group_id: groupId,
      role_id: roleId,
      workspace_id: workspaceId,
    })
    setIsCreateOpen(false)
  }

  const handleUpdateAssignment = async (
    assignmentId: string,
    roleId: string
  ) => {
    await updateAssignment({ assignmentId, role_id: roleId })
    setIsEditOpen(false)
    setSelectedAssignment(null)
  }

  const handleDeleteAssignment = async () => {
    if (selectedAssignment) {
      await deleteAssignment(selectedAssignment.id)
      setSelectedAssignment(null)
    }
  }

  // Get role details for expanded view
  const getRoleScopes = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId)
    return role?.scopes ?? []
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-destructive">
        加载授权失败
      </div>
    )
  }

  return (
    <Dialog
      open={isCreateOpen || isEditOpen}
      onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false)
          setIsEditOpen(false)
          setSelectedAssignment(null)
        }
      }}
    >
      <AlertDialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedAssignment(null)
          }
        }}
      >
        <div className="space-y-4">
          <RbacListHeader
            left={
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={"搜索授权…"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-[250px] pl-8"
                />
              </div>
            }
            right={
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  <PlusIcon className="mr-2 size-4" />
                  创建授权
                </Button>
              </DialogTrigger>
            }
          />

          {isLoading ? (
            <RbacListContainer>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-b border-border/50 px-3 py-2.5 last:border-b-0"
                >
                  <Skeleton className="size-6" />
                  <Skeleton className="size-4" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </RbacListContainer>
          ) : filteredAssignments.length === 0 ? (
            <RbacListContainer>
              <RbacListEmpty
                message={searchQuery ? "没有匹配的授权" : "未找到授权"}
              />
            </RbacListContainer>
          ) : (
            <RbacListContainer>
              {filteredAssignments.map((assignment) => (
                <RbacListItem
                  key={assignment.id}
                  icon={<UsersIcon className="size-4" />}
                  title={assignment.group_name}
                  subtitle={
                    <span className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">
                        {assignment.role_name}
                      </Badge>
                      <span className="text-muted-foreground">·</span>
                      {assignment.workspace_name ? (
                        <span className="flex items-center gap-1">
                          <FolderIcon className="size-3" />
                          {assignment.workspace_name}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <GlobeIcon className="size-3" />
                          整个组织
                        </span>
                      )}
                    </span>
                  }
                  isExpanded={expandedAssignmentId === assignment.id}
                  onExpandedChange={(expanded) =>
                    setExpandedAssignmentId(expanded ? assignment.id : null)
                  }
                  actions={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="size-8 p-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                        >
                          <span className="sr-only">打开菜单</span>
                          <DotsHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigator.clipboard.writeText(assignment.id)
                          }
                        >
                          复制授权 ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DialogTrigger asChild>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedAssignment(assignment)
                              setIsEditOpen(true)
                            }}
                          >
                            更改角色
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-rose-500 focus:text-rose-600"
                            onClick={() => setSelectedAssignment(assignment)}
                          >
                            删除
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                >
                  <div className="space-y-3">
                    <RbacDetailRow label={"用户组"}>
                      <span className="flex items-center gap-1.5">
                        <UsersIcon className="size-3 text-muted-foreground" />
                        {assignment.group_name}
                      </span>
                    </RbacDetailRow>
                    <RbacDetailRow label={"角色"}>
                      <Badge variant="secondary">{assignment.role_name}</Badge>
                    </RbacDetailRow>
                    <RbacDetailRow label={"范围"}>
                      {assignment.workspace_name ? (
                        <span className="flex items-center gap-1.5">
                          <FolderIcon className="size-3 text-muted-foreground" />
                          {assignment.workspace_name}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                          <GlobeIcon className="size-3" />
                          整个组织
                        </span>
                      )}
                    </RbacDetailRow>
                    {getRoleScopes(assignment.role_id).length > 0 && (
                      <RbacDetailRow label={"权限"}>
                        <div className="flex flex-wrap gap-1">
                          {getRoleScopes(assignment.role_id)
                            .slice(0, 5)
                            .map((scope) => (
                              <code
                                key={scope.id}
                                className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono"
                              >
                                {scope.name}
                              </code>
                            ))}
                          {getRoleScopes(assignment.role_id).length > 5 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{getRoleScopes(assignment.role_id).length - 5}{" "}
                              更多
                            </span>
                          )}
                        </div>
                      </RbacDetailRow>
                    )}
                  </div>
                </RbacListItem>
              ))}
            </RbacListContainer>
          )}
        </div>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除授权</AlertDialogTitle>
            <AlertDialogDescription>
              确定要移除{" "}
              <span className="font-semibold">
                {selectedAssignment?.role_name}
              </span>{" "}
              角色，所属用户组为{" "}
              <span className="font-semibold">
                {selectedAssignment?.group_name}
              </span>{" "}
              用户组
              {selectedAssignment?.workspace_name
                ? `，范围为 ${selectedAssignment.workspace_name} 工作空间`
                : "，范围为整个组织"}
              吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteAssignment}
              disabled={deleteAssignmentIsPending}
            >
              {deleteAssignmentIsPending ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isCreateOpen && (
        <AssignmentFormDialog
          title={"创建授权"}
          description={"向用户组分配角色。组织级授权适用于所有工作空间。"}
          onSubmit={handleCreateAssignment}
          isPending={createAssignmentIsPending}
          onOpenChange={(open) => {
            if (!open) setIsCreateOpen(false)
          }}
        />
      )}

      {isEditOpen && selectedAssignment && (
        <AssignmentEditDialog
          assignment={selectedAssignment}
          onSubmit={(roleId) =>
            handleUpdateAssignment(selectedAssignment.id, roleId)
          }
          isPending={updateAssignmentIsPending}
          onOpenChange={(open) => {
            if (!open) {
              setIsEditOpen(false)
              setSelectedAssignment(null)
            }
          }}
        />
      )}
    </Dialog>
  )
}

function AssignmentFormDialog({
  title,
  description,
  onSubmit,
  isPending,
  onOpenChange,
}: {
  title: string
  description: string
  onSubmit: (
    groupId: string,
    roleId: string,
    workspaceId: string | null
  ) => Promise<void>
  isPending: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [groupId, setGroupId] = useState("")
  const [roleId, setRoleId] = useState("")
  const [workspaceId, setWorkspaceId] = useState<string>("org-wide")

  const { groups } = useRbacGroups()
  const { roles } = useRbacRoles()
  const { workspaces } = useWorkspaceManager()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupId || !roleId) return
    await onSubmit(
      groupId,
      roleId,
      workspaceId === "org-wide" ? null : workspaceId
    )
  }

  return (
    <DialogContent size="md">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignment-group">用户组</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger id="assignment-group">
                  <SelectValue placeholder={"选择用户组"} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-role">角色</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger id="assignment-role">
                  <SelectValue placeholder={"选择角色"} />
                </SelectTrigger>
                <SelectContent>
                  {rolesForScope(
                    roles,
                    workspaceId === "org-wide" ? null : workspaceId
                  ).map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-workspace">范围</Label>
              <Select
                value={workspaceId}
                onValueChange={(value) => {
                  setWorkspaceId(value)
                  setRoleId("")
                }}
              >
                <SelectTrigger id="assignment-workspace">
                  <SelectValue placeholder={"选择范围"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org-wide">
                    <div className="flex items-center gap-2">
                      <GlobeIcon className="size-4 text-blue-500" />
                      整个组织
                    </div>
                  </SelectItem>
                  {workspaces?.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      <div className="flex items-center gap-2">
                        <FolderIcon className="size-4 text-muted-foreground" />
                        {workspace.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                组织级授权适用于所有工作空间，工作空间级授权仅在指定工作空间内生效。
              </p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            size="sm"
            type="submit"
            disabled={!groupId || !roleId || isPending}
          >
            {isPending ? "创建中…" : "创建授权"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

function AssignmentEditDialog({
  assignment,
  onSubmit,
  isPending,
  onOpenChange,
}: {
  assignment: GroupRoleAssignmentReadWithDetails
  onSubmit: (roleId: string) => Promise<void>
  isPending: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [roleId, setRoleId] = useState(assignment.role_id)
  const { roles } = useRbacRoles()
  const { options, legacy } = rolesForAssignmentEdit(
    roles,
    assignment.workspace_id ?? null,
    assignment.role_id
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleId) return
    await onSubmit(roleId)
  }

  return (
    <DialogContent size="sm">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <DialogHeader>
          <DialogTitle>更改角色分配</DialogTitle>
          <DialogDescription>
            更新角色，授权对象为{" "}
            <span className="font-semibold">{assignment.group_name}</span>
            {assignment.workspace_name
              ? `，位于 ${assignment.workspace_name}`
              : "（整个组织）"}
            .
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role">角色</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder={"选择角色"} />
                </SelectTrigger>
                <SelectContent>
                  {legacy && (
                    <SelectItem value={legacy.id} disabled>
                      {legacy.name} （无法在此分配）
                    </SelectItem>
                  )}
                  {options.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            size="sm"
            type="submit"
            disabled={!roleId || roleId === assignment.role_id || isPending}
          >
            {isPending ? "保存中…" : "保存更改"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
