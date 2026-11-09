import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  type GroupRoleAssignmentReadWithDetails,
  type OrgMemberRead,
  type RoleReadWithScopes,
  rbacListAssignments,
  rbacListUserAssignments,
  rbacReplaceUserAssignments,
  type UserRoleAssignmentReadWithDetails,
} from "@/client"
import { CancelablePromise } from "@/client/core/CancelablePromise"
import { useScopeCheck } from "@/components/auth/scope-guard"
import { ManageUserRolesDialog } from "@/components/organization/org-members-table"
import { Dialog } from "@/components/ui/dialog"
import { useEntitlements } from "@/hooks/use-entitlements"
import {
  useRbacRoles,
  useRbacUserAssignments,
  useWorkspaceManager,
} from "@/lib/hooks"
import { QueryClient, QueryClientProvider, useQuery } from "@/lib/query"

jest.mock("@/client", () => ({
  rbacReplaceUserAssignments: jest.fn(),
  rbacListAssignments: jest.fn(),
  rbacListUserAssignments: jest.fn(),
}))
jest.mock("@/hooks/use-entitlements", () => ({ useEntitlements: jest.fn() }))
jest.mock("@/components/auth/scope-guard", () => ({ useScopeCheck: jest.fn() }))
jest.mock("@/lib/hooks", () => ({
  useRbacRoles: jest.fn(),
  useRbacUserAssignments: jest.fn(),
  useWorkspaceManager: jest.fn(),
}))
jest.mock("@/components/data-table", () => ({}))
jest.mock("@/components/organization/invite-member-dialog", () => ({}))
jest.mock("next/navigation", () => ({ useSearchParams: jest.fn() }))

const member: OrgMemberRead = {
  user_id: "user-1",
  email: "member@example.com",
  role_name: "Organization Member",
  status: "active",
}
const roles: RoleReadWithScopes[] = [
  { id: "baseline", slug: "organization-member", name: "Organization Member" },
  { id: "admin", slug: "organization-admin", name: "Organization Admin" },
  { id: "editor", slug: "workspace-editor", name: "Workspace Editor" },
].map((role) => ({
  ...role,
  organization_id: "org-1",
  is_system: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  scopes: role.slug.startsWith("organization-")
    ? [
        {
          id: "org-read",
          name: "org:read",
          resource: "org",
          action: "read",
          source: "platform" as const,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
      ]
    : [],
}))
function assignment(
  id: string,
  roleId: string,
  workspaceId: string | null = null
): UserRoleAssignmentReadWithDetails {
  return {
    id,
    role_id: roleId,
    role_name: roles.find((role) => role.id === roleId)!.name,
    workspace_id: workspaceId,
    workspace_name: workspaceId ? `Workspace ${workspaceId}` : null,
    user_id: "user-1",
    user_email: member.email,
    organization_id: "org-1",
    assigned_at: "2026-01-01",
  }
}
const baseline = assignment("org-assignment", "baseline")
const workspaceRole = assignment("workspace-assignment", "editor", "A")
let savedAssignments: UserRoleAssignmentReadWithDetails[]
let groupAssignments: GroupRoleAssignmentReadWithDetails[]
const createUserAssignment = jest.fn()
const updateUserAssignment = jest.fn()
const deleteUserAssignment = jest.fn()
const onOpenChange = jest.fn()
const onSavingChange = jest.fn()
const operationOrder: string[] = []

function setupGroup() {
  groupAssignments = [
    {
      id: "group-assignment",
      group_id: "group-1",
      group_name: "Operators",
      role_id: "editor",
      role_name: "Workspace Editor",
      workspace_id: "A",
      workspace_name: "Workspace A",
      organization_id: "org-1",
      assigned_at: "2026-01-01",
    },
  ]
}

async function renderDialog(onCloseAutoFocus?: (event: Event) => void) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={client}>
      <Dialog open onOpenChange={onOpenChange}>
        <ManageUserRolesDialog
          member={member}
          onCloseAutoFocus={onCloseAutoFocus}
          onOpenChange={onOpenChange}
          onSavingChange={onSavingChange}
        />
      </Dialog>
    </QueryClientProvider>
  )
  await waitFor(() =>
    expect(
      screen.queryByText("正在加载角色和用户组权限…")
    ).not.toBeInTheDocument()
  )
  return { ...view, client, user: userEvent.setup() }
}
async function addRole(
  user: ReturnType<typeof userEvent.setup>,
  roleName: string,
  workspaceName?: string
) {
  if (workspaceName) {
    await user.click(screen.getByRole("combobox", { name: "范围" }))
    await user.click(screen.getByRole("option", { name: workspaceName }))
  }
  await user.click(screen.getByRole("combobox", { name: "角色" }))
  await user.click(screen.getByRole("option", { name: roleName }))
  await user.click(screen.getByRole("button", { name: "添加角色" }))
}

beforeEach(() => {
  jest.clearAllMocks()
  operationOrder.length = 0
  savedAssignments = [baseline, workspaceRole]
  groupAssignments = []
  jest
    .mocked(rbacListUserAssignments)
    .mockImplementation(
      () =>
        new CancelablePromise((resolve) =>
          resolve({ items: savedAssignments, total: savedAssignments.length })
        )
    )
  jest
    .mocked(rbacListAssignments)
    .mockImplementation(
      () =>
        new CancelablePromise((resolve) =>
          resolve({ items: groupAssignments, total: groupAssignments.length })
        )
    )
  jest.mocked(useEntitlements).mockReturnValue({
    hasEntitlement: () => true,
    hasEntitlementData: true,
    isLoading: false,
  })
  jest.mocked(useScopeCheck).mockReturnValue(true)
  jest
    .mocked(useRbacRoles)
    .mockReturnValue({ roles, isLoading: false, error: null } as ReturnType<
      typeof useRbacRoles
    >)
  jest.mocked(useWorkspaceManager).mockReturnValue({
    workspaces: [
      { id: "A", name: "Workspace A" },
      { id: "B", name: "Workspace B" },
    ],
  } as ReturnType<typeof useWorkspaceManager>)
  jest
    .mocked(useRbacUserAssignments)
    .mockImplementation(function useAssignments() {
      const query = useQuery({
        queryKey: ["rbac-user-assignments", member.user_id, undefined],
        queryFn: async () => savedAssignments,
      })
      return {
        userAssignments: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
        createUserAssignment,
        updateUserAssignment,
        deleteUserAssignment,
        createUserAssignmentIsPending: false,
        createUserAssignmentError: null,
        updateUserAssignmentIsPending: false,
        updateUserAssignmentError: null,
        deleteUserAssignmentIsPending: false,
        deleteUserAssignmentError: null,
      }
    })
  jest.mocked(rbacReplaceUserAssignments).mockImplementation(
    ({ requestBody }) =>
      new CancelablePromise((resolve) => {
        operationOrder.push("replace")
        savedAssignments = requestBody.assignments.map(
          ({ role_id, workspace_id }) =>
            assignment(
              savedAssignments.find(
                (item) => item.workspace_id === workspace_id
              )?.id ?? "new-assignment",
              role_id,
              workspace_id ?? null
            )
        )
        resolve(undefined)
      })
  )
})

// Radix Select uses browser pointer APIs that jsdom does not provide.
beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = jest.fn(() => false)
  HTMLElement.prototype.setPointerCapture = jest.fn()
  HTMLElement.prototype.releasePointerCapture = jest.fn()
})

it("shows the baseline role and stages edits until Done; closing writes nothing", async () => {
  const { user } = await renderDialog()
  expect(screen.getByText("Organization Member")).toBeInTheDocument()
  await user.click(screen.getByRole("combobox", { name: "角色" }))
  expect(
    screen.getByRole("option", { name: "Organization Member" })
  ).toBeInTheDocument()
  await user.click(screen.getByRole("option", { name: "Organization Admin" }))
  await user.click(screen.getByRole("button", { name: "添加角色" }))
  expect(screen.getByText("Organization Admin")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "关闭" }))
  expect(onOpenChange).toHaveBeenCalledWith(false)
  expect(operationOrder).toEqual([])
})

it("offers only roles valid for the selected scope", async () => {
  const { user } = await renderDialog()
  await user.click(screen.getByRole("combobox", { name: "角色" }))
  expect(
    screen.getByRole("option", { name: "Organization Admin" })
  ).toBeInTheDocument()
  expect(
    screen.getByRole("option", { name: "Workspace Editor" })
  ).toBeInTheDocument()
  await user.keyboard("{Escape}")
  await user.click(screen.getByRole("combobox", { name: "范围" }))
  await user.click(screen.getByRole("option", { name: "Workspace B" }))
  await user.click(screen.getByRole("combobox", { name: "角色" }))
  expect(
    screen.getByRole("option", { name: "Workspace Editor" })
  ).toBeInTheDocument()
  expect(
    screen.queryByRole("option", { name: "Organization Admin" })
  ).not.toBeInTheDocument()
})

it("promotes the hidden baseline by update with update-only permission", async () => {
  jest
    .mocked(useScopeCheck)
    .mockImplementation((scope) => scope !== "org:rbac:create")
  const { user } = await renderDialog()
  await addRole(user, "Organization Admin")
  expect(operationOrder).toEqual([])
  await user.click(screen.getByRole("button", { name: "完成" }))
  await waitFor(() =>
    expect(rbacReplaceUserAssignments).toHaveBeenCalledWith({
      requestBody: expect.objectContaining({
        assignments: [
          { role_id: "editor", workspace_id: "A" },
          { role_id: "admin", workspace_id: null },
        ],
        expected_assignments: [baseline, workspaceRole],
      }),
    })
  )
  expect(createUserAssignment).not.toHaveBeenCalled()
})

it("saves the whole draft in one request after confirmation", async () => {
  const { user } = await renderDialog()
  await addRole(user, "Organization Admin")
  await addRole(user, "Workspace Editor", "Workspace B")
  await user.click(
    screen.getByRole("button", {
      name: "从 Workspace A 移除 Workspace Editor",
    })
  )
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  expect(screen.queryByText(/此操作将移除/)).not.toBeInTheDocument()
  expect(operationOrder).toEqual([])
  await user.click(screen.getByRole("button", { name: "完成" }))
  expect(screen.getByRole("alertdialog")).toHaveTextContent(
    "其他角色更改也会一并保存。"
  )
  expect(operationOrder).toEqual([])
  await user.click(screen.getByRole("button", { name: "确认更改" }))
  await waitFor(() => expect(operationOrder).toEqual(["replace"]))
})

it("refreshes cached workspace member lists after saving organization roles", async () => {
  const { client, user } = await renderDialog()
  const memberKeys = [
    ["workspace", "A", "members"],
    ["workspace", "B", "members"],
  ]
  for (const queryKey of memberKeys) {
    client.setQueryData(queryKey, ["old role"])
  }
  const workspaceKey = ["workspace", "A"]
  client.setQueryData(workspaceKey, { name: "Workspace A" })

  await addRole(user, "Organization Admin")
  await user.click(screen.getByRole("button", { name: "完成" }))
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))

  for (const queryKey of memberKeys) {
    const fetchMembers = jest.fn().mockResolvedValue(["updated role"])
    const members = await client.fetchQuery({
      queryKey,
      queryFn: fetchMembers,
      staleTime: 5 * 60 * 1000,
    })
    expect(fetchMembers).toHaveBeenCalledTimes(1)
    expect(members).toEqual(["updated role"])
  }
  expect(client.getQueryState(workspaceKey)?.isInvalidated).toBe(false)
})

it("saves an empty final set and warns the member stays on the baseline", async () => {
  savedAssignments = [workspaceRole]
  const { user } = await renderDialog()
  await user.click(
    screen.getByRole("button", {
      name: "从 Workspace A 移除 Workspace Editor",
    })
  )
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "完成" }))
  const confirmation = screen.getByRole("alertdialog")
  expect(confirmation).toHaveTextContent(
    "此后该用户将没有角色，但仍作为成员保留基本访问权限。若要移除用户，请使用“移除成员”。"
  )
  expect(operationOrder).toEqual([])
  await user.click(
    within(confirmation).getByRole("button", { name: "确认更改" })
  )
  await waitFor(() =>
    expect(rbacReplaceUserAssignments).toHaveBeenCalledTimes(1)
  )
})

it("keeps a baseline-only member unchanged when Done has no edits", async () => {
  savedAssignments = [baseline]
  const { user } = await renderDialog()
  await user.click(screen.getByRole("button", { name: "完成" }))
  expect(onOpenChange).toHaveBeenCalledWith(false)
  expect(operationOrder).toEqual([])
})

it("confirms removal after Done; Cancel preserves the draft without writes", async () => {
  savedAssignments = [workspaceRole]
  setupGroup()
  const { user } = await renderDialog()
  expect(await screen.findByText("通过 Operators")).toBeInTheDocument()
  expect(rbacListAssignments).toHaveBeenCalledWith({ userId: "user-1" })
  await user.click(
    screen.getByRole("button", {
      name: "从 Workspace A 移除 Workspace Editor",
    })
  )
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  expect(screen.queryByText(/此操作将移除/)).not.toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "完成" }))
  const confirmation = screen.getByRole("alertdialog")
  expect(confirmation).toHaveTextContent(
    "此操作将移除 member@example.com 的以下角色：Workspace A中的 Workspace Editor。"
  )
  expect(confirmation).toHaveTextContent("通过用户组获得的权限保持不变。")
  expect(operationOrder).toEqual([])
  await user.click(within(confirmation).getByRole("button", { name: "取消" }))
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  expect(screen.getByText("没有直接分配的角色")).toBeInTheDocument()
  expect(onOpenChange).not.toHaveBeenCalled()
  expect(operationOrder).toEqual([])
  await user.click(screen.getByRole("button", { name: "完成" }))
  await user.click(screen.getByRole("button", { name: "确认更改" }))
  await waitFor(() =>
    expect(rbacReplaceUserAssignments).toHaveBeenCalledTimes(1)
  )
})

it("surfaces a conflict when group access changes during the save", async () => {
  setupGroup()
  const { user } = await renderDialog()
  await screen.findByText("通过 Operators")
  await user.click(
    screen.getByRole("button", {
      name: "从 Workspace A 移除 Workspace Editor",
    })
  )
  await user.click(screen.getByRole("button", { name: "完成" }))
  groupAssignments = []
  jest.mocked(rbacReplaceUserAssignments).mockRejectedValueOnce({ status: 409 })
  await user.click(screen.getByRole("button", { name: "确认更改" }))
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "角色或用户组权限已更改"
  )
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  expect(operationOrder).toEqual([])
})

it("confirms organization-role removal while workspace access remains", async () => {
  savedAssignments = [assignment(baseline.id, "admin"), workspaceRole]
  const { user } = await renderDialog()
  await user.click(
    screen.getByRole("button", {
      name: "从 organization 移除 Organization Admin",
    })
  )
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "完成" }))
  expect(screen.getByRole("alertdialog")).toHaveTextContent(
    "组织中的 Organization Admin"
  )
  expect(operationOrder).toEqual([])
  await user.click(screen.getByRole("button", { name: "确认更改" }))
  await waitFor(() =>
    expect(rbacReplaceUserAssignments).toHaveBeenCalledTimes(1)
  )
})

it("clears the final role without member-remove permission", async () => {
  savedAssignments = [workspaceRole]
  jest
    .mocked(useScopeCheck)
    .mockImplementation((scope) => scope !== "org:member:remove")
  const { user } = await renderDialog()
  await user.click(
    screen.getByRole("button", {
      name: "从 Workspace A 移除 Workspace Editor",
    })
  )
  // Clearing roles is not a removal, so it needs only the delete scope.
  expect(screen.getByRole("button", { name: "完成" })).toBeEnabled()
})

it("rejects a stale draft when group access changes before Done", async () => {
  savedAssignments = [workspaceRole]
  const { user } = await renderDialog()
  await user.click(
    screen.getByRole("button", {
      name: "从 Workspace A 移除 Workspace Editor",
    })
  )
  setupGroup()
  jest.mocked(rbacReplaceUserAssignments).mockRejectedValueOnce({ status: 409 })
  await user.click(screen.getByRole("button", { name: "完成" }))
  await user.click(screen.getByRole("button", { name: "确认更改" }))
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "此对话框打开期间，角色或用户组权限已更改"
  )
  expect(operationOrder).toEqual([])
})

it("rejects a stale draft when direct assignments change before Done", async () => {
  const { user } = await renderDialog()
  await addRole(user, "Organization Admin")
  savedAssignments = [
    ...savedAssignments,
    assignment("other-assignment", "editor", "B"),
  ]
  jest.mocked(rbacReplaceUserAssignments).mockRejectedValueOnce({ status: 409 })
  await user.click(screen.getByRole("button", { name: "完成" }))
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "此对话框打开期间，角色或用户组权限已更改"
  )
  expect(operationOrder).toEqual([])
})

it("still saves the final role removal when group membership cannot be loaded", async () => {
  savedAssignments = [workspaceRole]
  setupGroup()
  jest.mocked(rbacListAssignments).mockRejectedValue(new Error("Unavailable"))
  const { user } = await renderDialog()
  await waitFor(() =>
    expect(
      screen.getByText("无法检查用户组权限，仅显示直接分配的角色。")
    ).toBeInTheDocument()
  )
  await user.click(
    screen.getByRole("button", {
      name: "从 Workspace A 移除 Workspace Editor",
    })
  )
  expect(screen.getByRole("button", { name: "完成" })).toBeEnabled()
})

it("reloads current state after a failed save without retrying automatically", async () => {
  const { user } = await renderDialog()
  await addRole(user, "Organization Admin")
  await addRole(user, "Workspace Editor", "Workspace B")
  await user.click(
    screen.getByRole("button", {
      name: "从 Workspace A 移除 Workspace Editor",
    })
  )
  jest
    .mocked(rbacReplaceUserAssignments)
    .mockRejectedValueOnce(new Error("Unavailable"))
  await user.click(screen.getByRole("button", { name: "完成" }))
  await user.click(screen.getByRole("button", { name: "确认更改" }))
  expect(await screen.findByRole("alert")).toHaveTextContent("无法确认更改")
  expect(deleteUserAssignment).not.toHaveBeenCalled()
  expect(screen.queryByText("Organization Admin")).not.toBeInTheDocument()
  expect(screen.getByText("Workspace A")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "完成" }))
  expect(rbacReplaceUserAssignments).toHaveBeenCalledTimes(1)
})

it("undoes a staged baseline promotion without deleting its persisted source", async () => {
  const { user } = await renderDialog()
  await addRole(user, "Organization Admin")
  await user.click(
    screen.getByRole("button", {
      name: "从 organization 移除 Organization Admin",
    })
  )
  expect(screen.getByText("Organization Member")).toBeInTheDocument()
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "完成" }))
  expect(operationOrder).toEqual([])
})

it("allows undoing newly staged additions without delete permission", async () => {
  jest
    .mocked(useScopeCheck)
    .mockImplementation((scope) => scope !== "org:rbac:delete")
  const { user } = await renderDialog()
  await addRole(user, "Workspace Editor", "Workspace B")
  expect(
    screen.queryByRole("button", {
      name: "从 Workspace A 移除 Workspace Editor",
    })
  ).not.toBeInTheDocument()
  await user.click(
    screen.getByRole("button", {
      name: "从 Workspace B 移除 Workspace Editor",
    })
  )
  await user.click(screen.getByRole("button", { name: "完成" }))
  expect(operationOrder).toEqual([])
})

it("keeps basic promotion available without RBAC addons and does not fetch groups", async () => {
  jest.mocked(useEntitlements).mockReturnValue({
    hasEntitlement: () => false,
    hasEntitlementData: true,
    isLoading: false,
  })
  const { user } = await renderDialog()
  await addRole(user, "Organization Admin")
  await user.click(screen.getByRole("button", { name: "完成" }))
  await waitFor(() =>
    expect(rbacReplaceUserAssignments).toHaveBeenCalledWith({
      requestBody: expect.objectContaining({
        assignments: [
          { role_id: "editor", workspace_id: "A" },
          { role_id: "admin", workspace_id: null },
        ],
        expected_assignments: [baseline, workspaceRole],
      }),
    })
  )
  expect(rbacListAssignments).not.toHaveBeenCalled()
})

it("does not infer absent group paths without RBAC addons", async () => {
  savedAssignments = [workspaceRole]
  jest.mocked(useEntitlements).mockReturnValue({
    hasEntitlement: () => false,
    hasEntitlementData: true,
    isLoading: false,
  })
  const { user } = await renderDialog()
  await user.click(
    screen.getByRole("button", {
      name: "从 Workspace A 移除 Workspace Editor",
    })
  )
  expect(screen.getByRole("button", { name: "完成" })).toBeEnabled()
  expect(screen.getByRole("status")).toHaveTextContent("无法检查用户组权限")
})

it("refreshes group paths when initial group loading finishes after editing starts", async () => {
  savedAssignments = [workspaceRole]
  let finishGroupRead: (value: {
    items: GroupRoleAssignmentReadWithDetails[]
    total: number
  }) => void = () => {}
  jest.mocked(rbacListAssignments).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishGroupRead = resolve
      }) as never
  )
  const { user } = await renderDialog()
  await user.click(
    screen.getByRole("button", {
      name: "从 Workspace A 移除 Workspace Editor",
    })
  )
  await act(async () => finishGroupRead({ items: [], total: 0 }))
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "完成" })).toBeEnabled()
  )
  setupGroup()
  jest.mocked(rbacReplaceUserAssignments).mockRejectedValueOnce({ status: 409 })
  await user.click(screen.getByRole("button", { name: "完成" }))
  await user.click(screen.getByRole("button", { name: "确认更改" }))
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "角色或用户组权限已更改"
  )
  expect(operationOrder).toEqual([])
})

it("does not depend on another group read when saving ordinary role changes", async () => {
  setupGroup()
  const { user } = await renderDialog()
  await screen.findByText("通过 Operators")
  await addRole(user, "Organization Admin")
  jest
    .mocked(rbacListAssignments)
    .mockRejectedValueOnce(new Error("Unavailable"))
  await user.click(screen.getByRole("button", { name: "完成" }))
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  expect(rbacListAssignments).toHaveBeenCalledTimes(1)
  expect(rbacReplaceUserAssignments).toHaveBeenCalledTimes(1)
})

test("returns focus to the surviving menu button when the dialog unmounts", async () => {
  const trigger = document.createElement("button")
  document.body.appendChild(trigger)
  const { unmount } = await renderDialog((event) => {
    event.preventDefault()
    trigger.focus()
  })
  unmount()
  await waitFor(() => expect(trigger).toHaveFocus())
  trigger.remove()
})
