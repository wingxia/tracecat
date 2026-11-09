"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import {
  FolderIcon,
  GlobeIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  SquarePlusIcon,
  UsersIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import type {
  GroupReadWithMembers,
  GroupRoleAssignmentReadWithDetails,
  OrgMemberRead,
} from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { AbbreviatedBadgeList } from "@/components/organization/abbreviated-badge-list"
import {
  RbacListContainer,
  RbacListEmpty,
  RbacListHeader,
  RbacListItem,
} from "@/components/organization/rbac-list-item"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  useOrgMembers,
  useRbacAssignments,
  useRbacGroup,
  useRbacGroups,
  useRbacRoles,
  useWorkspaceManager,
} from "@/lib/hooks"
import {
  abbreviateName,
  abbreviateRoleName,
  organizationTier,
  rolesForScope,
} from "@/lib/rbac"

type GroupSection = "members" | "roles"

const DEFAULT_OPEN_SECTIONS: GroupSection[] = ["members", "roles"]

// The add/remove buttons below are size-6 with a centred size-3.5 icon, so the
// icon sits 5px in from the right edge. Match the chevron to that column.
const SECTION_TRIGGER_CLASS_NAME =
  "py-1.5 text-xs hover:no-underline [&>svg]:mr-[5px] [&>svg]:size-3.5"

type AddableMember = OrgMemberRead & { user_id: string }

interface GroupPermissions {
  canUpdateGroup: boolean
  canDeleteGroup: boolean
  canCreateAssignments: boolean
  canDeleteAssignments: boolean
}

function isGroupSection(value: string): value is GroupSection {
  return value === "members" || value === "roles"
}

/**
 * Organization groups list with inline member and role management.
 */
export function OrgRbacGroups() {
  const [selectedGroup, setSelectedGroup] =
    useState<GroupReadWithMembers | null>(null)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [openSections, setOpenSections] = useState<GroupSection[]>(
    DEFAULT_OPEN_SECTIONS
  )
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const {
    groups,
    isLoading,
    error,
    createGroup,
    createGroupIsPending,
    updateGroup,
    updateGroupIsPending,
    deleteGroup,
    deleteGroupIsPending,
  } = useRbacGroups()
  const { assignments: allAssignments = [] } = useRbacAssignments()
  const canCreateGroup = useScopeCheck("org:rbac:create") === true
  const canUpdateGroup = useScopeCheck("org:rbac:update") === true
  const canDeleteGroup = useScopeCheck("org:rbac:delete") === true
  const permissions: GroupPermissions = {
    canUpdateGroup,
    canDeleteGroup,
    canCreateAssignments: canCreateGroup,
    canDeleteAssignments: canDeleteGroup,
  }

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups
    const query = searchQuery.toLowerCase()
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.description?.toLowerCase().includes(query)
    )
  }, [groups, searchQuery])

  const handleCreateGroup = async (name: string, description: string) => {
    await createGroup({ name, description: description || undefined })
    setIsCreateOpen(false)
  }

  const handleUpdateGroup = async (
    groupId: string,
    name: string,
    description: string
  ) => {
    await updateGroup({ groupId, name, description: description || undefined })
    setIsEditOpen(false)
    setSelectedGroup(null)
  }

  const handleDeleteGroup = async () => {
    if (selectedGroup) {
      await deleteGroup(selectedGroup.id)
      setSelectedGroup(null)
    }
  }

  function handleExpandedChange(groupId: string, expanded: boolean) {
    setExpandedGroupId(expanded ? groupId : null)
    if (expanded) {
      setOpenSections(DEFAULT_OPEN_SECTIONS)
    }
  }

  const assignmentsByGroupId = useMemo(() => {
    const map = new Map<string, GroupRoleAssignmentReadWithDetails[]>()
    for (const assignment of allAssignments) {
      const next = map.get(assignment.group_id) ?? []
      next.push(assignment)
      map.set(assignment.group_id, next)
    }
    return map
  }, [allAssignments])

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-destructive">
        加载用户组失败
      </div>
    )
  }

  function renderGroups() {
    if (isLoading) {
      return [1, 2, 3].map((i) => (
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
      ))
    }
    if (filteredGroups.length === 0) {
      return (
        <RbacListEmpty
          message={searchQuery ? "没有匹配的用户组" : "未找到用户组"}
        />
      )
    }
    return filteredGroups.map((group) => (
      <GroupListItem
        key={group.id}
        group={group}
        assignments={assignmentsByGroupId.get(group.id) ?? []}
        isExpanded={expandedGroupId === group.id}
        onExpandedChange={(expanded) =>
          handleExpandedChange(group.id, expanded)
        }
        openSections={openSections}
        onOpenSectionsChange={setOpenSections}
        onEdit={() => {
          setSelectedGroup(group)
          setIsEditOpen(true)
        }}
        onDelete={() => setSelectedGroup(group)}
        permissions={permissions}
      />
    ))
  }

  return (
    <Dialog
      open={isCreateOpen || isEditOpen}
      onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false)
          setIsEditOpen(false)
          setSelectedGroup(null)
        }
      }}
    >
      <AlertDialog
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedGroup(null)
          }
        }}
      >
        <div className="space-y-4">
          <RbacListHeader
            left={
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={"搜索用户组…"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-[250px] pl-8"
                />
              </div>
            }
            right={
              canCreateGroup ? (
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                    <PlusIcon className="mr-2 size-4" />
                    创建用户组
                  </Button>
                </DialogTrigger>
              ) : null
            }
          />

          <RbacListContainer>{renderGroups()}</RbacListContainer>
        </div>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除用户组</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除用户组{" "}
              <span className="font-semibold">{selectedGroup?.name}</span>
              吗？此操作无法撤销，将移除此用户组的所有角色授权。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={deleteGroupIsPending}
            >
              {deleteGroupIsPending ? "删除中…" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isCreateOpen && canCreateGroup && (
        <GroupFormDialog
          title={"创建用户组"}
          description={"创建用户组以组织用户并分配角色。"}
          onSubmit={handleCreateGroup}
          isPending={createGroupIsPending}
        />
      )}

      {isEditOpen && selectedGroup && canUpdateGroup && (
        <GroupFormDialog
          title={"编辑用户组"}
          description={"更新用户组的名称和描述。"}
          initialData={selectedGroup}
          onSubmit={(name, description) =>
            handleUpdateGroup(selectedGroup.id, name, description)
          }
          isPending={updateGroupIsPending}
        />
      )}
    </Dialog>
  )
}

function GroupListItem({
  group,
  assignments,
  isExpanded,
  onExpandedChange,
  openSections,
  onOpenSectionsChange,
  onEdit,
  onDelete,
  permissions,
}: {
  group: GroupReadWithMembers
  assignments: GroupRoleAssignmentReadWithDetails[]
  isExpanded: boolean
  onExpandedChange: (expanded: boolean) => void
  openSections: GroupSection[]
  onOpenSectionsChange: (sections: GroupSection[]) => void
  onEdit: () => void
  onDelete: () => void
  permissions: GroupPermissions
}) {
  const canUpdateMembers = permissions.canUpdateGroup && !group.is_idp_managed
  const hasGatedItems = permissions.canUpdateGroup || permissions.canDeleteGroup

  return (
    <RbacListItem
      icon={<UsersIcon className="size-4" />}
      title={group.name}
      badges={
        <>
          <Badge variant="secondary" className="text-[10px]">
            {group.member_count} 个成员
            {group.member_count !== 1 && "s"}
          </Badge>
          {assignments.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {assignments.length} 个角色{assignments.length !== 1 && "s"}
            </Badge>
          )}
          {group.description && (
            <span
              className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
              title={group.description}
            >
              {group.description}
            </span>
          )}
        </>
      }
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
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
              onClick={() => navigator.clipboard.writeText(group.id)}
            >
              复制用户组 ID
            </DropdownMenuItem>
            {hasGatedItems && <DropdownMenuSeparator />}
            {permissions.canUpdateGroup && (
              <DialogTrigger asChild>
                <DropdownMenuItem onClick={onEdit}>编辑用户组</DropdownMenuItem>
              </DialogTrigger>
            )}
            {permissions.canDeleteGroup && (
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="text-rose-500 focus:text-rose-600"
                  onClick={onDelete}
                >
                  删除
                </DropdownMenuItem>
              </AlertDialogTrigger>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <GroupExpandedContent
        group={group}
        assignments={assignments}
        openSections={openSections}
        onOpenSectionsChange={onOpenSectionsChange}
        canUpdateMembers={canUpdateMembers}
        canCreateAssignments={permissions.canCreateAssignments}
        canDeleteAssignments={permissions.canDeleteAssignments}
      />
    </RbacListItem>
  )
}

function GroupExpandedContent({
  group,
  assignments,
  openSections,
  onOpenSectionsChange,
  canUpdateMembers,
  canCreateAssignments,
  canDeleteAssignments,
}: {
  group: GroupReadWithMembers
  assignments: GroupRoleAssignmentReadWithDetails[]
  openSections: GroupSection[]
  onOpenSectionsChange: (sections: GroupSection[]) => void
  canUpdateMembers: boolean
  canCreateAssignments: boolean
  canDeleteAssignments: boolean
}) {
  return (
    <Accordion
      type="multiple"
      value={openSections}
      onValueChange={(sections) =>
        onOpenSectionsChange(sections.filter(isGroupSection))
      }
    >
      <AccordionItem value="members" className="border-border/50">
        <AccordionTrigger className={SECTION_TRIGGER_CLASS_NAME}>
          成员
        </AccordionTrigger>
        <AccordionContent className="pb-2">
          <GroupMembersSection
            groupId={group.id}
            groupName={group.name}
            isIdpManaged={group.is_idp_managed === true}
            canUpdateMembers={canUpdateMembers}
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="roles" className="border-b-0">
        <AccordionTrigger className={SECTION_TRIGGER_CLASS_NAME}>
          角色
        </AccordionTrigger>
        <AccordionContent className="pb-0">
          <GroupRolesSection
            groupId={group.id}
            assignments={assignments}
            canCreateAssignments={canCreateAssignments}
            canDeleteAssignments={canDeleteAssignments}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

function GroupMembersSection({
  groupId,
  groupName,
  isIdpManaged,
  canUpdateMembers,
}: {
  groupId: string
  groupName: string
  isIdpManaged: boolean
  canUpdateMembers: boolean
}) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const { group, isLoading, error } = useRbacGroup(groupId)
  const { removeGroupMember, removeGroupMemberIsPending } = useRbacGroups()
  const members = group?.members ?? []

  async function handleRemoveMember(userId: string) {
    try {
      await removeGroupMember({ groupId, userId })
    } catch (error) {
      console.error("Failed to remove group member", error)
    }
  }

  function renderMembers() {
    if (isLoading) {
      return <Skeleton className="h-4 w-48" />
    }
    if (error) {
      return <p className="text-xs text-destructive">加载成员失败</p>
    }
    if (members.length === 0) {
      return <p className="text-xs text-muted-foreground">暂无成员</p>
    }
    return (
      <div className="max-h-64 overflow-y-auto">
        {members.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center justify-between gap-2 py-1 text-xs"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Badge
                variant="secondary"
                className="block min-w-0 truncate"
                title={member.email}
              >
                {member.email}
              </Badge>
              {(member.first_name || member.last_name) && (
                <span className="truncate text-muted-foreground">
                  {[member.first_name, member.last_name]
                    .filter(Boolean)
                    .join(" ")}
                </span>
              )}
            </div>
            {canUpdateMembers && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={"移除成员"}
                onClick={() => handleRemoveMember(member.user_id)}
                disabled={removeGroupMemberIsPending}
                className="size-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <MinusIcon className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {isIdpManaged && (
        <p className="text-xs text-muted-foreground">
          成员关系由身份提供商管理，请前往该平台编辑成员。
        </p>
      )}
      <div>
        {renderMembers()}
        {canUpdateMembers && !isLoading && !error && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={"添加成员"}
            className="w-full justify-between gap-2 px-0 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => setIsAddOpen(true)}
          >
            添加成员
            <span className="flex size-6 shrink-0 items-center justify-center">
              <SquarePlusIcon className="size-3.5" />
            </span>
          </Button>
        )}
        {canUpdateMembers && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent
              aria-describedby={undefined}
              className="flex h-[min(85dvh,720px)] max-w-4xl flex-col gap-0 overflow-hidden p-0"
            >
              <DialogTitle className="px-6 pt-6 pr-10">
                添加成员 - {groupName}
              </DialogTitle>
              {/* Radix unmounts the body on close, so it only fetches while open. */}
              <GroupAddMembersDialogBody
                groupId={groupId}
                existingMemberIds={members.map((member) => member.user_id)}
                onClose={() => setIsAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

function memberName(member: OrgMemberRead): string {
  return [member.first_name, member.last_name].filter(Boolean).join(" ")
}

function statusBadgeVariant(
  status: OrgMemberRead["status"]
): "default" | "secondary" | "outline" {
  switch (status) {
    case "active":
      return "default"
    case "inactive":
      return "secondary"
    default:
      return "outline"
  }
}

function getAddMembersLabel(count: number): string {
  if (count === 0) return "添加成员"
  if (count === 1) return "添加 1 位成员"
  return `添加 ${count} 位成员`
}

function GroupAddMembersDialogBody({
  groupId,
  existingMemberIds,
  onClose,
}: {
  groupId: string
  existingMemberIds: string[]
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const { orgMembers, orgMembersIsLoading, orgMembersError } = useOrgMembers()
  const { addGroupMembers, addGroupMembersIsPending } = useRbacGroups()
  const loadFailed = Boolean(orgMembersError)

  // Only real users who are not already in the group; invitations have no user.
  const existing = new Set(existingMemberIds)
  const addableMembers: AddableMember[] = (orgMembers ?? []).flatMap(
    (member) => {
      const userId = member.user_id
      if (!userId || existing.has(userId)) {
        return []
      }
      return [{ ...member, user_id: userId }]
    }
  )
  const query = searchQuery.trim().toLowerCase()
  const filteredMembers = addableMembers.filter(
    (member) =>
      !query ||
      member.email.toLowerCase().includes(query) ||
      memberName(member).toLowerCase().includes(query)
  )
  const selectedUserIds = addableMembers
    .filter((member) => selectedIds.has(member.user_id))
    .map((member) => member.user_id)
  const allFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((member) => selectedIds.has(member.user_id))

  function toggleMember(userId: string) {
    const next = new Set(selectedIds)
    if (!next.delete(userId)) {
      next.add(userId)
    }
    setSelectedIds(next)
  }

  function toggleAllFiltered() {
    const next = new Set(selectedIds)
    for (const member of filteredMembers) {
      if (allFilteredSelected) {
        next.delete(member.user_id)
      } else {
        next.add(member.user_id)
      }
    }
    setSelectedIds(next)
  }

  async function handleAdd() {
    if (selectedUserIds.length === 0) return
    const { failedUserIds } = await addGroupMembers({
      groupId,
      userIds: selectedUserIds,
    })
    if (failedUserIds.length === 0) {
      onClose()
      return
    }
    // Keep the dialog open with only the failed users still selected.
    setSelectedIds(new Set(failedUserIds))
  }

  function getEmptyMessage(): string {
    if (loadFailed) return "加载成员失败"
    if (orgMembersIsLoading) return "正在加载成员…"
    if (query && addableMembers.length > 0) return "没有匹配的成员"
    return "没有可添加的成员"
  }

  return (
    <>
      <div className="px-6 py-4">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={"按邮箱或姓名搜索…"}
            aria-label={"搜索成员"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-[280px] pl-8"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 border-y [&>div]:h-full">
        {loadFailed || filteredMembers.length === 0 ? (
          <div className="flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">{getEmptyMessage()}</p>
          </div>
        ) : (
          <Table className="text-xs">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pl-6">
                  <Checkbox
                    aria-label={"全选"}
                    checked={allFilteredSelected}
                    onCheckedChange={toggleAllFiltered}
                  />
                </TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>组织</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>工作空间</TableHead>
                <TableHead>用户组</TableHead>
                <TableHead className="pr-6">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => {
                const isSelected = selectedIds.has(member.user_id)
                return (
                  <TableRow
                    key={member.user_id}
                    data-state={isSelected ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => toggleMember(member.user_id)}
                  >
                    <TableCell className="w-10 pl-6">
                      <Checkbox
                        aria-label={`选择 ${member.email}`}
                        checked={isSelected}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={() => toggleMember(member.user_id)}
                      />
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{memberName(member) || "-"}</TableCell>
                    <TableCell>{organizationTier(member.role_slug)}</TableCell>
                    <TableCell>
                      <AbbreviatedBadgeList
                        items={member.roles ?? []}
                        abbreviate={abbreviateRoleName}
                      />
                    </TableCell>
                    <TableCell>
                      <AbbreviatedBadgeList
                        items={member.workspaces ?? []}
                        abbreviate={abbreviateName}
                      />
                    </TableCell>
                    <TableCell>
                      <AbbreviatedBadgeList
                        items={member.groups ?? []}
                        abbreviate={abbreviateName}
                      />
                    </TableCell>
                    <TableCell className="pr-6">
                      <Badge variant={statusBadgeVariant(member.status)}>
                        {member.status.charAt(0).toUpperCase() +
                          member.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button
          type="button"
          onClick={handleAdd}
          disabled={
            loadFailed ||
            selectedUserIds.length === 0 ||
            addGroupMembersIsPending
          }
        >
          {getAddMembersLabel(selectedUserIds.length)}
        </Button>
      </div>
    </>
  )
}

function GroupRolesSection({
  groupId,
  assignments,
  canCreateAssignments,
  canDeleteAssignments,
}: {
  groupId: string
  assignments: GroupRoleAssignmentReadWithDetails[]
  canCreateAssignments: boolean
  canDeleteAssignments: boolean
}) {
  const {
    createAssignment,
    createAssignmentIsPending,
    deleteAssignment,
    deleteAssignmentIsPending,
  } = useRbacAssignments()

  async function handleRemoveRole(assignmentId: string) {
    try {
      await deleteAssignment(assignmentId)
    } catch (error) {
      console.error("Failed to remove role assignment", error)
    }
  }

  return (
    <div>
      {assignments.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无角色</p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between gap-2 py-1 text-xs"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant="secondary">{assignment.role_name}</Badge>
                {assignment.workspace_name ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <FolderIcon className="size-3" />
                    {assignment.workspace_name}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <GlobeIcon className="size-3" />
                    整个组织
                  </span>
                )}
              </div>
              {canDeleteAssignments && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={"移除角色"}
                  onClick={() => handleRemoveRole(assignment.id)}
                  disabled={deleteAssignmentIsPending}
                  className="size-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <MinusIcon className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {canCreateAssignments && (
        <GroupAddRoleControl
          onAdd={(roleId, workspaceId) =>
            createAssignment({
              group_id: groupId,
              role_id: roleId,
              workspace_id: workspaceId,
            })
          }
          isPending={createAssignmentIsPending}
        />
      )}
    </div>
  )
}

function GroupAddRoleControl({
  onAdd,
  isPending,
}: {
  onAdd: (roleId: string, workspaceId: string | null) => Promise<unknown>
  isPending: boolean
}) {
  const [selectedRoleId, setSelectedRoleId] = useState("")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("org-wide")
  const { roles } = useRbacRoles()
  const { workspaces } = useWorkspaceManager()
  const workspaceId =
    selectedWorkspaceId === "org-wide" ? null : selectedWorkspaceId

  async function handleAddRole() {
    if (!selectedRoleId) return
    try {
      await onAdd(selectedRoleId, workspaceId)
      setSelectedRoleId("")
      setSelectedWorkspaceId("org-wide")
    } catch (error) {
      console.error("Failed to add role assignment", error)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
        <SelectTrigger className="h-8 flex-1 text-xs" aria-label={"角色"}>
          <SelectValue placeholder={"选择角色"} />
        </SelectTrigger>
        <SelectContent>
          {rolesForScope(roles, workspaceId).map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={selectedWorkspaceId}
        onValueChange={(value) => {
          setSelectedWorkspaceId(value)
          setSelectedRoleId("")
        }}
      >
        <SelectTrigger className="h-8 w-[180px] text-xs" aria-label={"范围"}>
          <SelectValue placeholder={"范围"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="org-wide">
            <div className="flex items-center gap-2">
              <GlobeIcon className="size-4 text-blue-500" />
              组织
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={"添加角色"}
        className="size-6 p-0"
        onClick={handleAddRole}
        disabled={!selectedRoleId || isPending}
      >
        <SquarePlusIcon className="size-3.5" />
      </Button>
    </div>
  )
}

function getSubmitLabel(isEdit: boolean, isPending: boolean): string {
  if (isPending) {
    return isEdit ? "保存中…" : "创建中…"
  }
  return isEdit ? "保存更改" : "创建用户组"
}

function GroupFormDialog({
  title,
  description,
  initialData,
  onSubmit,
  isPending,
}: {
  title: string
  description: string
  initialData?: GroupReadWithMembers
  onSubmit: (name: string, description: string) => Promise<void>
  isPending: boolean
}) {
  const [name, setName] = useState(initialData?.name ?? "")
  const [groupDescription, setGroupDescription] = useState(
    initialData?.description ?? ""
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await onSubmit(name.trim(), groupDescription.trim())
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
              <Label htmlFor="group-name">用户组名称</Label>
              <Input
                id="group-name"
                placeholder={"例如：安全团队"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">描述（可选）</Label>
              <Textarea
                id="group-description"
                placeholder={"描述此用户组的用途"}
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button size="sm" type="submit" disabled={!name.trim() || isPending}>
            {getSubmitLabel(Boolean(initialData), isPending)}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
