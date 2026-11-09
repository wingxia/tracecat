import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { SecretStoreRead, SecretStoreUpdate } from "@/client"
import { OrgSettingsSecretStores } from "@/components/organization/org-settings-secret-stores"

let mockStore: SecretStoreRead
let mockCanUpdate = true
let mockCanDelete = true
const mockUpdateStore = jest.fn()
const mockAuthorizeWorkspace = jest.fn()
const mockRevokeWorkspace = jest.fn()
const mockDeleteStore = jest.fn()

jest.mock("@/hooks/use-secret-stores", () => ({
  useOrgSecretStores: () => ({
    stores: [mockStore],
    updateStore: mockUpdateStore,
    authorizeWorkspace: mockAuthorizeWorkspace,
    revokeWorkspace: mockRevokeWorkspace,
    deleteStore: mockDeleteStore,
  }),
}))
jest.mock("@/lib/hooks", () => ({
  useWorkspaceManager: () => ({
    workspaces: [
      { id: "default", name: "Default Workspace" },
      { id: "example", name: "Example workspace" },
    ],
  }),
}))
jest.mock("@/providers/scopes", () => ({
  useScopes: () => ({
    hasScope: (scope: string) =>
      scope === "org:secret:delete" ? mockCanDelete : mockCanUpdate,
    // Workspace listing scopes; every test user can list workspaces.
    hasAnyScope: () => true,
    isLoading: false,
  }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockCanUpdate = true
  mockCanDelete = true
  mockStore = {
    id: "example-store",
    organization_id: "example-org",
    name: "example-production",
    provider: "aws_secrets_manager",
    config: {
      provider: "aws_secrets_manager",
      role_arn: "arn:aws:iam::123456789012:role/example-reader",
      region: "us-east-1",
      external_id: "example-external-id",
    },
    enabled: true,
    all_workspaces: false,
    authorized_workspace_ids: ["default"],
    reference_count: 3,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }
  mockUpdateStore.mockImplementation(
    async ({ params }: { params: SecretStoreUpdate }) => {
      Object.assign(mockStore, params)
    }
  )
  mockAuthorizeWorkspace.mockImplementation(
    async ({ workspaceId }: { workspaceId: string }) => {
      mockStore.authorized_workspace_ids?.push(workspaceId)
    }
  )
  mockRevokeWorkspace.mockRejectedValue(new Error("Store is in use"))
})

async function openPicker() {
  const user = userEvent.setup()
  render(<OrgSettingsSecretStores />)
  screen.getByRole("button", { name: "工作空间：Default Workspace" }).focus()
  await user.keyboard("{Enter}")
  return user
}

test("the picker changes access scope without closing or losing existing grants", async () => {
  const user = await openPicker()
  await user.click(screen.getByRole("menuitemradio", { name: "所有工作空间" }))
  await waitFor(() => {
    expect(
      screen.getByRole("menuitemradio", { name: "所有工作空间" })
    ).toHaveAttribute("aria-checked", "true")
  })
  expect(mockUpdateStore).toHaveBeenLastCalledWith({
    storeId: "example-store",
    params: { all_workspaces: true },
  })
  expect(screen.queryByRole("menuitemcheckbox")).not.toBeInTheDocument()

  await user.click(screen.getByRole("menuitemradio", { name: "所选工作空间" }))
  await waitFor(() => {
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Default Workspace" })
    ).toHaveAttribute("aria-checked", "true")
  })
  expect(mockUpdateStore).toHaveBeenLastCalledWith({
    storeId: "example-store",
    params: { all_workspaces: false },
  })
  await user.click(screen.getByRole("menuitem", { name: "完成" }))
  expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  expect(
    screen.getByRole("button", { name: "工作空间：Default Workspace" })
  ).toHaveFocus()
})

test("individual grants update the summary and failed revocation retains access", async () => {
  const user = await openPicker()
  await user.click(
    screen.getByRole("menuitemcheckbox", { name: "Example workspace" })
  )
  await waitFor(() => {
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Example workspace" })
    ).toHaveAttribute("aria-checked", "true")
  })
  expect(mockAuthorizeWorkspace).toHaveBeenCalledWith({
    storeId: "example-store",
    workspaceId: "example",
  })
  await user.click(
    screen.getByRole("menuitemcheckbox", { name: "Default Workspace" })
  )
  await waitFor(() => {
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Default Workspace" })
    ).not.toHaveAttribute("aria-disabled", "true")
  })
  expect(mockRevokeWorkspace).toHaveBeenCalledWith({
    storeId: "example-store",
    workspaceId: "default",
  })
  expect(
    screen.getByRole("menuitemcheckbox", { name: "Default Workspace" })
  ).toHaveAttribute("aria-checked", "true")
  await user.keyboard("{Escape}")
  expect(
    screen.getByRole("button", { name: "工作空间：2 个工作空间" })
  ).toBeInTheDocument()
})

test("read-only users can inspect workspace access but cannot change it", async () => {
  mockCanUpdate = false
  const user = await openPicker()
  for (const item of [
    ...screen.getAllByRole("menuitemradio"),
    ...screen.getAllByRole("menuitemcheckbox"),
  ]) {
    expect(item).toHaveAttribute("aria-disabled", "true")
    await user.click(item)
  }
  expect(mockUpdateStore).not.toHaveBeenCalled()
  expect(mockAuthorizeWorkspace).not.toHaveBeenCalled()
  expect(mockRevokeWorkspace).not.toHaveBeenCalled()
})

test("the overflow menu blocks deleting a store with references", async () => {
  const user = userEvent.setup()
  render(<OrgSettingsSecretStores />)
  screen.getByRole("button", { name: "example-production 的操作" }).focus()
  await user.keyboard("{Enter}")
  expect(screen.getByRole("menuitem", { name: "删除" })).toHaveAttribute(
    "aria-disabled",
    "true"
  )
  expect(
    screen.getByText("正在使用此存储的资源： 3 个密钥。请先移除这些资源。")
  ).toBeInTheDocument()
  expect(mockDeleteStore).not.toHaveBeenCalled()
})

test("update-only users can edit a store from its menu without changing its external ID or access", async () => {
  mockCanDelete = false
  const user = userEvent.setup()
  render(<OrgSettingsSecretStores />)
  screen.getByRole("button", { name: "example-production 的操作" }).focus()
  await user.keyboard("{Enter}")
  expect(
    screen.queryByRole("menuitem", { name: "删除" })
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole("menuitem", { name: "编辑存储" }))
  expect(screen.getByLabelText("名称")).toHaveValue("example-production")
  expect(screen.getByLabelText("角色 ARN")).toHaveValue(
    mockStore.config.role_arn
  )
  expect(screen.getByLabelText("区域")).toHaveValue("us-east-1")
  await user.clear(screen.getByLabelText("名称"))
  await user.type(screen.getByLabelText("名称"), "example-renamed")
  await user.clear(screen.getByLabelText("角色 ARN"))
  await user.type(
    screen.getByLabelText("角色 ARN"),
    "arn:aws:iam::123456789012:role/example-replacement"
  )
  await user.clear(screen.getByLabelText("区域"))
  await user.type(screen.getByLabelText("区域"), "us-west-2")
  await user.click(screen.getByRole("button", { name: "保存更改" }))
  await waitFor(() =>
    expect(mockUpdateStore).toHaveBeenCalledWith({
      storeId: "example-store",
      params: {
        name: "example-renamed",
        config: {
          role_arn: "arn:aws:iam::123456789012:role/example-replacement",
          region: "us-west-2",
        },
      },
    })
  )
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})

test("failed store edits retain their draft and delete-only users cannot edit", async () => {
  mockUpdateStore.mockRejectedValueOnce(new Error("Update failed"))
  const user = userEvent.setup()
  const view = render(<OrgSettingsSecretStores />)
  screen.getByRole("button", { name: "example-production 的操作" }).focus()
  await user.keyboard("{Enter}")
  await user.click(screen.getByRole("menuitem", { name: "编辑存储" }))
  await user.clear(screen.getByLabelText("名称"))
  await user.type(screen.getByLabelText("名称"), "example-renamed")
  await user.click(screen.getByRole("button", { name: "保存更改" }))
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "保存更改" })).toBeEnabled()
  )
  expect(mockUpdateStore).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText("名称")).toHaveValue("example-renamed")
  await user.click(screen.getByRole("button", { name: "关闭" }))
  mockCanUpdate = false
  view.rerender(<OrgSettingsSecretStores />)
  screen.getByRole("button", { name: "example-production 的操作" }).focus()
  await user.keyboard("{Enter}")
  expect(
    screen.queryByRole("menuitem", { name: "编辑存储" })
  ).not.toBeInTheDocument()
  expect(screen.getByRole("menuitem", { name: "删除" })).toBeInTheDocument()
})
