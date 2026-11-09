import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { PropsWithChildren } from "react"
import {
  type SecretRead,
  secretsCheckAwsSecretReference,
  secretsCreateAwsSecretReference,
  secretsListAuthorizedSecretStores,
  secretsSearchSecrets,
  secretsUpdateAwsSecretReference,
} from "@/client"
import { AwsSecretReferenceForm } from "@/components/workspaces/aws-secret-reference-form"
import { WorkspaceCredentialsInventory } from "@/components/workspaces/workspace-credentials-inventory"
import { QueryClient, QueryClientProvider } from "@/lib/query"

let mockSecret: SecretRead

// No resource is managed by Tracecat in these tests.
jest.mock("@/hooks/use-managed-resources", () => ({
  useManagedResources: () => ({
    managedResources: [],
    detachedCopies: [],
    isLoading: false,
    isManaged: () => false,
    getManaged: () => undefined,
    getDetachedCopy: () => undefined,
  }),
}))
jest.mock("@/client", () => ({
  secretsSearchSecrets: jest.fn(),
  secretsListAuthorizedSecretStores: jest.fn(),
  secretsUpdateAwsSecretReference: jest.fn(),
  secretsCreateAwsSecretReference: jest.fn(),
  secretsCheckAwsSecretReference: jest.fn(),
}))
jest.mock("@/components/ui/use-toast", () => ({ toast: jest.fn() }))
jest.mock("@/providers/workspace-id", () => ({
  useWorkspaceId: () => "example-workspace",
}))
jest.mock("@/lib/hooks", () => ({
  useSecretDefinitions: () => ({ secretDefinitions: [] }),
  useWorkspaceSecrets: () => ({
    secrets: [{ ...mockSecret, keys: ["API_KEY"] }],
  }),
}))
jest.mock("@/components/catalog/catalog-header", () => ({
  CatalogHeader: () => null,
}))
jest.mock("@/components/icons", () => ({
  AwsIcon: () => null,
  SecretIcon: () => null,
}))
jest.mock("@/components/workspaces/create-credential-dialog", () => ({
  CreateCredentialDialog: () => null,
}))
jest.mock("@/components/workspaces/edit-workspace-secret", () => ({
  EditCredentialsDialog: ({ children }: PropsWithChildren) => children,
  EditCredentialsDialogTrigger: ({ children }: PropsWithChildren) => children,
}))
jest.mock("@/hooks/use-entitlements", () => ({
  useEntitlements: () => ({ hasEntitlement: () => true }),
}))
jest.mock("@/components/auth/scope-guard", () => ({
  useScopeCheck: () => true,
}))
jest.mock("@/components/workspaces/delete-workspace-secret", () => ({
  DeleteSecretAlertDialog: ({ children }: PropsWithChildren) => children,
  DeleteSecretAlertDialogTrigger: ({ children }: PropsWithChildren) => children,
}))

beforeEach(() => {
  jest.resetAllMocks()
  mockSecret = {
    id: "example-secret",
    workspace_id: "example-workspace",
    type: "custom",
    source: "aws_secrets_manager",
    name: "example_api",
    description: "Example reference",
    environment: "staging",
    encrypted_keys: "",
    store_id: "old-store",
    remote_reference: "example/old-key",
    remote_key_mapping: { mode: "whole_string", keys: ["API_KEY"] },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }
  jest.mocked(secretsSearchSecrets).mockResolvedValue([mockSecret])
  jest.mocked(secretsListAuthorizedSecretStores).mockResolvedValue({
    items: [
      {
        id: "old-store",
        name: "Original store",
        provider: "aws_secrets_manager",
        region: "us-east-1",
        enabled: false,
      },
      {
        id: "new-store",
        name: "Replacement store",
        provider: "aws_secrets_manager",
        region: "us-east-1",
        enabled: true,
      },
    ],
    next_cursor: null,
  })
  jest.mocked(secretsUpdateAwsSecretReference).mockResolvedValue(undefined)
})

async function openEditor() {
  const user = userEvent.setup()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <WorkspaceCredentialsInventory />
    </QueryClientProvider>
  )
  expect(secretsSearchSecrets).not.toHaveBeenCalled()
  await user.click(screen.getByRole("button", { name: /example_api/ }))
  expect(
    screen.getByRole("button", { name: "检查访问权限" })
  ).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "编辑" }))
  return user
}

test.each(["whole_string", "json"] as const)(
  "Edit loads and updates the existing %s reference through the inventory",
  async (mode) => {
    if (mode === "json") {
      mockSecret.remote_key_mapping = {
        mode,
        fields: [{ key: "API_KEY", field: "api_token" }],
      }
    }
    const user = await openEditor()
    await screen.findByDisplayValue("example/old-key")
    expect(secretsSearchSecrets).toHaveBeenCalledWith({
      workspaceId: "example-workspace",
      id: ["example-secret"],
      environment: "staging",
    })
    expect(screen.getByLabelText("环境")).toHaveValue("staging")
    expect(
      screen.getByRole("combobox", { name: "AWS 密钥存储" })
    ).toHaveTextContent("Original store")
    const storeSelect = screen.getByRole("combobox", {
      name: "AWS 密钥存储",
    })
    storeSelect.focus()
    await user.keyboard("{Enter}")
    await user.click(
      await screen.findByRole("option", { name: /Replacement store/ })
    )
    await user.clear(screen.getByLabelText("密钥名称或 ARN"))
    await user.type(screen.getByLabelText("密钥名称或 ARN"), "example/new-key")
    const key =
      mode === "json"
        ? screen.getByPlaceholderText("输出键")
        : screen.getByLabelText("输出键")
    await user.clear(key)
    await user.type(key, "TOKEN")
    if (mode === "json") {
      expect(screen.getByPlaceholderText("JSON 字段")).toHaveValue("api_token")
      await user.clear(screen.getByPlaceholderText("JSON 字段"))
      await user.type(screen.getByPlaceholderText("JSON 字段"), "token")
    }
    await user.click(screen.getByRole("button", { name: "保存更改" }))
    await waitFor(() =>
      expect(secretsUpdateAwsSecretReference).toHaveBeenCalledWith({
        workspaceId: "example-workspace",
        secretId: "example-secret",
        requestBody: {
          name: "example_api",
          description: "Example reference",
          environment: "staging",
          store_id: "new-store",
          remote_reference: "example/new-key",
          key_mapping:
            mode === "json"
              ? { mode, fields: [{ key: "TOKEN", field: "token" }] }
              : { mode, keys: ["TOKEN"] },
        },
      })
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )
    expect(secretsCreateAwsSecretReference).not.toHaveBeenCalled()
    expect(secretsCheckAwsSecretReference).not.toHaveBeenCalled()
  }
)

test("a failed update preserves the edit draft for retry", async () => {
  jest
    .mocked(secretsUpdateAwsSecretReference)
    .mockRejectedValueOnce(new Error("Update failed"))
  const user = await openEditor()
  await screen.findByDisplayValue("example/old-key")
  await user.clear(screen.getByLabelText("密钥名称或 ARN"))
  await user.type(
    screen.getByLabelText("密钥名称或 ARN"),
    "example/corrected-key"
  )
  await user.click(screen.getByRole("button", { name: "保存更改" }))
  await waitFor(() =>
    expect(secretsUpdateAwsSecretReference).toHaveBeenCalledTimes(1)
  )
  expect(screen.getByLabelText("密钥名称或 ARN")).toHaveValue(
    "example/corrected-key"
  )
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "保存更改" })).toBeEnabled()
  )
  await user.click(screen.getByRole("button", { name: "保存更改" }))
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  )
  expect(secretsUpdateAwsSecretReference).toHaveBeenCalledTimes(2)
})

test("a metadata load failure does not offer an empty form that could overwrite the reference", async () => {
  jest.mocked(secretsSearchSecrets).mockRejectedValue(new Error("Read failed"))
  await openEditor()
  await screen.findByText("无法加载密钥引用")
  expect(
    screen.queryByRole("button", { name: "保存更改" })
  ).not.toBeInTheDocument()
  expect(secretsUpdateAwsSecretReference).not.toHaveBeenCalled()
})

test("the shared form still creates references from credential templates", async () => {
  const user = userEvent.setup()
  const onSaved = jest.fn()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AwsSecretReferenceForm
        initialName="new_api"
        initialKeys={["TOKEN"]}
        onSaved={onSaved}
      />
    </QueryClientProvider>
  )
  const storeSelect = await screen.findByRole("combobox", {
    name: "AWS 密钥存储",
  })
  storeSelect.focus()
  await user.keyboard("{Enter}")
  await user.click(
    await screen.findByRole("option", { name: /Replacement store/ })
  )
  expect(
    screen.queryByRole("option", { name: /Original store/ })
  ).not.toBeInTheDocument()
  await user.type(screen.getByLabelText("密钥名称或 ARN"), "example/new-key")
  expect(screen.getByLabelText("名称")).toHaveAttribute("readonly")
  await user.click(screen.getByRole("button", { name: "保存引用" }))
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  expect(secretsCreateAwsSecretReference).toHaveBeenCalledWith({
    workspaceId: "example-workspace",
    requestBody: {
      name: "new_api",
      description: null,
      environment: "default",
      store_id: "new-store",
      remote_reference: "example/new-key",
      key_mapping: { mode: "whole_string", keys: ["TOKEN"] },
    },
  })
  expect(secretsUpdateAwsSecretReference).not.toHaveBeenCalled()
})
