import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {
  GroupReadWithMembers,
  GroupRoleAssignmentReadWithDetails,
  OrgMemberRead,
} from "@/client"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { OrgRbacGroups } from "@/components/organization/org-rbac-groups"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  useOrgMembers,
  useRbacAssignments,
  useRbacGroup,
  useRbacGroups,
  useRbacRoles,
  useWorkspaceManager,
} from "@/lib/hooks"

jest.mock("@/components/auth/scope-guard", () => ({ useScopeCheck: jest.fn() }))
jest.mock("@/lib/hooks", () => ({
  useOrgMembers: jest.fn(),
  useRbacAssignments: jest.fn(),
  useRbacGroup: jest.fn(),
  useRbacGroups: jest.fn(),
  useRbacRoles: jest.fn(),
  useWorkspaceManager: jest.fn(),
}))

function buildGroup(
  overrides: Partial<GroupReadWithMembers> & { id: string; name: string }
): GroupReadWithMembers {
  return {
    organization_id: "org-1",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    member_count: 2,
    is_idp_managed: false,
    members: [
      { user_id: "user-1", email: "one@example.com", added_at: "2026-01-01" },
      { user_id: "user-2", email: "two@example.com", added_at: "2026-01-01" },
    ],
    ...overrides,
  }
}

const localGroup = buildGroup({
  id: "group-1",
  name: "Operators",
  description: "Handles on-call rotations",
})
const idpGroup = buildGroup({
  id: "group-2",
  name: "Directory team",
  is_idp_managed: true,
})
const groups = [localGroup, idpGroup]
const assignments: GroupRoleAssignmentReadWithDetails[] = [
  {
    id: "assignment-1",
    organization_id: "org-1",
    group_id: "group-1",
    group_name: "Operators",
    role_id: "role-1",
    role_name: "Workspace Editor",
    workspace_id: null,
    workspace_name: null,
    assigned_at: "2026-01-01",
  },
]

function buildMember(
  overrides: Partial<OrgMemberRead> & { email: string }
): OrgMemberRead {
  return { role_name: "Member", status: "active", ...overrides }
}

const orgMembers: OrgMemberRead[] = [
  buildMember({ user_id: "user-1", email: "one@example.com" }),
  buildMember({
    user_id: "user-3",
    email: "three@example.com",
    first_name: "Three",
    role_slug: "organization-admin",
    roles: [{ id: "role-1", name: "Workspace Editor" }],
  }),
  buildMember({ user_id: "user-4", email: "four@example.com" }),
  buildMember({
    invitation_id: "invite-1",
    email: "invited@example.com",
    status: "invited",
  }),
]
const addGroupMembers = jest.fn()

function getRow(name: string): HTMLElement {
  const row = screen.getByText(name).closest<HTMLElement>(".group")
  if (!row) {
    throw new Error(`Row not found: ${name}`)
  }
  return row
}

async function openMenu(user: ReturnType<typeof userEvent.setup>, row: string) {
  await user.click(
    within(getRow(row)).getByRole("button", { name: "打开菜单" })
  )
}

function renderGroups() {
  render(
    <TooltipProvider>
      <OrgRbacGroups />
    </TooltipProvider>
  )
  return userEvent.setup()
}

async function openAddMembersDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Operators"))
  await user.click(screen.getByRole("button", { name: "添加成员" }))
  return screen.getByRole("dialog")
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(useScopeCheck).mockReturnValue(true)
  jest.mocked(useRbacGroups).mockReturnValue({
    groups,
    isLoading: false,
    error: null,
    addGroupMembers,
    removeGroupMember: jest.fn(),
  } as unknown as ReturnType<typeof useRbacGroups>)
  jest.mocked(useRbacGroup).mockImplementation(
    (groupId: string) =>
      ({
        group: groups.find((group) => group.id === groupId),
        isLoading: false,
        error: null,
      }) as ReturnType<typeof useRbacGroup>
  )
  jest.mocked(useRbacAssignments).mockReturnValue({
    assignments,
    createAssignment: jest.fn(),
    deleteAssignment: jest.fn(),
  } as unknown as ReturnType<typeof useRbacAssignments>)
  addGroupMembers.mockResolvedValue({ failedUserIds: [] })
  jest.mocked(useOrgMembers).mockReturnValue({
    orgMembers,
  } as unknown as ReturnType<typeof useOrgMembers>)
  jest.mocked(useRbacRoles).mockReturnValue({
    roles: [],
  } as unknown as ReturnType<typeof useRbacRoles>)
  jest.mocked(useWorkspaceManager).mockReturnValue({
    workspaces: [],
  } as unknown as ReturnType<typeof useWorkspaceManager>)
})

describe("OrgRbacGroups", () => {
  it("offers only copy, edit, and delete in the row menu", async () => {
    const user = renderGroups()
    await openMenu(user, "Operators")

    expect(
      screen.getAllByRole("menuitem").map((item) => item.textContent)
    ).toEqual(["复制用户组 ID", "编辑用户组", "删除"])
    expect(
      screen.queryByRole("menuitem", { name: "Update members" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("menuitem", { name: "Update roles" })
    ).not.toBeInTheDocument()
  })

  it("shows badges and the description in the row header", () => {
    renderGroups()

    expect(within(getRow("Operators")).getAllByText(/2 个成员/)).toHaveLength(1)
    expect(
      within(getRow("Directory team")).getAllByText(/2 个成员/)
    ).toHaveLength(1)
    expect(
      within(getRow("Operators")).getByText("Handles on-call rotations")
    ).toBeInTheDocument()
  })

  it("does not fetch the group while the row is collapsed", () => {
    renderGroups()

    expect(useRbacGroup).not.toHaveBeenCalled()
    expect(useOrgMembers).not.toHaveBeenCalled()
  })

  it("expands with both sections open", async () => {
    const user = renderGroups()
    await user.click(screen.getByText("Operators"))

    expect(screen.getByRole("button", { name: "成员" })).toHaveAttribute(
      "aria-expanded",
      "true"
    )
    expect(screen.getByRole("button", { name: "角色" })).toHaveAttribute(
      "aria-expanded",
      "true"
    )
    expect(useRbacGroup).toHaveBeenCalledWith("group-1")
    expect(screen.getByText("one@example.com")).toBeInTheDocument()
    expect(screen.getByText("Workspace Editor")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "添加成员" })).toBeInTheDocument()
    expect(
      screen.queryByRole("combobox", { name: "用户" })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("选择用户")).not.toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "移除成员" })).toHaveLength(2)
    expect(useOrgMembers).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "添加角色" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "移除角色" })).toBeInTheDocument()
    expect(
      screen.queryByText(/All members of this group will inherit/)
    ).not.toBeInTheDocument()
  })

  it("keeps the sections individually collapsible", async () => {
    const user = renderGroups()
    await user.click(screen.getByText("Operators"))
    await user.click(screen.getByRole("button", { name: "成员" }))

    expect(screen.queryByText("one@example.com")).not.toBeInTheDocument()
    expect(screen.getByText("Workspace Editor")).toBeInTheDocument()
  })

  it("hides member controls for an IdP-managed group", async () => {
    const user = renderGroups()
    await user.click(screen.getByText("Directory team"))

    expect(screen.getByText("one@example.com")).toBeInTheDocument()
    expect(screen.getByText(/成员关系由身份提供商管理/)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "添加成员" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "移除成员" })
    ).not.toBeInTheDocument()
    expect(useOrgMembers).not.toHaveBeenCalled()
  })

  it("hides add members while the group is loading", async () => {
    jest.mocked(useRbacGroup).mockReturnValue({
      group: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useRbacGroup>)
    const user = renderGroups()
    await user.click(screen.getByText("Operators"))

    expect(
      screen.queryByRole("button", { name: "添加成员" })
    ).not.toBeInTheDocument()
  })

  it("hides add members when the group fails to load", async () => {
    jest.mocked(useRbacGroup).mockReturnValue({
      group: undefined,
      isLoading: false,
      error: new Error("boom"),
    } as ReturnType<typeof useRbacGroup>)
    const user = renderGroups()
    await user.click(screen.getByText("Operators"))

    expect(screen.getByText("加载成员失败")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "添加成员" })
    ).not.toBeInTheDocument()
  })

  it("shows the loading state while org members load", async () => {
    jest.mocked(useOrgMembers).mockReturnValue({
      orgMembers: undefined,
      orgMembersIsLoading: true,
      orgMembersError: null,
    } as unknown as ReturnType<typeof useOrgMembers>)
    const user = renderGroups()
    const dialog = await openAddMembersDialog(user)

    expect(within(dialog).getByText("正在加载成员…")).toBeInTheDocument()
  })

  it("shows an error when org members fail to load", async () => {
    jest.mocked(useOrgMembers).mockReturnValue({
      orgMembers: undefined,
      orgMembersIsLoading: false,
      orgMembersError: new Error("boom"),
    } as unknown as ReturnType<typeof useOrgMembers>)
    const user = renderGroups()
    const dialog = await openAddMembersDialog(user)

    expect(within(dialog).getByText("加载成员失败")).toBeInTheDocument()
    expect(within(dialog).queryByText("正在加载成员…")).not.toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "添加成员" })
    ).toBeDisabled()
  })

  it("lists only addable users in the add members dialog", async () => {
    const user = renderGroups()
    const dialog = await openAddMembersDialog(user)

    expect(useOrgMembers).toHaveBeenCalled()
    expect(within(dialog).getByText("添加成员 - Operators")).toBeInTheDocument()
    expect(within(dialog).getByText("three@example.com")).toBeInTheDocument()
    expect(within(dialog).getByText("four@example.com")).toBeInTheDocument()
    expect(
      within(dialog).queryByText("one@example.com")
    ).not.toBeInTheDocument()
    expect(
      within(dialog).queryByText("invited@example.com")
    ).not.toBeInTheDocument()
    expect(within(dialog).getByText("管理员")).toBeInTheDocument()
    expect(
      within(dialog).getByRole("button", { name: "添加成员" })
    ).toBeDisabled()
  })

  it("filters the add members dialog by email or name", async () => {
    const user = renderGroups()
    const dialog = await openAddMembersDialog(user)
    const search = within(dialog).getByRole("textbox", {
      name: "搜索成员",
    })

    await user.type(search, "Three")
    expect(within(dialog).getByText("three@example.com")).toBeInTheDocument()
    expect(
      within(dialog).queryByText("four@example.com")
    ).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, "nobody")
    expect(within(dialog).getByText("没有匹配的成员")).toBeInTheDocument()
  })

  it("shows the empty state when everyone is already in the group", async () => {
    jest.mocked(useOrgMembers).mockReturnValue({
      orgMembers: orgMembers.slice(0, 1),
    } as unknown as ReturnType<typeof useOrgMembers>)
    const user = renderGroups()
    const dialog = await openAddMembersDialog(user)

    expect(within(dialog).getByText("没有可添加的成员")).toBeInTheDocument()
  })

  it("adds every selected user and closes the dialog", async () => {
    const user = renderGroups()
    const dialog = await openAddMembersDialog(user)

    await user.click(within(dialog).getByText("three@example.com"))
    expect(
      within(dialog).getByRole("button", { name: "添加 1 位成员" })
    ).toBeEnabled()
    await user.click(
      within(dialog).getByRole("checkbox", { name: "选择 four@example.com" })
    )
    await user.click(
      within(dialog).getByRole("button", { name: "添加 2 位成员" })
    )

    expect(addGroupMembers).toHaveBeenCalledTimes(1)
    expect(addGroupMembers).toHaveBeenCalledWith({
      groupId: "group-1",
      userIds: ["user-3", "user-4"],
    })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("keeps failed users selected after a partial failure", async () => {
    addGroupMembers.mockResolvedValue({ failedUserIds: ["user-4"] })
    const user = renderGroups()
    const dialog = await openAddMembersDialog(user)

    await user.click(within(dialog).getByRole("checkbox", { name: "全选" }))
    await user.click(
      within(dialog).getByRole("button", { name: "添加 2 位成员" })
    )

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(
      within(dialog).getByRole("checkbox", { name: "选择 four@example.com" })
    ).toBeChecked()
    expect(
      within(dialog).getByRole("checkbox", { name: "选择 three@example.com" })
    ).not.toBeChecked()
    expect(
      within(dialog).getByRole("button", { name: "添加 1 位成员" })
    ).toBeEnabled()
  })

  it("shows the empty roles state", async () => {
    const user = renderGroups()
    await user.click(screen.getByText("Directory team"))

    expect(screen.getByText("暂无角色")).toBeInTheDocument()
  })
})
