import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import type { SecretStoreRead, SecretStoreUpdate } from "@/client"
import { OrgSettingsSecretStores } from "@/components/organization/org-settings-secret-stores"
import { TooltipProvider } from "@/components/ui/tooltip"

const mockCreateStore = jest.fn()
const mockUpdateStore = jest.fn()
let mockStores: SecretStoreRead[] = []
let mockCanUpdate: boolean | undefined = true
let mockWorkspaces: { id: string; name: string }[] = []
let mockCanReadSecrets = true

jest.mock("@/components/auth/scope-guard", () => ({
  ScopeGuard: ({ children }: { children: ReactNode }) => children,
  useScopeCheck: (scope?: string) => {
    if (scope === "org:secret:update") return mockCanUpdate
    if (scope === "secret:read") return mockCanReadSecrets
    return true
  },
}))
jest.mock("@/lib/hooks", () => ({
  useWorkspaceManager: () => ({ workspaces: mockWorkspaces }),
}))
jest.mock("@/hooks/use-secret-stores", () => ({
  useOrgSecretStores: () => ({
    stores: mockStores,
    isLoading: false,
    error: null,
    createStore: mockCreateStore,
    createStorePending: false,
    updateStore: mockUpdateStore,
  }),
}))

const ROLE_ARN = "arn:aws:iam::123456789012:role/tracecat-secrets-reader"

function draftStore(overrides: Partial<SecretStoreRead> = {}): SecretStoreRead {
  return {
    id: "store-1",
    organization_id: "org-1",
    name: "prod",
    provider: "aws_secrets_manager",
    config: { region: "us-east-1", external_id: "tracecat-test-external-id" },
    enabled: false,
    all_workspaces: false,
    tracecat_aws_principal_arn:
      "arn:aws:iam::210987654321:role/tracecat-executor",
    created_at: "2026-10-02T00:00:00Z",
    updated_at: "2026-10-02T00:00:00Z",
    ...overrides,
  }
}

function enabledStore(overrides: Partial<SecretStoreRead> = {}) {
  return draftStore({
    enabled: true,
    config: {
      role_arn: ROLE_ARN,
      region: "us-east-1",
      external_id: "tracecat-test-external-id",
    },
    ...overrides,
  })
}

function renderSettings() {
  return render(
    <TooltipProvider>
      <OrgSettingsSecretStores />
    </TooltipProvider>
  )
}

async function openMenu(name: string) {
  const user = userEvent.setup()
  screen.getByRole("button", { name }).focus()
  await user.keyboard("{Enter}")
  return user
}

async function openCreateDialog() {
  const user = await openMenu("添加存储")
  await user.click(
    screen.getByRole("menuitem", { name: /AWS Secrets Manager/ })
  )
  fireEvent.change(screen.getByLabelText("名称"), {
    target: { value: "prod" },
  })
  return user
}

beforeEach(() => {
  mockStores = []
  mockCanUpdate = true
  mockWorkspaces = []
  mockCanReadSecrets = true
  mockCreateStore.mockReset()
  mockUpdateStore.mockReset()
})

describe("CreateSecretStoreDialog", () => {
  it("asks only for name and region before the trust policy exists", async () => {
    renderSettings()
    await openCreateDialog()

    expect(screen.queryByLabelText("角色 ARN")).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("区域"), {
      target: { value: "US East" },
    })
    fireEvent.click(screen.getByRole("button", { name: "继续" }))

    expect(
      await screen.findByText(/输入区域代码，如 us-east-1/)
    ).toBeInTheDocument()
    expect(mockCreateStore).not.toHaveBeenCalled()
  })

  it("saves the store disabled, then shows the policies and enables it with the role", async () => {
    mockCreateStore.mockImplementation(async () => {
      const store = draftStore()
      mockStores = [store]
      return store
    })
    mockUpdateStore.mockResolvedValue(undefined)
    renderSettings()
    await openCreateDialog()
    fireEvent.change(screen.getByLabelText("区域"), {
      target: { value: "us-east-1" },
    })
    fireEvent.click(screen.getByRole("button", { name: "继续" }))

    expect(await screen.findByLabelText("信任策略")).toHaveTextContent(
      "tracecat-test-external-id"
    )
    expect(screen.getByRole("dialog")).toHaveTextContent("连接 AWS 角色")
    expect(mockCreateStore).toHaveBeenCalledWith({
      name: "prod",
      config: { provider: "aws_secrets_manager", region: "us-east-1" },
      enabled: false,
      all_workspaces: false,
    })

    fireEvent.change(screen.getByLabelText("角色 ARN"), {
      target: { value: "arn:aws:iam::{Account}:role/{RoleNameWithPath}" },
    })
    fireEvent.click(screen.getByRole("button", { name: "保存并启用" }))
    expect(
      await screen.findByText(/请将 \{Account\} 等占位符替换为实际值/)
    ).toBeInTheDocument()
    expect(mockUpdateStore).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("角色 ARN"), {
      target: { value: ROLE_ARN },
    })
    fireEvent.click(screen.getByRole("button", { name: "保存并启用" }))
    await waitFor(() =>
      expect(mockUpdateStore).toHaveBeenCalledWith({
        storeId: "store-1",
        params: { config: { role_arn: ROLE_ARN }, enabled: true },
      })
    )
  })

  it("tells create-only users who can finish setup instead of offering to enable", async () => {
    mockCanUpdate = false
    mockCreateStore.mockImplementation(async () => {
      const store = draftStore()
      mockStores = [store]
      return store
    })
    renderSettings()
    await openCreateDialog()
    fireEvent.change(screen.getByLabelText("区域"), {
      target: { value: "us-east-1" },
    })
    fireEvent.click(screen.getByRole("button", { name: "继续" }))

    expect(
      await screen.findByText(/需要更新密钥存储的权限/)
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("角色 ARN")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "保存并启用" })
    ).not.toBeInTheDocument()
  })
})

describe("Store setup dialog", () => {
  it("shows neither the role field nor the permission notice while scopes load", () => {
    mockCanUpdate = undefined
    mockStores = [draftStore()]
    renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "prod" }))

    const dialog = screen.getByRole("dialog")
    expect(within(dialog).queryByLabelText("角色 ARN")).not.toBeInTheDocument()
    expect(
      within(dialog).queryByText(/需要更新密钥存储的权限/)
    ).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole("button", { name: "保存并启用" })
    ).not.toBeInTheDocument()
  })
})

describe("Store list", () => {
  it("groups stores under their provider", () => {
    mockStores = [enabledStore(), draftStore({ id: "store-2", name: "eu" })]
    renderSettings()

    expect(
      screen.getByRole("region", { name: "AWS Secrets Manager 个存储" })
    ).toHaveTextContent("2 个存储")
  })

  it("opens the setup flow when a store in setup is clicked", () => {
    mockStores = [draftStore()]
    renderSettings()

    expect(screen.getByText("设置未完成")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "完成设置" })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "prod" }))

    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByLabelText("角色 ARN")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("信任策略")).toHaveTextContent(
      "tracecat-test-external-id"
    )
  })

  it("switches between the trust and permissions policies", async () => {
    mockStores = [enabledStore()]
    const user = userEvent.setup()
    renderSettings()
    await user.click(screen.getByRole("button", { name: "prod" }))

    expect(screen.getByLabelText("信任策略")).toHaveTextContent(
      "tracecat-test-external-id"
    )
    await user.click(screen.getByRole("tab", { name: "权限策略" }))
    expect(screen.getByLabelText("权限策略")).toHaveTextContent(
      "secretsmanager:GetSecretValue"
    )
    expect(screen.getByLabelText("信任策略")).toBeEmptyDOMElement()
    expect(
      screen.getByRole("button", { name: "复制 权限策略" })
    ).toHaveTextContent("复制")
  })

  it("confirms when a policy is copied", async () => {
    mockStores = [enabledStore()]
    const user = userEvent.setup()
    renderSettings()
    await user.click(screen.getByRole("button", { name: "prod" }))

    await user.click(screen.getByRole("button", { name: "复制 信任策略" }))
    expect(
      screen.getByRole("button", { name: "复制 信任策略" })
    ).toHaveTextContent("已复制")
    expect(await navigator.clipboard.readText()).toContain(
      "tracecat-test-external-id"
    )

    await user.click(screen.getByRole("tab", { name: "权限策略" }))
    expect(
      screen.getByRole("button", { name: "复制 权限策略" })
    ).toHaveTextContent("复制")
  })

  it("ignores a copy that finishes after switching policy tabs", async () => {
    mockStores = [enabledStore()]
    const user = userEvent.setup()
    let finishCopy: () => void = () => {}
    jest.spyOn(navigator.clipboard, "writeText").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishCopy = resolve
        })
    )
    renderSettings()
    await user.click(screen.getByRole("button", { name: "prod" }))

    await user.click(screen.getByRole("button", { name: "复制 信任策略" }))
    await user.click(screen.getByRole("tab", { name: "权限策略" }))
    await act(async () => finishCopy())

    expect(
      screen.getByRole("button", { name: "复制 权限策略" })
    ).toHaveTextContent("复制")
    expect(
      screen.getByRole("button", { name: "复制 权限策略" })
    ).not.toHaveTextContent("已复制")
  })

  it("offers finish setup and edit, but not enable, while setup is incomplete", async () => {
    mockStores = [draftStore()]
    renderSettings()

    await openMenu("prod 的操作")
    expect(
      screen.getByRole("menuitem", { name: "完成设置" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("menuitem", { name: "编辑存储" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("menuitem", { name: /启用 store\|禁用存储/ })
    ).not.toBeInTheDocument()
  })

  it("asks before disabling a store that secrets use", async () => {
    mockStores = [enabledStore({ reference_count: 2 })]
    mockUpdateStore.mockImplementation(
      async ({ params }: { params: SecretStoreUpdate }) => {
        Object.assign(mockStores[0], params)
      }
    )
    renderSettings()
    expect(screen.getByText("已启用")).toBeInTheDocument()

    const user = await openMenu("prod 的操作")
    await user.click(screen.getByRole("menuitem", { name: "禁用存储" }))
    expect(
      screen.getByText(/所有工作流和智能体中的 2 个密钥 将无法解析/)
    ).toBeInTheDocument()
    expect(mockUpdateStore).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "禁用" }))

    expect(mockUpdateStore).toHaveBeenCalledWith({
      storeId: "store-1",
      params: { enabled: false },
    })
  })
})

describe("Used by", () => {
  it("shows the top workspaces inline and searches the rest", async () => {
    mockWorkspaces = ["Alpha", "Bravo", "Charlie", "Delta"].map((name) => ({
      id: name.toLowerCase(),
      name,
    }))
    mockStores = [
      enabledStore({
        reference_count: 10,
        workspace_usage: [
          { workspace_id: "alpha", secret_count: 4 },
          { workspace_id: "bravo", secret_count: 3 },
          { workspace_id: "charlie", secret_count: 2 },
          { workspace_id: "delta", secret_count: 1 },
        ],
      }),
    ]
    const user = userEvent.setup()
    renderSettings()
    await user.click(screen.getByRole("button", { name: "prod" }))

    expect(screen.getByText("10 个密钥 位于 4 个工作空间")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "4 个密钥" })).toHaveAttribute(
      "href",
      "/workspaces/alpha/credentials"
    )
    expect(screen.queryByText("Delta")).not.toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "查看全部 4 个工作空间" })
    )
    await user.type(screen.getByLabelText("搜索使用此存储的工作空间"), "del")
    expect(screen.getByRole("link", { name: /Delta/ })).toHaveAttribute(
      "href",
      "/workspaces/delta/credentials"
    )
    expect(screen.getAllByText("Alpha")).toHaveLength(1)
  })

  it("links only workspaces the user can open", async () => {
    mockWorkspaces = [{ id: "alpha", name: "Alpha" }]
    mockStores = [
      enabledStore({
        reference_count: 5,
        workspace_usage: [
          { workspace_id: "alpha", secret_count: 3 },
          { workspace_id: "hidden", secret_count: 2 },
        ],
      }),
    ]
    const user = userEvent.setup()
    renderSettings()
    await user.click(screen.getByRole("button", { name: "prod" }))

    expect(screen.getByRole("link", { name: "3 个密钥" })).toHaveAttribute(
      "href",
      "/workspaces/alpha/credentials"
    )
    expect(screen.getByText("未知工作空间")).toBeInTheDocument()
    expect(screen.getByText("2 个密钥")).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: "2 个密钥" })
    ).not.toBeInTheDocument()
  })

  it("links to the workspace when the user cannot read its secrets", async () => {
    mockCanReadSecrets = false
    mockWorkspaces = [{ id: "alpha", name: "Alpha" }]
    mockStores = [
      enabledStore({
        reference_count: 3,
        workspace_usage: [{ workspace_id: "alpha", secret_count: 3 }],
      }),
    ]
    const user = userEvent.setup()
    renderSettings()
    await user.click(screen.getByRole("button", { name: "prod" }))

    expect(screen.getByRole("link", { name: "3 个密钥" })).toHaveAttribute(
      "href",
      "/workspaces/alpha"
    )
  })

  it("says when no secrets use the store", async () => {
    mockStores = [enabledStore()]
    const user = userEvent.setup()
    renderSettings()
    await user.click(screen.getByRole("button", { name: "prod" }))

    expect(screen.getByText("暂无密钥")).toBeInTheDocument()
  })
})

describe("Workspace picker", () => {
  it("filters workspaces by name", async () => {
    const user = userEvent.setup()
    mockStores = [draftStore()]
    mockWorkspaces = [
      { id: "ws-1", name: "Detection Engineering" },
      { id: "ws-2", name: "Incident Response" },
    ]
    renderSettings()

    await user.click(
      screen.getByRole("button", { name: "工作空间：选择工作空间" })
    )
    await user.type(screen.getByLabelText("搜索工作空间"), "incid")

    expect(screen.getByText("Incident Response")).toBeInTheDocument()
    expect(screen.queryByText("Detection Engineering")).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText("搜索工作空间"))
    await user.type(screen.getByLabelText("搜索工作空间"), "zzz")
    expect(screen.getByText("没有匹配的工作空间。")).toBeInTheDocument()
  })
})
